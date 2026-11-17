import { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;
const SEAL_IMG = require("../../assets/kyuubi-seal.png");

/**
 * TempOrb - Animasi UI Segel Kyuubi (Hakke no Fūin Shiki / Eight Trigrams Sealing Style)
 * Menampilkan segel Kyuubi dari perut Naruto yang berputar halus tanpa background merah/gelap,
 * membingkai indikator suhu real-time dengan kontras tinggi dan jernih.
 */
export function TempOrb({
  tint = color.text,
  beatKey = 0,
  size = 320,
  dimmed = false,
}) {
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const firstBeat = useRef(true);

  // Ukuran segel Kyuubi membentang proporsional
  const sealSize = size * 0.94; // ~300px

  useEffect(() => {
    // Rotasi berputar lembut segel Kyuubi searah jarum jam (18 detik per putaran)
    rotation.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  // Efek lonjakan segel (subtle pulse) saat data sensor baru diterima
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed) return;

    pulseScale.value = withSequence(
      withTiming(1.08, { duration: 160, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(0.96, { duration: 180 }),
      withTiming(1.02, { duration: 140 }),
      withTiming(1.0, { duration: 250 })
    );

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics fallback
    }
  }, [beatKey, dimmed, pulseScale]);

  // Gaya animasi untuk rotasi dan denyut segel
  const animatedSealStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: pulseScale.value },
    ],
    opacity: dimmed ? 0.35 : 0.92,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]} accessible={false}>
      {/* Gambar Segel Kyuubi (Hakke no Fūin Shiki) Berputar Bersih Tanpa Background Warna Gelap/Merah */}
      <Animated.Image
        source={SEAL_IMG}
        style={[
          styles.sealImage,
          {
            width: sealSize,
            height: sealSize,
          },
          animatedSealStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  sealImage: {
    position: "absolute",
  },
});

export const LiveSensorGauge = TempOrb;
