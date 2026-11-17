import { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
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

// Skala rentang temperatur thermometer (0°C s/d 50°C)
const MIN_TEMP = 0;
const MAX_TEMP = 50;

// Tinggi kolom cairan merkuri di dalam tabung kaca
const MAX_MERCURY_HEIGHT = 125;
const MIN_MERCURY_HEIGHT = 6;

// Warna skala pengukuran (dari atas/panas ke bawah/dingin sesuai gambar referensi)
const SCALE_TICKS = [
  { id: 1, width: 24, color: "#EF4444", label: "50°" }, // Merah tua (Panas)
  { id: 2, width: 18, color: "#F87171", label: "" },
  { id: 3, width: 22, color: "#FB923C", label: "35°" }, // Oranye
  { id: 4, width: 16, color: "#FBBF24", label: "" },    // Kuning
  { id: 5, width: 20, color: "#A3E635", label: "25°" }, // Hijau muda (Normal)
  { id: 6, width: 16, color: "#34D399", label: "" },    // Hijau toska
  { id: 7, width: 24, color: "#38BDF8", label: "10°" }, // Biru langit (Sejuk)
  { id: 8, width: 18, color: "#2563EB", label: "0°" },  // Biru tua (Dingin)
];

export function TempOrb({
  temperature = 25,
  tint = color.primary,
  beatKey = 0,
  size = 320,
  dimmed = false,
}) {
  const mercuryHeight = useSharedValue(MIN_MERCURY_HEIGHT);
  const pulseScale = useSharedValue(1);
  const sunRotation = useSharedValue(0);
  const sunPulse = useSharedValue(1);
  const snowPulse = useSharedValue(1);
  const firstBeat = useRef(true);

  // Nilai suhu dibatasi dalam rentang min dan max
  const tempVal = typeof temperature === "number" ? temperature : 25;
  const clampedTemp = Math.min(MAX_TEMP, Math.max(MIN_TEMP, tempVal));

  // Menghitung tinggi cairan merkuri secara proporsional
  const targetHeight =
    MIN_MERCURY_HEIGHT +
    ((clampedTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)) *
      (MAX_MERCURY_HEIGHT - MIN_MERCURY_HEIGHT);

  // Status suhu: Hangat/Panas (>= 27°C) atau Sejuk/Dingin (< 27°C)
  const isHot = clampedTemp >= 27;

  // Warna dinamis cairan merkuri sesuai suhu aktual
  const liquidColor = useMemo(() => {
    if (clampedTemp >= 32) return "#EF4444"; // Merah pekat
    if (clampedTemp >= 27) return "#F97316"; // Oranye hangat
    if (clampedTemp >= 22) return "#0284C7"; // Biru cyan segar
    return "#2563EB"; // Biru sejuk
  }, [clampedTemp]);

  // Animasi ketinggian cairan merkuri saat suhu berubah
  useEffect(() => {
    mercuryHeight.value = withTiming(targetHeight, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetHeight, mercuryHeight]);

  // Animasi rotasi halus dan denyut cahaya matahari (saat panas)
  useEffect(() => {
    sunRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    sunPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [sunRotation, sunPulse]);

  // Animasi denyut halus kepingan salju (saat sejuk/dingin)
  useEffect(() => {
    snowPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [snowPulse]);

  // Animasi denyut elastis saat data telemetri baru diterima
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed) return;

    pulseScale.value = withSequence(
      withTiming(1.04, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(0.98, { duration: 150 }),
      withTiming(1.0, { duration: 180 })
    );

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
  }, [beatKey, dimmed, pulseScale]);

  const animatedMercuryStyle = useAnimatedStyle(() => ({
    height: mercuryHeight.value,
  }));

  const animatedThermometerScale = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedSunStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sunRotation.value}deg` },
      { scale: sunPulse.value },
    ],
  }));

  const animatedSnowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: snowPulse.value }],
  }));

  return (
    <View style={styles.rootContainer} accessible={false}>
      <Animated.View style={[styles.stageCard, animatedThermometerScale]}>
        {/* Sisi Kiri: Ikon Cuaca Dinamis (Matahari untuk Panas, Salju untuk Dingin) */}
        <View style={styles.weatherSideContainer}>
          {isHot ? (
            <Animated.View style={[styles.weatherIconWrap, animatedSunStyle]}>
              <View style={styles.sunGlowRing} />
              <Ionicons name="sunny" size={44} color="#F59E0B" />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.weatherIconWrap, animatedSnowStyle]}>
              <View style={styles.snowGlowRing} />
              <Ionicons name="snow" size={40} color="#0284C7" />
            </Animated.View>
          )}

          <Text style={[styles.weatherLabel, { color: isHot ? "#D97706" : "#0284C7" }]}>
            {isHot ? "HANGAT" : "SEJUK"}
          </Text>
        </View>

        {/* Bagian Tengah: Komponen Termometer Tabung & Bohlam */}
        <View style={styles.thermometerContainer}>
          {/* 1. Tabung Kaca Vertikal (Stem) */}
          <View style={styles.glassStem}>
            {/* Latar Belakang Tabung Dalam */}
            <View style={styles.glassInnerBore}>
              {/* Kolom Cairan Merkuri yang Naik Turun secara Dinamis */}
              <Animated.View
                style={[
                  styles.mercuryColumn,
                  { backgroundColor: liquidColor },
                  animatedMercuryStyle,
                ]}
              />
            </View>
          </View>

          {/* 2. Bohlam Melingkar Bawah (Bulb) */}
          <View style={styles.glassBulb}>
            {/* Cairan di dalam Bohlam */}
            <View style={[styles.bulbLiquid, { backgroundColor: liquidColor }]}>
              {/* Pantulan Cahaya Lengkung Putih (Crescent Reflection) */}
              <View style={styles.crescentReflection} />
            </View>
          </View>
        </View>

        {/* Sisi Kanan: Garis Skala Pengukuran Warna-Warni (Ticks) */}
        <View style={styles.scaleSideContainer}>
          {SCALE_TICKS.map((t) => (
            <View key={t.id} style={styles.tickRow}>
              <View
                style={[
                  styles.tickBar,
                  {
                    width: t.width,
                    backgroundColor: t.color,
                  },
                ]}
              />
              {t.label ? (
                <Text style={[styles.tickLabelText, { color: t.color }]}>
                  {t.label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// Alias untuk fleksibilitas pemanggilan
export const LiveSensorGauge = TempOrb;

const styles = StyleSheet.create({
  rootContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  stageCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 22,
  },
  weatherSideContainer: {
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  weatherIconWrap: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sunGlowRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245, 158, 11, 0.16)",
  },
  snowGlowRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(2, 132, 199, 0.16)",
  },
  weatherLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  thermometerContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
    height: 200,
  },
  glassStem: {
    width: 32,
    height: 144,
    backgroundColor: "#FFFFFF",
    borderWidth: 3.5,
    borderColor: "#1E293B",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 0,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 2,
  },
  glassInnerBore: {
    width: 18,
    height: "100%",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  mercuryColumn: {
    width: "100%",
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  glassBulb: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    borderWidth: 3.5,
    borderColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -16,
    zIndex: 3,
  },
  bulbLiquid: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  crescentReflection: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#FFFFFF",
    transform: [{ rotate: "25deg" }],
  },
  scaleSideContainer: {
    width: 68,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 10,
    paddingTop: 4,
    paddingBottom: 28,
  },
  tickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tickBar: {
    height: 4,
    borderRadius: 2,
  },
  tickLabelText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
