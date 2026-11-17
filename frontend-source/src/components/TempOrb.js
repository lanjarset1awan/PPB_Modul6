import { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { tokens } from "../theme/tokens.js";

const { color } = tokens;
const SEAL_IMG = require("../../assets/kyuubi-seal.png");

// 8 Chakra Beacons mengelilingi 8 titik segel Kyuubi (Hakke no Fūin Shiki)
const CHAKRA_ORBS = Array.from({ length: 8 });

export function TempOrb({
  tint = color.primary,
  beatKey = 0,
  size = 320,
  dimmed = false,
}) {
  const rotation = useSharedValue(0);
  const reverseRot = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const auraGlow = useSharedValue(0.4);
  const chakraWave = useSharedValue(0.8);
  const firstBeat = useRef(true);

  const sealSize = size * 0.92; // Ukuran segel Kyuubi (~295px)
  const centerRadius = (size * 0.45);

  useEffect(() => {
    // 1. Rotasi berputar lembut segel Kyuubi searah jarum jam (16 detik per putaran)
    rotation.value = withRepeat(
      withTiming(360, { duration: 16000, easing: Easing.linear }),
      -1,
      false
    );

    // 2. Rotasi berlawanan partikel chakra luar (12 detik per putaran)
    reverseRot.value = withRepeat(
      withTiming(-360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );

    // 3. Denyut gelombang aura chakra Kurama (breathing aura)
    auraGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    chakraWave.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [rotation, reverseRot, auraGlow, chakraWave]);

  // Efek lonjakan chakra (shockwave swell) saat data sensor baru diterima
  useEffect(() => {
    if (firstBeat.current) {
      firstBeat.current = false;
      return;
    }
    if (!beatKey || dimmed) return;

    pulseScale.value = withSequence(
      withTiming(1.14, { duration: 160, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(0.94, { duration: 180 }),
      withTiming(1.05, { duration: 140 }),
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
    opacity: dimmed ? 0.45 : 0.95,
  }));

  // Gaya animasi aura chakra di belakang segel
  const animatedAuraStyle = useAnimatedStyle(() => ({
    opacity: dimmed ? 0.15 : auraGlow.value,
    transform: [{ scale: chakraWave.value * pulseScale.value }],
  }));

  // Gaya animasi orbs chakra yang berputar berlawanan
  const animatedReverseRing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reverseRot.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]} accessible={false}>
      {/* 1. Lingkaran Cahaya Aura Chakra Kyuubi (Belakang) */}
      <Animated.View
        style={[
          styles.chakraAuraRing,
          {
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: (size * 0.78) / 2,
            borderColor: tint,
            backgroundColor: tint,
          },
          animatedAuraStyle,
        ]}
      />

      {/* 2. Cincin Gelombang Energi Sekunder */}
      <Animated.View
        style={[
          styles.chakraPulseWave,
          {
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: (size * 0.88) / 2,
            borderColor: tint,
          },
          animatedAuraStyle,
        ]}
      />

      {/* 3. Delapan Partikel Chakra Melingkar di Ujung Segel */}
      <Animated.View
        style={[
          styles.orbitRing,
          { width: size, height: size },
          animatedReverseRing,
        ]}
      >
        {CHAKRA_ORBS.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 8;
          const orbX = Math.cos(angle) * centerRadius;
          const orbY = Math.sin(angle) * centerRadius;
          return (
            <View
              key={i}
              style={[
                styles.chakraOrb,
                {
                  backgroundColor: tint,
                  transform: [{ translateX: orbX }, { translateY: orbY }],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* 4. Gambar Segel Kyuubi (Hakke no Fūin Shiki) Berputar */}
      <Animated.Image
        source={SEAL_IMG}
        style={[
          styles.sealImage,
          {
            width: sealSize,
            height: sealSize,
            tintColor: tint, // Mewarnai garis segel sesuai status suhu/chakra
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
  },
  chakraAuraRing: {
    position: "absolute",
    opacity: 0.12,
    borderWidth: 2,
  },
  chakraPulseWave: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    opacity: 0.25,
  },
  orbitRing: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  chakraOrb: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  sealImage: {
    position: "absolute",
  },
});

export const LiveSensorGauge = TempOrb;
