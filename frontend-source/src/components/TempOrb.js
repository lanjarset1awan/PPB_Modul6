import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import {
  Atlas,
  Canvas,
  FilterMode,
  Group,
  MipmapMode,
  Skia,
  rect,
  useRSXformBuffer,
  usePictureAsTexture,
} from "react-native-skia";
import { useIsFocused } from "@react-navigation/native";
import {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

const DOT_COUNT = 240;
const HOLE_RADIUS = 78;
const BASE_SPEED = 0.22;
const TILT = 0.35;
const TEX = 32;

// Fibonacci sphere: deterministic, maximally uniform dot globe.
// y goes 1 → -1, golden-angle step per point (canonical formula).
function fibonacciSphere(n) {
  const pts = new Array(n);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    pts[i] = [Math.cos(theta) * r, y, Math.sin(theta) * r];
  }
  return pts;
}

const BASE_PTS = fibonacciSphere(DOT_COUNT);

// Plain-JS projection shared by the mount precompute (no runtime needed).
function projectAll(angle, swell, R, cx, cy) {
  const out = new Array(DOT_COUNT);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const tilt = TILT + Math.sin(angle * 0.5) * 0.05;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const cosRT = 0.796;
  const sinRT = 0.605;

  for (let i = 0; i < DOT_COUNT; i++) {
    if (i >= 180) {
      const k = i - 180;
      const ringAngle = (k / 60) * 2 * Math.PI - angle * 2.2;
      const ringRadius = R * 1.32 * swell;
      const rx0 = Math.cos(ringAngle) * ringRadius;
      const rz0 = Math.sin(ringAngle) * ringRadius;
      const ry0 = Math.sin(ringAngle * 3 + angle * 2) * 5;
      const rx = rx0 * cosA + rz0 * sinA;
      const rz1 = -rx0 * sinA + rz0 * cosA;
      const ry = ry0 * cosRT - rz1 * sinRT;
      const rz = ry0 * sinRT + rz1 * cosRT;
      const normZ = rz / (R * 1.35);
      const depth = (normZ + 1) / 2;
      const s = 2.4 / (2.4 - normZ);
      const sx = cx + rx * s;
      const sy = cy + ry * s;
      const sc = 0.26 * (0.65 + 0.6 * depth) * swell;
      out[i] = [sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc];
    } else {
      const p = BASE_PTS[i];
      const wave =
        0.08 * Math.sin(p[1] * 5 + angle * 3.0) +
        0.05 * Math.cos(p[0] * 4 + angle * 2.0);
      const rr = R * (swell + wave);
      const x1 = p[0] * cosA + p[2] * sinA;
      const z1 = -p[0] * sinA + p[2] * cosA;
      const y1 = p[1] * cosT - z1 * sinT;
      const z2 = p[1] * sinT + z1 * cosT;
      const depth = (z2 + 1) / 2;
      const s = 2.2 / (2.2 - z2);
      const sx = cx + x1 * rr * s;
      const sy = cy + y1 * rr * s;
      const hx = sx - cx;
      const hy = sy - cy;
      const hidden = hx * hx + hy * hy < HOLE_RADIUS * HOLE_RADIUS;
      const sc = 0.22 * (0.65 + 0.75 * depth) * swell;
      out[i] = hidden
        ? [0, 0, -10000, -10000]
        : [sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc];
    }
  }
  return out;
}

export function TempOrb({
  tint = color.text,
  beatKey = 0,
  size = 200,
  dimmed = false,
}) {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  const angleY = useSharedValue(0.6);
  const spinBoost = useSharedValue(0);
  const intensity = useSharedValue(0);
  const dimSV = useSharedValue(dimmed ? 1 : 0);
  const firstBeat = useRef(true);

  const R = (size * 0.8) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const dotPicture = useMemo(() => {
    try {
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(rect(0, 0, TEX, TEX));
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color("white"));
      canvas.drawCircle(TEX / 2, TEX / 2, TEX / 2 - 1, paint);
      return recorder.finishRecordingAsPicture();
    } catch {
      return null;
    }
  }, []);
  const dotImg = usePictureAsTexture(dotPicture, { width: TEX, height: TEX });

  const sprites = useMemo(
    () => new Array(DOT_COUNT).fill(0).map(() => rect(0, 0, TEX, TEX)),
    []
  );

  const transforms = useRSXformBuffer(DOT_COUNT, (val, i) => {
    "worklet";
    const a = angleY.value;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const tilt = TILT + Math.sin(a * 0.5) * 0.05;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    const swell = 1 + 0.06 * intensity.value;

    // Bagian 1: Cincin Orbit Planetarium (60 titik partikel terluar)
    if (i >= 180) {
      const k = i - 180;
      // Rotasi orbit lebih cepat dengan arah berlawanan
      const ringAngle = (k / 60) * 2 * Math.PI - a * 2.2;
      const ringRadius = R * 1.32 * (swell + 0.03 * Math.sin(a * 3 + k * 0.2));
      const rx0 = Math.cos(ringAngle) * ringRadius;
      const rz0 = Math.sin(ringAngle) * ringRadius;
      const ry0 = Math.sin(ringAngle * 3 + a * 2) * 5;

      // Kemiringan cincin orbit (tilt 45 derajat)
      const cosRT = 0.796;
      const sinRT = 0.605;
      const rx = rx0 * cosA + rz0 * sinA;
      const rz1 = -rx0 * sinA + rz0 * cosA;
      const ry = ry0 * cosRT - rz1 * sinRT;
      const rz = ry0 * sinRT + rz1 * cosRT;

      const normZ = rz / (R * 1.35);
      const depth = (normZ + 1) / 2;
      const s = 2.4 / (2.4 - normZ);
      const sx = cx + rx * s;
      const sy = cy + ry * s;
      const sc = 0.26 * (0.65 + 0.6 * depth) * swell;
      val.set(sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc);
      return;
    }

    // Bagian 2: Bola Plasma Inti Bergelombang Dinamis (180 titik)
    const p = BASE_PTS[i];
    // Distorsi gelombang harmonik berdenyut (harmonic pulse wave)
    const wave =
      0.08 * Math.sin(p[1] * 5 + a * 3.0) +
      0.05 * Math.cos(p[0] * 4 + a * 2.0);
    const rr = R * (swell + wave);
    const x1 = p[0] * cosA + p[2] * sinA;
    const z1 = -p[0] * sinA + p[2] * cosA;
    const y1 = p[1] * cosT - z1 * sinT;
    const z2 = p[1] * sinT + z1 * cosT;
    const depth = (z2 + 1) / 2;
    const s = 2.2 / (2.2 - z2);
    const sx = cx + x1 * rr * s;
    const sy = cy + y1 * rr * s;
    const hx = sx - cx;
    const hy = sy - cy;
    if (hx * hx + hy * hy < HOLE_RADIUS * HOLE_RADIUS) {
      val.set(0, 0, -10000, -10000);
      return;
    }
    const sc = 0.22 * (0.65 + 0.75 * depth) * swell;
    val.set(sc, 0, sx - (TEX / 2) * sc, sy - (TEX / 2) * sc);
  });

  // First-frame insurance: correct globe even before the first mapper pass.
  useEffect(() => {
    try {
      const initial = projectAll(0.6, 1, R, cx, cy);
      transforms.value = transforms.value.map((slot, i) => {
        slot.set(initial[i][0], initial[i][1], initial[i][2], initial[i][3]);
        return slot;
      });
    } catch {
      // buffer write unsupported — mapper pass will fill it instead
    }
  }, [transforms, R, cx, cy]);

  useEffect(() => {
    dimSV.set(withTiming(dimmed ? 1 : 0, { duration: 400 }));
  }, [dimmed, dimSV]);

  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed || reduceMotion) return;
    intensity.set(0);
    intensity.set(
      withSequence(
        withTiming(1, { duration: 140 }),
        withTiming(0.35, { duration: 180 }),
        withTiming(0.7, { duration: 120 }),
        withTiming(0, { duration: 300 })
      )
    );
    spinBoost.set(2.4);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unsupported — visual beat still plays
    }
  }, [beatKey, dimmed, reduceMotion, intensity, spinBoost]);

  const frame = useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    spinBoost.value *= Math.pow(0.02, dt);
    angleY.value += dt * (BASE_SPEED + spinBoost.value);
  });

  useEffect(() => {
    frame.setActive(focused && !reduceMotion && !dimmed);
  }, [focused, reduceMotion, dimmed, frame]);

  const groupOpacity = useDerivedValue(() => 0.7 * (1 - 0.55 * dimSV.value));

  const colors = useMemo(() => {
    return new Array(DOT_COUNT).fill(0).map((_, i) => {
      // 60 partikel pada cincin orbit planetarium diberikan aksen warna luminous cyan
      if (i >= 180) {
        return "#38BDF8";
      }
      return tint;
    });
  }, [tint]);

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Canvas style={{ width: size, height: size }}>
        <Group opacity={groupOpacity}>
          <Atlas
            image={dotImg}
            sprites={sprites}
            transforms={transforms}
            colors={colors}
            colorBlendMode="modulate"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.Linear }}
          />
        </Group>
      </Canvas>
    </View>
  );
}
