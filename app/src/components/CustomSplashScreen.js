import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { tokens } from "../theme/tokens.js";

const { color, space, radius } = tokens;
const { width } = Dimensions.get("window");

export function CustomSplashScreen({ onFinish }) {
  const [statusText, setStatusText] = useState("Menginisialisasi modul sensor...");
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const ripple1 = useSharedValue(0.7);
  const ripple2 = useSharedValue(0.7);
  const orbitAngle = useSharedValue(0);

  useEffect(() => {
    // 1. Logo breathing animation
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 2. Radar wave ripples radiating outward
    ripple1.value = withRepeat(
      withTiming(1.9, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    setTimeout(() => {
      ripple2.value = withRepeat(
        withTiming(1.9, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 600);

    // 3. Orbiting particle around logo
    orbitAngle.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // 4. Progress bar filling smoothly (0 -> 1)
    progress.value = withTiming(1, { duration: 2300, easing: Easing.out(Easing.cubic) });

    const t1 = setTimeout(() => setStatusText("Sinkronisasi Broker HiveMQ..."), 700);
    const t2 = setTimeout(() => setStatusText("Memuat sensor suhu & jarak..."), 1400);
    const t3 = setTimeout(() => setStatusText("Sistem LiveTemp Siap!"), 2000);
    const tDone = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tDone);
    };
  }, [onFinish, progress, logoScale, ripple1, ripple2, orbitAngle]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const animatedRipple1 = useAnimatedStyle(() => ({
    transform: [{ scale: ripple1.value }],
    opacity: 1 - (ripple1.value - 0.7) / 1.2,
  }));

  const animatedRipple2 = useAnimatedStyle(() => ({
    transform: [{ scale: ripple2.value }],
    opacity: 1 - (ripple2.value - 0.7) / 1.2,
  }));

  const animatedOrbitStyle = useAnimatedStyle(() => {
    const rad = (orbitAngle.value * Math.PI) / 180;
    const r = 58;
    return {
      transform: [
        { translateX: Math.cos(rad) * r },
        { translateY: Math.sin(rad) * r },
      ],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(350)}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Decorative Light Gradients */}
      <View style={styles.ambientTopRight} />
      <View style={styles.ambientBottomLeft} />

      {/* Center Hero Unit */}
      <View style={styles.heroUnit}>
        <View style={styles.radarStage}>
          {/* Animated Sonar Rings */}
          <Animated.View style={[styles.radarRing, animatedRipple1]} />
          <Animated.View style={[styles.radarRing, animatedRipple2]} />

          {/* Orbiting Satellite Dot */}
          <Animated.View style={[styles.satelliteDot, animatedOrbitStyle]} />

          {/* Central Glassmorphic Card */}
          <Animated.View style={[styles.logoCard, animatedLogoStyle]}>
            <View style={styles.logoInner}>
              <Ionicons name="pulse" size={38} color="#2563EB" />
            </View>
          </Animated.View>
        </View>

        <Text style={styles.brandTitle}>LiveTemp</Text>
        <Text style={styles.brandSubtitle}>
          IoT Telemetry & Smart Monitoring System
        </Text>

        <View style={styles.groupBadge}>
          <Ionicons name="people" size={14} color="#2563EB" />
          <Text style={styles.groupBadgeText}>Kelompok 16 • PPB Modul 6</Text>
        </View>
      </View>

      {/* Bottom Modern Progress Area */}
      <View style={styles.bottomArea}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
        </View>

        <Text style={styles.versionWatermark}>
          LiveTemp Mobile v1.0.0 • Pemrograman Perangkat Bergerak
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 48,
    overflow: "hidden",
  },
  ambientTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(37, 99, 235, 0.05)",
  },
  ambientBottomLeft: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(56, 189, 248, 0.06)",
  },
  heroUnit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  radarStage: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: space.md,
  },
  radarRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.25)",
    backgroundColor: "rgba(37, 99, 235, 0.03)",
  },
  satelliteDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#0284C7",
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  logoCard: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 5,
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
    textAlign: "center",
  },
  groupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    marginTop: space.sm,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  bottomArea: {
    width: width * 0.82,
    alignItems: "center",
    gap: space.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F8FAFC",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
  },
  versionWatermark: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 4,
  },
});