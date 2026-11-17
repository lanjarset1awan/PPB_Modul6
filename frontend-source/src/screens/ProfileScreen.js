import { View, Text, StyleSheet, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

const TEAM_MEMBERS = [
  {
    name: "Safira Zahra Asshifa",
    nim: "21120124130093",
    initials: "SZ",
    avatarBg: "#EFF6FF",
    avatarColor: "#2563EB",
  },
  {
    name: "Kiara Wulan Turnauli Manalu",
    nim: "21120124140162",
    initials: "KW",
    avatarBg: "#FDF2F8",
    avatarColor: "#DB2777",
  },
  {
    name: "Ade Raihan Hanafi",
    nim: "21120124140118",
    initials: "AR",
    avatarBg: "#ECFDF5",
    avatarColor: "#059669",
  },
  {
    name: "Lanjar Setiawan",
    nim: "21120124120023",
    initials: "LS",
    avatarBg: "#FFFBEB",
    avatarColor: "#D97706",
  },
];

export function ProfileScreen() {
  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header Profil Simpel - Menonjolkan Kelompok 16 */}
        <Animated.View
          style={styles.headerCard}
          entering={FadeInDown.duration(tokens.motion.entering)}
        >
          <View style={styles.badgeRow}>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>Praktikum PPB 2026</Text>
            </View>
            <View style={styles.activeDotPill}>
              <View style={styles.greenDot} />
              <Text style={styles.activeDotText}>Modul 6</Text>
            </View>
          </View>

          <Text style={styles.groupTitle}>Kelompok 16</Text>
          <Text style={styles.groupSubtitle}>
            Teknik Komputer • Universitas Diponegoro
          </Text>
        </Animated.View>

        {/* Section Header Anggota */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Ionicons name="people-outline" size={18} color={color.text} />
            <Text style={styles.sectionTitle}>Daftar Anggota</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{TEAM_MEMBERS.length} Mahasiswa</Text>
          </View>
        </View>

        {/* Daftar Anggota Kelompok */}
        <View style={styles.membersList}>
          {TEAM_MEMBERS.map((member, idx) => (
            <Animated.View
              key={idx}
              style={styles.memberCard}
              entering={FadeInDown.duration(tokens.motion.entering).delay(idx * 60)}
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
                <Text style={styles.memberNim}>{member.nim}</Text>
              </View>

              <Ionicons name="chevron-forward" size={16} color={color.text3} />
            </Animated.View>
          ))}
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
    paddingBottom: 36,
    gap: space.lg,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xl,
    gap: space.sm,
    boxShadow: shadow.card,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: 2,
  },
  pillBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  pillBadgeText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "700",
  },
  activeDotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  activeDotText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  groupTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  groupSubtitle: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: space.xs,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  sectionTitle: {
    fontSize: tokens.type.section,
    fontWeight: "700",
    color: color.text,
  },
  countBadge: {
    backgroundColor: color.surface2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: color.text2,
  },
  membersList: {
    gap: space.md,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
    gap: space.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 15,
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
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
});
