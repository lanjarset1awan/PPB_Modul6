import { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
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
import Animated, {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

// Total partikel dial & radar (Bukan sphere, melainkan 2D Radar Telemetry Dial Gauge)
const OUTER_TICKS = 60; // 60 titik lingkar skala luar (dial gauge scale)
const INNER_RING = 40;  // 40 titik ring radar konsentris tengah
const RADAR_SWEEP = 18; // 18 titik ekor berkas radar scanner
const CARDINAL_BEACONS = 4; // 4 beacon kuadran (N, E, S, W)
const TOTAL_DOTS = OUTER_TICKS + INNER_RING + RADAR_SWEEP + CARDINAL_BEACONS; // 122 partikel

const TEX = 32;
const BASE_SWEEP_SPEED = 1.8; // Kecepatan rotasi radar sweep (rad/detik)

export function TempOrb({
  tint = color.primary,
  beatKey = 0,
  size = 320,
  dimmed = false,
}) {
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  const sweepAngle = useSharedValue(0);
  const ringRotate = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const intensity = useSharedValue(0);
  const dimSV = useSharedValue(dimmed ? 1 : 0);
  const firstBeat = useRef(true);

  const cx = size / 2;
  const cy = size / 2;
  const R_OUTER = size * 0.44; // Skala luar dial (~140px)
  const R_INNER = size * 0.36; // Ring konsentris radar (~115px)

  // Tekstur titik lingkaran Skia dengan anti-aliasing tinggi
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
    () => new Array(TOTAL_DOTS).fill(0).map(() => rect(0, 0, TEX, TEX)),
    []
  );

  // Buffer transformasi koordinat 2D Radar Telemetry Dial
  const transforms = useRSXformBuffer(TOTAL_DOTS, (val, i) => {
    "worklet";
    const sweep = sweepAngle.value;
    const rot = ringRotate.value;
    const swell = pulseScale.value;

    // 1. Skala Luar Dial (Outer Gauge Dial Ticks) -> i: 0 s/d 59
    if (i < OUTER_TICKS) {
      const theta = (i / OUTER_TICKS) * 2 * Math.PI + rot * 0.15;
      const isMajor = i % 5 === 0;
      const r = R_OUTER * (isMajor ? swell * 1.02 : swell);
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      const sc = isMajor ? 0.24 : 0.14;
      val.set(sc, 0, x - (TEX / 2) * sc, y - (TEX / 2) * sc);
      return;
    }

    // 2. Ring Konsentris Radar Tengah -> i: 60 s/d 99
    if (i < OUTER_TICKS + INNER_RING) {
      const k = i - OUTER_TICKS;
      const theta = (k / INNER_RING) * 2 * Math.PI - rot * 0.35;
      const r = R_INNER * swell;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      const sc = k % 4 === 0 ? 0.20 : 0.12;
      val.set(sc, 0, x - (TEX / 2) * sc, y - (TEX / 2) * sc);
      return;
    }

    // 3. Berkas Sapuan Radar (Radar Sweep Scanner Beam) -> i: 100 s/d 117
    if (i < OUTER_TICKS + INNER_RING + RADAR_SWEEP) {
      const k = i - (OUTER_TICKS + INNER_RING);
      // Ekor berkas menyusut secara bertingkat di belakang sweepAngle
      const trailAngle = sweep - (k * 0.04);
      const trailRadius = (R_INNER + (R_OUTER - R_INNER) * (k / RADAR_SWEEP)) * swell;
      const x = cx + Math.cos(trailAngle) * trailRadius;
      const y = cy + Math.sin(trailAngle) * trailRadius;
      const sc = 0.28 * (1 - (k / RADAR_SWEEP) * 0.65);
      val.set(sc, 0, x - (TEX / 2) * sc, y - (TEX / 2) * sc);
      return;
    }

    // 4. Empat Beacon Kuadran Utama (North, East, South, West) -> i: 118 s/d 121
    const bIdx = i - (OUTER_TICKS + INNER_RING + RADAR_SWEEP);
    const bTheta = (bIdx / CARDINAL_BEACONS) * 2 * Math.PI + rot * 0.05;
    const bR = (R_OUTER + 12) * swell;
    const bx = cx + Math.cos(bTheta) * bR;
    const by = cy + Math.sin(bTheta) * bR;
    const bSc = 0.26 + 0.08 * Math.sin(sweep * 3 + bIdx);
    val.set(bSc, 0, bx - (TEX / 2) * bSc, by - (TEX / 2) * bSc);
  });

  useEffect(() => {
    dimSV.set(withTiming(dimmed ? 1 : 0, { duration: 400 }));
  }, [dimmed, dimSV]);

  // Efek denyut gelombang saat data sensor baru tiba (beat)
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed || reduceMotion) return;
    intensity.set(0);
    pulseScale.set(
      withSequence(
        withTiming(1.08, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0.96, { duration: 180 }),
        withTiming(1.03, { duration: 140 }),
        withTiming(1.0, { duration: 250 })
      )
    );
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
  }, [beatKey, dimmed, reduceMotion, pulseScale, intensity]);

  // Frame Loop Skia/Reanimated: Menggerakkan sapuan radar dan ring dial
  const frame = useFrameCallback((info) => {
    "worklet";
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    sweepAngle.value += dt * BASE_SWEEP_SPEED;
    ringRotate.value += dt * 0.45;
  });

  useEffect(() => {
    frame.setActive(focused && !reduceMotion && !dimmed);
  }, [focused, reduceMotion, dimmed, frame]);

  const groupOpacity = useDerivedValue(() => 0.85 * (1 - 0.5 * dimSV.value));

  // Pewarnaan partikel dial & radar
  const colors = useMemo(() => {
    return new Array(TOTAL_DOTS).fill(0).map((_, i) => {
      // Skala dial luar: mengikuti status tint
      if (i < OUTER_TICKS) {
        return i % 5 === 0 ? tint : "rgba(100, 116, 139, 0.45)";
      }
      // Ring tengah: warna aksen cyan/sky
      if (i < OUTER_TICKS + INNER_RING) {
        return "rgba(56, 189, 248, 0.6)";
      }
      // Berkas sapuan radar: warna terang bercahaya
      if (i < OUTER_TICKS + INNER_RING + RADAR_SWEEP) {
        return tint;
      }
      // Beacon kuadran luar: cyan cerah
      return "#0284C7";
    });
  }, [tint]);

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      {/* Skia Canvas Rendering untuk Radar Telemetry Dial Gauge */}
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

// Alias untuk fleksibilitas impor
export const LiveSensorGauge = TempOrb;
