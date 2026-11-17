import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

const TEAM_MEMBERS = [
  {
    name: "Lanjar Setiawan",
    nim: "21120122140134",
    role: "Lead Mobile & IoT Integration",
    avatarBg: "#EFF6FF",
    avatarColor: "#2563EB",
    initials: "LS",
  },
  {
    name: "Anggota Kelompok 16",
    nim: "21120122140xxx",
    role: "Backend & Database Specialist",
    avatarBg: "#ECFDF5",
    avatarColor: "#059669",
    initials: "AK",
  },
];

const SYSTEM_SPECS = [
  { label: "Aplikasi", val: "LiveTemp Mobile v1.0.0", icon: "phone-portrait-outline" },
  { label: "Framework", val: "React Native • Expo SDK 58", icon: "code-slash-outline" },
  { label: "MQTT Broker", val: "HiveMQ (WSS 8884 & TCP 1883)", icon: "cloud-outline" },
  { label: "Sensor Suhu", val: "Temperature Virtual / DHT22 (°C)", icon: "thermometer-outline" },
  { label: "Sensor Jarak", val: "Ultrasonic Proximity HC-SR04 (cm)", icon: "radio-outline" },
  { label: "Database", val: "PostgreSQL (Neon Cloud DB)", icon: "server-outline" },
];

export function ProfileScreen() {
  const GITHUB_REPO_URL = "https://github.com/lanjarset1awan/PPB_Modul6";

  const handleOpenGitHub = () => {
    Linking.openURL(GITHUB_REPO_URL).catch((err) => {
      console.warn("Gagal membuka URL:", err);
    });
  };

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header Kelompok Banner - Clean White Aesthetic */}
        <Animated.View
          style={styles.headerCard}
          entering={FadeInDown.duration(tokens.motion.entering)}
        >
          <View style={styles.headerTop}>
            <View style={styles.groupIconCircle}>
              <Ionicons name="people" size={28} color="#2563EB" />
            </View>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>Kelompok 16</Text>
            </View>
          </View>

          <Text style={styles.groupTitle}>Praktikum PPB 2026</Text>
          <Text style={styles.groupSubtitle}>
            Modul 6: IoT Multi-Sensor Monitoring & Remote Control
          </Text>

          <View style={styles.divider} />

          <View style={styles.headerMetaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Fakultas / Program Studi</Text>
              <Text style={styles.metaVal}>Teknik Komputer</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Status Sistem</Text>
              <View style={styles.statusPillActive}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.statusTextActive}>Online & Terhubung</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section Anggota Kelompok */}
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={18} color={color.text} />
          <Text style={styles.sectionTitle}>Anggota Kelompok</Text>
        </View>

        <View style={styles.membersList}>
          {TEAM_MEMBERS.map((member, idx) => (
            <Animated.View
              key={idx}
              style={styles.memberCard}
              entering={FadeInDown.duration(tokens.motion.entering).delay(idx * 70)}
            >
              <View
                style={[
                  styles.memberAvatar,
                  { backgroundColor: member.avatarBg },
                ]}
              >
                <Text style={[styles.avatarText, { color: member.avatarColor }]}>
                  {member.initials}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberNim}>NIM: {member.nim}</Text>
                <View style={styles.roleChip}>
                  <Text style={styles.roleText}>{member.role}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Section Spesifikasi IoT */}
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip-outline" size={18} color={color.text} />
          <Text style={styles.sectionTitle}>Spesifikasi Arsitektur Sistem</Text>
        </View>

        <View style={styles.specsCard}>
          {SYSTEM_SPECS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.specRow,
                index === SYSTEM_SPECS.length - 1 && styles.specRowLast,
              ]}
            >
              <View style={styles.specIconWrap}>
                <Ionicons name={item.icon} size={18} color={color.primary} />
              </View>
              <View style={styles.specTextWrap}>
                <Text style={styles.specLabel}>{item.label}</Text>
                <Text style={styles.specValue}>{item.val}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section Repositori GitHub */}
        <View style={styles.sectionHeader}>
          <Ionicons name="logo-github" size={18} color={color.text} />
          <Text style={styles.sectionTitle}>Tautan Repositori GitHub</Text>
        </View>

        <View style={styles.githubCard}>
          <View style={styles.githubInfoRow}>
            <View style={styles.githubIconBox}>
              <Ionicons name="logo-github" size={24} color="#0F172A" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.repoName}>lanjarset1awan/PPB_Modul6</Text>
              <Text style={styles.repoUrl} numberOfLines={1}>
                {GITHUB_REPO_URL}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.openRepoButton,
              pressed && styles.pressed,
            ]}
            onPress={handleOpenGitHub}
            accessibilityRole="button"
            accessibilityLabel="Buka repositori GitHub di browser"
          >
            <Text style={styles.openRepoButtonText}>Buka Repositori GitHub</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    padding: space.lg,
    paddingBottom: 40,
    gap: space.lg,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.md,
    boxShadow: shadow.card,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  groupBadge: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  groupBadgeText: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 12,
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  groupSubtitle: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: space.xs,
  },
  headerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaCol: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  statusPillActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803D",
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
  },
  sectionTitle: {
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
  membersList: {
    gap: space.md,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
    gap: space.md,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
    gap: 3,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: color.text,
  },
  memberNim: {
    fontSize: 13,
    color: color.text3,
    fontVariant: ["tabular-nums"],
  },
  roleChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  specsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.lg,
    boxShadow: shadow.card,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: space.md,
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  specTextWrap: {
    flex: 1,
    gap: 2,
  },
  specLabel: {
    fontSize: 12,
    color: color.text3,
    fontWeight: "500",
  },
  specValue: {
    fontSize: 14,
    fontWeight: "600",
    color: color.text,
  },
  githubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.md,
    boxShadow: shadow.card,
  },
  githubInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  githubIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  repoName: {
    fontSize: 15,
    fontWeight: "700",
    color: color.text,
  },
  repoUrl: {
    fontSize: 12,
    color: color.text3,
  },
  openRepoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    backgroundColor: color.primary,
    paddingVertical: 12,
    borderRadius: radius.cta,
  },
  openRepoButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});