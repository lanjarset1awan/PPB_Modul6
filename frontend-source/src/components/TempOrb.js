import { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;

// Rentang skala temperatur dial (0°C s/d 50°C, rentang khas sensor IoT lingkungan)
const MIN_TEMP = 0;
const MAX_TEMP = 50;
const START_ANGLE = -130; // Derajat sudut awal (kiri bawah)
const END_ANGLE = 130;    // Derajat sudut akhir (kanan bawah)
const ANGLE_SPAN = END_ANGLE - START_ANGLE; // 260 derajat total busur

// Skala garis dial (26 garis penanda, BUKAN titik)
const TICK_COUNT = 26;

export function TempOrb({
  temperature = 25,
  tint = color.primary,
  beatKey = 0,
  size = 320,
  dimmed = false,
}) {
  const needleAngle = useSharedValue(-130);
  const pulseScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.2);
  const firstBeat = useRef(true);

  const cx = size / 2;
  const cy = size / 2;
  const dialRadius = size * 0.42;

  // Hitung sudut target jarum berdasarkan temperatur aktif
  const tempVal = typeof temperature === "number" ? temperature : 25;
  const clampedTemp = Math.min(MAX_TEMP, Math.max(MIN_TEMP, tempVal));
  const targetAngle = START_ANGLE + (clampedTemp / MAX_TEMP) * ANGLE_SPAN;

  useEffect(() => {
    needleAngle.value = withTiming(targetAngle, {
      duration: 750,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetAngle, needleAngle]);

  // Efek denyut halus pada ambient halo (breathing glow)
  useEffect(() => {
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.18, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [haloOpacity]);

  // Animasi denyut elastis jarum dan getaran haptic saat data baru tiba
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed) return;

    pulseScale.value = withSequence(
      withTiming(1.05, { duration: 130, easing: Easing.out(Easing.ease) }),
      withTiming(0.97, { duration: 160 }),
      withTiming(1.02, { duration: 120 }),
      withTiming(1.0, { duration: 200 })
    );

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
  }, [beatKey, dimmed, pulseScale]);

  const animatedNeedleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAngle.value}deg` }],
  }));

  const animatedDialStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedHaloStyle = useAnimatedStyle(() => ({
    opacity: dimmed ? 0.08 : haloOpacity.value,
    transform: [{ scale: pulseScale.value * 1.04 }],
  }));

  // Buat 26 garis tick penanda skala melingkar (garis tegas, bukan titik)
  const ticks = useMemo(() => {
    const items = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = START_ANGLE + (i / (TICK_COUNT - 1)) * ANGLE_SPAN;
      const isMajor = i % 5 === 0;
      const tickValue = Math.round((i / (TICK_COUNT - 1)) * MAX_TEMP);
      items.push({
        id: i,
        angle,
        isMajor,
        tickValue,
      });
    }
    return items;
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]} accessible={false}>
      {/* 1. Ambient Breathing Halo (Aura Cahaya Melingkar) */}
      <Animated.View
        style={[
          styles.ambientHalo,
          {
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: (size * 0.88) / 2,
            backgroundColor: tint,
          },
          animatedHaloStyle,
        ]}
      />

      <Animated.View style={[styles.dialContainer, { width: size, height: size }, animatedDialStyle]}>
        {/* 2. Bezel Cincin Melingkar Luar (Solid Circular Track) */}
        <View
          style={[
            styles.outerBezelRing,
            {
              width: size * 0.84,
              height: size * 0.84,
              borderRadius: (size * 0.84) / 2,
            },
          ]}
        />

        {/* 3. Cincin Konsentris Halus Dalam */}
        <View
          style={[
            styles.innerConcentricRing,
            {
              width: size * 0.72,
              height: size * 0.72,
              borderRadius: (size * 0.72) / 2,
            },
          ]}
        />

        {/* 4. Deretan Garis Penanda Skala Tachometer Dial (Ticks) */}
        {ticks.map((t) => {
          const rad = (t.angle * Math.PI) / 180;
          const rPos = dialRadius;
          const tx = cx + Math.cos(rad) * rPos - (t.isMajor ? 1.5 : 1);
          const ty = cy + Math.sin(rad) * rPos - (t.isMajor ? 6 : 4);

          return (
            <View
              key={t.id}
              style={[
                styles.tickBar,
                t.isMajor ? styles.tickMajor : styles.tickMinor,
                {
                  left: tx,
                  top: ty,
                  transform: [{ rotate: `${t.angle + 90}deg` }],
                  backgroundColor: t.isMajor ? tint : "#CBD5E1",
                },
              ]}
            />
          );
        })}

        {/* 5. Label Angka Skala Mayor (0, 10, 20, 30, 40, 50°C) */}
        {ticks
          .filter((t) => t.isMajor)
          .map((t) => {
            const rad = (t.angle * Math.PI) / 180;
            const rLabel = dialRadius * 0.82;
            const lx = cx + Math.cos(rad) * rLabel - 14;
            const ly = cy + Math.sin(rad) * rLabel - 8;

            return (
              <View key={`lbl-${t.id}`} style={[styles.labelWrap, { left: lx, top: ly }]}>
                <Text style={[styles.labelText, { color: t.angle <= targetAngle ? tint : "#94A3B8" }]}>
                  {t.tickValue}°
                </Text>
              </View>
            );
          })}

        {/* 6. Jarum Indikator Presisi (Sweeping Meter Needle) */}
        <Animated.View style={[styles.needlePivotWrap, { left: cx, top: cy }, animatedNeedleStyle]}>
          <View style={[styles.needleBlade, { backgroundColor: tint, height: dialRadius * 0.85 }]}>
            <View style={[styles.needleGlowingTip, { backgroundColor: tint }]} />
          </View>
        </Animated.View>

        {/* 7. Tutup Pusat Sumbu Jarum (Central Axis Cap) */}
        <View style={[styles.centerAxisCap, { left: cx - 11, top: cy - 11, borderColor: tint }]} />
      </Animated.View>
    </View>
  );
}

// Alias untuk fleksibilitas kompatibilitas
export const LiveSensorGauge = TempOrb;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ambientHalo: {
    position: "absolute",
    alignSelf: "center",
  },
  dialContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  outerBezelRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  innerConcentricRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  tickBar: {
    position: "absolute",
    borderRadius: 2,
  },
  tickMajor: {
    width: 3,
    height: 12,
  },
  tickMinor: {
    width: 1.5,
    height: 7,
  },
  labelWrap: {
    position: "absolute",
    width: 28,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  needlePivotWrap: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  needleBlade: {
    position: "absolute",
    bottom: 0,
    width: 3,
    borderRadius: 2,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  needleGlowingTip: {
    position: "absolute",
    top: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  centerAxisCap: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    zIndex: 15,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
});
