import { useEffect, useRef, useState } from "react";
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
  const [statusText, setStatusText] = useState("Menginisialisasi modul sistem...");
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Animasi denyut halus logo (breathing pulse)
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 900 }),
        withTiming(0.2, { duration: 900 })
      ),
      -1,
      true
    );

    // Animasi progress bar pengisian sistem (0% -> 100%)
    progress.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });

    const timer1 = setTimeout(() => {
      setStatusText("Menghubungkan ke Broker HiveMQ...");
    }, 700);

    const timer2 = setTimeout(() => {
      setStatusText("Memuat sensor suhu & jarak...");
    }, 1400);

    const timer3 = setTimeout(() => {
      setStatusText("Sistem siap!");
    }, 2000);

    const timerDone = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerDone);
    };
  }, [onFinish, progress, logoScale, glowOpacity]);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: logoScale.value * 1.25 }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(400)}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Decorative Background Circles */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      {/* Center Branding Content */}
      <View style={styles.contentWrap}>
        <View style={styles.logoStage}>
          <Animated.View style={[styles.glowRing, animatedGlowStyle]} />
          <Animated.View style={[styles.logoBox, animatedLogoStyle]}>
            <Ionicons name="pulse" size={44} color="#FFFFFF" />
          </Animated.View>
        </View>

        <Text style={styles.appName}>LiveTemp</Text>
        <Text style={styles.tagline}>IoT Multi-Sensor Monitoring & Alarm</Text>

        <View style={styles.groupBadge}>
          <Ionicons name="people-outline" size={14} color="#60A5FA" />
          <Text style={styles.groupBadgeText}>Kelompok 16 • PPB Modul 6</Text>
        </View>
      </View>

      {/* Bottom Loading Progress Indicator */}
      <View style={styles.footerWrap}>
        <Text style={styles.statusText}>{statusText}</Text>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
        </View>
        <Text style={styles.copyrightText}>© 2026 Pemrograman Perangkat Bergerak</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.xxl,
    overflow: "hidden",
  },
  bgCircleLarge: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  bgCircleSmall: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(96, 165, 250, 0.06)",
  },
  contentWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  logoStage: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: space.sm,
  },
  glowRing: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: space.xl,
  },
  groupBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(37, 99, 235, 0.16)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
    marginTop: space.sm,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#93C5FD",
  },
  footerWrap: {
    width: width * 0.8,
    alignItems: "center",
    gap: space.sm,
  },
  statusText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 999,
  },
  copyrightText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: space.xs,
  },
});