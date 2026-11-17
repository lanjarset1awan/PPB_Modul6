import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
	StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
	FadeIn,
	FadeInDown,
	useReducedMotion,
} from "react-native-reanimated";
import { useMqttSensor } from "../hooks/useMqttSensor.js";
import { Api } from "../services/api.js";
import { DataTable } from "../components/DataTable.js";
import { TempOrb } from "../components/TempOrb.js";
import { tokens } from "../theme/tokens.js";

const { color, space, radius, shadow } = tokens;

function StatusChip({ connectionState, hasError, onRetry }) {
	const config = useMemo(() => {
		if (
			hasError ||
			connectionState === "error" ||
			connectionState === "disconnected"
		) {
			return {
				bg: color.dangerBg,
				border: color.dangerBorder,
				text: color.dangerText,
				dot: color.dangerText,
				label: "Offline",
				actionable: true,
			};
		}
		if (connectionState === "reconnecting") {
			return {
				bg: color.warnBg,
				border: color.warnBorder,
				text: color.warnText,
				dot: color.warnText,
				label: "Reconnecting…",
				actionable: false,
			};
		}
		return {
			bg: color.successBg,
			border: color.successBorder,
			text: color.successText,
			dot: color.successText,
			label: "Connected",
			actionable: false,
		};
	}, [connectionState, hasError]);

	const chip = (
		<View
			style={[
				styles.chip,
				{ backgroundColor: config.bg, borderColor: config.border },
			]}
			accessible
			accessibilityLabel={`Sensor feed ${config.label}`}
			accessibilityRole="text"
		>
			<View style={[styles.dot, { backgroundColor: config.dot }]} />
			<Text style={[styles.chipText, { color: config.text }]}>
				{config.label}
			</Text>
			{config.actionable ? (
				<Ionicons name="refresh" size={14} color={config.text} />
			) : null}
		</View>
	);

	if (config.actionable && onRetry) {
		return (
			<Pressable
				onPress={onRetry}
				accessibilityLabel="Retry sensor feed"
				accessibilityRole="button"
				accessibilityHint="Attempts to reload sensor history"
				hitSlop={8}
				style={({ pressed }) => [pressed && styles.pressed]}
			>
				{chip}
			</Pressable>
		);
	}
	return chip;
}

export function MonitoringScreen() {
	const {
		temperature,
		distance,
		timestamp,
		connectionState,
		error: mqttError,
	} = useMqttSensor();
	const [readings, setReadings] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const PAGE_SIZE = 5;
	const [latestThreshold, setLatestThreshold] = useState(null);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [apiError, setApiError] = useState(null);
	const reduceMotion = useReducedMotion();

	const totalPages = useMemo(() => {
		if (!Array.isArray(readings) || readings.length === 0) return 1;
		return Math.max(1, Math.ceil(readings.length / PAGE_SIZE));
	}, [readings]);

	const paginatedReadings = useMemo(() => {
		if (!Array.isArray(readings)) return [];
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return readings.slice(startIndex, startIndex + PAGE_SIZE);
	}, [readings, currentPage]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [totalPages, currentPage]);

	const fetchReadings = useCallback(async () => {
		setLoading(true);
		setApiError(null);
		try {
			const [history, thresholds] = await Promise.all([
				Api.getSensorReadings(),
				Api.getThresholds().catch(() => null),
			]);
			setReadings(history ?? []);
			const latest = Array.isArray(thresholds) ? thresholds[0]?.value : null;
			setLatestThreshold(typeof latest === "number" ? latest : null);
		} catch (err) {
			setApiError(err.message || "Couldn't load history.");
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			fetchReadings();
		}, [fetchReadings]),
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await fetchReadings();
		} finally {
			setRefreshing(false);
		}
	}, [fetchReadings]);

	const proximity = useMemo(() => {
		if (
			typeof temperature !== "number" ||
			typeof latestThreshold !== "number"
		) {
			return null;
		}
		let tone = "below threshold";
		let statusWord = "Normal";
		let statusColor = color.successText;
		if (temperature >= latestThreshold) {
			tone = "at or above threshold";
			statusWord = "Over limit";
			statusColor = color.dangerText;
		} else if (temperature >= latestThreshold - 2) {
			tone = "near threshold";
			statusWord = "Near limit";
			statusColor = color.warnText;
		}
		return { tone, statusWord, statusColor };
	}, [temperature, latestThreshold]);

	const distanceProximity = useMemo(() => {
		if (typeof distance !== "number") return null;
		if (distance < 20) {
			return {
				statusWord: "Terlalu Dekat",
				color: color.dangerText,
				bg: color.dangerBg,
				border: color.dangerBorder,
				description: "Objek terdeteksi sangat dekat (< 20 cm)!",
				icon: "alert-circle-outline",
			};
		}
		if (distance <= 50) {
			return {
				statusWord: "Mendekat",
				color: color.warnText,
				bg: color.warnBg,
				border: color.warnBorder,
				description: "Objek terdeteksi dalam jarak menengah (20 - 50 cm).",
				icon: "warning-outline",
			};
		}
		return {
			statusWord: "Aman / Jauh",
			color: color.successText,
			bg: color.successBg,
			border: color.successBorder,
			description: "Area deteksi aman dan bebas rintangan (> 50 cm).",
			icon: "checkmark-circle-outline",
		};
	}, [distance]);

	const freshness = useMemo(() => {
		if (!Array.isArray(readings) || readings.length === 0) {
			return "No readings yet";
		}
		const first = readings[0];
		const t = new Date(first.recorded_at ?? first.timestamp ?? Date.now());
		const s = Number.isNaN(t.getTime())
			? 0
			: Math.max(0, Math.round((Date.now() - t.getTime()) / 1000));
		const rel =
			s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
		return `Updated ${rel} · ${readings.length} ${
			readings.length === 1 ? "reading" : "readings"
		}`;
	}, [readings]);

	const tempLabel =
		typeof temperature === "number" ? `${temperature.toFixed(2)}` : "--";

	const beatKey =
		typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))
			? Date.parse(timestamp)
			: 0;

	return (
		<View style={styles.safe}>
			<ScrollView
				contentContainerStyle={styles.container}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={color.primary}
					/>
				}
			>
				<Animated.View
					style={styles.card}
					entering={
						reduceMotion
							? FadeIn.duration(150)
							: FadeInDown.duration(tokens.motion.entering)
					}
				>
					<View style={styles.cardTopRow}>
						<Text style={styles.eyebrow}>Live temperature</Text>
						<StatusChip
							connectionState={connectionState}
							hasError={Boolean(mqttError)}
							onRetry={onRefresh}
						/>
					</View>

					<View
						style={styles.orbStage}
						accessible
						accessibilityLabel={`Current temperature ${tempLabel} degrees Celsius${
							proximity ? `, ${proximity.statusWord}` : ""
						}`}
					>
						<View style={styles.orbWrap}>
							<TempOrb
								tint={proximity ? proximity.statusColor : color.text}
								beatKey={beatKey}
								dimmed={
									connectionState !== "connected" &&
									connectionState !== "reconnecting"
								}
								size={320}
							/>
							<View style={styles.orbNumber} pointerEvents="none">
								<View style={styles.orbNumberRow}>
									<Text
										style={[
											styles.temperatureText,
											{ color: proximity ? proximity.statusColor : color.text },
										]}
										selectable
									>
										{tempLabel}
									</Text>
									<Text
										style={[
											styles.unitText,
											{
												color: proximity ? proximity.statusColor : color.text2,
											},
										]}
									>
										°C
									</Text>
								</View>
								{proximity ? (
									<Text
										style={[
											styles.statusWord,
											{ color: proximity.statusColor },
										]}
									>
										{proximity.statusWord}
									</Text>
								) : null}

								<View style={styles.telemetryBarsRow}>
									{[8, 14, 10, 16, 7].map((h, bIdx) => (
										<View
											key={bIdx}
											style={[
												styles.telemetryBar,
												{
													height: h,
													backgroundColor: proximity
														? proximity.statusColor
														: color.primary,
												},
											]}
										/>
									))}
								</View>
							</View>
						</View>
					</View>

					<View style={styles.metaBlock}>
						{typeof latestThreshold === "number" ? (
							<View style={styles.metaRow}>
								<Ionicons
									name="speedometer-outline"
									size={15}
									color={color.text3}
								/>
								<Text style={styles.metaText}>
									Threshold {latestThreshold.toFixed(2)}°C
								</Text>
							</View>
						) : null}
						{timestamp ? (
							<View style={styles.metaRow}>
								<Ionicons name="time-outline" size={15} color={color.text3} />
								<Text style={styles.metaText}>
									Last update {new Date(timestamp).toLocaleString()}
								</Text>
							</View>
						) : null}
						<View style={styles.metaRow}>
							<Ionicons name="refresh-outline" size={15} color={color.text3} />
							<Text style={styles.metaText}>{freshness}</Text>
						</View>
					</View>

					{mqttError ? (
						<View
							style={styles.errorBanner}
							accessible
							accessibilityLiveRegion="polite"
							accessibilityLabel={`Sensor feed offline. ${mqttError}`}
						>
							<Ionicons
								name="cloud-offline-outline"
								size={18}
								color={color.dangerText}
							/>
							<View style={styles.errorBannerTextWrap}>
								<Text style={styles.errorBannerTitle}>Sensor feed offline</Text>
								<Text style={styles.errorBannerText}>{mqttError}</Text>
							</View>
							<Pressable
								onPress={onRefresh}
								accessibilityLabel="Retry sensor feed"
								accessibilityRole="button"
								hitSlop={8}
								style={({ pressed }) => [
									styles.retryButton,
									pressed && styles.pressed,
								]}
							>
								<Text style={styles.retryText}>Retry</Text>
							</Pressable>
						</View>
					) : null}
				</Animated.View>

				{/* Distance Sensor Card */}
				<Animated.View
					style={styles.card}
					entering={
						reduceMotion
							? FadeIn.duration(150)
							: FadeInDown.duration(tokens.motion.entering).delay(60)
					}
				>
					<View style={styles.cardTopRow}>
						<View style={styles.sensorTitleWrap}>
							<Ionicons name="radio-outline" size={16} color={color.primary} />
							<Text style={styles.eyebrow}>Live Distance Sensor</Text>
						</View>
						{distanceProximity ? (
							<View
								style={[
									styles.distanceStatusBadge,
									{
										backgroundColor: distanceProximity.bg,
										borderColor: distanceProximity.border,
									},
								]}
							>
								<Ionicons
									name={distanceProximity.icon}
									size={14}
									color={distanceProximity.color}
								/>
								<Text
									style={[
										styles.distanceStatusText,
										{ color: distanceProximity.color },
									]}
								>
									{distanceProximity.statusWord}
								</Text>
							</View>
						) : null}
					</View>

					<View style={styles.distanceStage}>
						<View style={styles.distanceValueRow}>
							<Text
								style={[
									styles.distanceValueText,
									{
										color: distanceProximity
											? distanceProximity.color
											: color.text,
									},
								]}
							>
								{typeof distance === "number" ? distance.toFixed(1) : "--"}
							</Text>
							<Text style={styles.distanceUnitText}>cm</Text>
						</View>

						{/* Visual Distance Level Meter */}
						<View>
							<View style={styles.progressBarTrack}>
								<View
									style={[
										styles.progressBarFill,
										{
											width: `${
												typeof distance === "number"
													? Math.min(100, Math.max(5, (distance / 120) * 100))
													: 0
											}%`,
											backgroundColor: distanceProximity
												? distanceProximity.color
												: color.primary,
										},
									]}
								/>
							</View>
							<View style={styles.progressLabelsRow}>
								<Text style={styles.progressLabelText}>0 cm (Dekat)</Text>
								<Text style={styles.progressLabelText}>50 cm</Text>
								<Text style={styles.progressLabelText}>120+ cm (Jauh)</Text>
							</View>
						</View>

						<View style={styles.metaRow}>
							<Ionicons
								name="information-circle-outline"
								size={15}
								color={color.text3}
							/>
							<Text style={styles.metaText}>
								{distanceProximity
									? distanceProximity.description
									: "Menunggu pembacaan sensor jarak HC-SR04…"}
							</Text>
						</View>
					</View>
				</Animated.View>

				{apiError && !loading ? (
					<View
						style={styles.errorBanner}
						accessible
						accessibilityLiveRegion="polite"
						accessibilityLabel={`Couldn't load history. ${apiError}`}
					>
						<Ionicons
							name="alert-circle-outline"
							size={18}
							color={color.dangerText}
						/>
						<View style={styles.errorBannerTextWrap}>
							<Text style={styles.errorBannerTitle}>Couldn't load history</Text>
							<Text style={styles.errorBannerText}>{apiError}</Text>
						</View>
						<Pressable
							onPress={fetchReadings}
							accessibilityLabel="Retry loading history"
							accessibilityRole="button"
							hitSlop={8}
							style={({ pressed }) => [
								styles.retryButton,
								pressed && styles.pressed,
							]}
						>
							<Text style={styles.retryText}>Retry</Text>
						</Pressable>
					</View>
				) : null}

				<View style={styles.sectionHeader}>
					<View style={styles.sectionTitleRow}>
						<Text style={styles.sectionTitle}>Triggered Alarm History</Text>
						{Array.isArray(readings) && readings.length > 0 ? (
							<View style={styles.countPill}>
								<Text style={styles.countText}>
									{readings.length}{" "}
									{readings.length === 1 ? "reading" : "readings"}
								</Text>
							</View>
						) : null}
					</View>
				</View>

				<DataTable
					columns={[
						{
							key: "recorded_at",
							title: "Timestamp",
							flex: 1.4,
							render: (value) =>
								value ? new Date(value).toLocaleString() : "--",
						},
						{
							key: "temperature",
							title: "Temp °C",
							flex: 0.8,
							numeric: true,
							render: (value) =>
								typeof value === "number" ? Number(value).toFixed(2) : "--",
						},
						{
							key: "distance",
							title: "Jarak",
							flex: 0.8,
							numeric: true,
							render: (value) =>
								typeof value === "number" ? `${Number(value).toFixed(1)} cm` : "--",
						},
						{
							key: "threshold_value",
							title: "Limit °C",
							flex: 0.8,
							numeric: true,
							render: (value) =>
								typeof value === "number" ? Number(value).toFixed(2) : "--",
						},
					]}
					data={paginatedReadings}
					keyExtractor={(item) => item.id}
					loading={loading && !refreshing}
					emptyTitle="No readings yet"
					emptyMessage="Triggered readings appear here. Pull to refresh."
					emptyActionLabel="Refresh"
					onEmptyAction={fetchReadings}
				/>

				{/* Komponen Navigasi Pagination */}
				{readings.length > 0 ? (
					<View style={styles.paginationCard}>
						<Pressable
							style={({ pressed }) => [
								styles.paginationBtn,
								currentPage <= 1 && styles.paginationBtnDisabled,
								pressed && currentPage > 1 && styles.pressed,
							]}
							onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage <= 1}
							accessibilityRole="button"
							accessibilityLabel="Halaman sebelumnya"
						>
							<Ionicons
								name="chevron-back"
								size={16}
								color={currentPage <= 1 ? color.text3 : color.primary}
							/>
							<Text
								style={[
									styles.paginationBtnText,
									currentPage <= 1 && styles.paginationBtnTextDisabled,
								]}
							>
								Sebelumnya
							</Text>
						</Pressable>

						<View style={styles.paginationCenterInfo}>
							<Text style={styles.paginationPageIndicator}>
								Halaman <Text style={styles.pageNumberBold}>{currentPage}</Text> dari {totalPages}
							</Text>
							<Text style={styles.paginationRangeIndicator}>
								Menampilkan {Math.min((currentPage - 1) * PAGE_SIZE + 1, readings.length)}-
								{Math.min(currentPage * PAGE_SIZE, readings.length)} dari {readings.length} data
							</Text>
						</View>

						<Pressable
							style={({ pressed }) => [
								styles.paginationBtn,
								currentPage >= totalPages && styles.paginationBtnDisabled,
								pressed && currentPage < totalPages && styles.pressed,
							]}
							onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage >= totalPages}
							accessibilityRole="button"
							accessibilityLabel="Halaman berikutnya"
						>
							<Text
								style={[
									styles.paginationBtnText,
									currentPage >= totalPages && styles.paginationBtnTextDisabled,
								]}
							>
								Berikutnya
							</Text>
							<Ionicons
								name="chevron-forward"
								size={16}
								color={currentPage >= totalPages ? color.text3 : color.primary}
							/>
						</Pressable>
					</View>
				) : null}
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
		paddingBottom: space.xxl,
		gap: space.lg,
		backgroundColor: color.bg,
	},
	card: {
		backgroundColor: color.surface,
		padding: space.xl,
		borderRadius: radius.card,
		borderCurve: "continuous",
		gap: space.md,
		borderWidth: 1,
		borderColor: color.border,
		boxShadow: shadow.card,
	},
	cardTopRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: space.md,
	},
	eyebrow: {
		fontSize: 12,
		fontWeight: "600",
		textTransform: "uppercase",
		letterSpacing: 0.8,
		color: color.text3,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: radius.chip,
		borderCurve: "continuous",
		borderWidth: 1,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	chipText: {
		fontSize: 12,
		fontWeight: "600",
	},
	orbStage: {
		alignItems: "center",
		gap: space.sm,
		minHeight: 320,
	},
	orbWrap: {
		width: 320,
		height: 320,
		alignSelf: "center",
		position: "relative",
	},
	orbNumber: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		gap: 2,
	},
	orbNumberRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 6,
	},
	temperatureText: {
		fontSize: 30,
		fontWeight: "700",
		color: color.text,
		fontVariant: ["tabular-nums"],
	},
	unitText: {
		fontSize: 15,
		fontWeight: "600",
		color: color.text2,
	},
	statusWord: {
		fontSize: 13,
		fontWeight: "700",
	},
	telemetryBarsRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 3,
		marginTop: 4,
	},
	telemetryBar: {
		width: 3,
		borderRadius: 2,
		opacity: 0.85,
	},
	metaBlock: {
		gap: space.sm,
		marginTop: space.sm,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	metaText: {
		fontSize: 13,
		color: color.text2,
		fontVariant: ["tabular-nums"],
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		// ponytail: taller break above, table tucked under header
		marginTop: space.md,
		marginBottom: -space.sm,
	},
	sectionTitleRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.sm,
	},
	sectionTitle: {
		fontSize: tokens.type.section,
		fontWeight: "700",
		color: color.text,
	},
	countPill: {
		backgroundColor: color.surface2,
		borderRadius: radius.pill,
		borderCurve: "continuous",
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	countText: {
		fontSize: 12,
		fontWeight: "600",
		color: color.text2,
		fontVariant: ["tabular-nums"],
	},
	errorBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: space.md,
		backgroundColor: color.dangerBg,
		borderWidth: 1,
		borderColor: color.dangerBorder,
		borderRadius: radius.input,
		borderCurve: "continuous",
		padding: space.md,
	},
	errorBannerTextWrap: {
		flex: 1,
		gap: 2,
	},
	errorBannerTitle: {
		fontSize: 14,
		fontWeight: "600",
		color: color.dangerText,
	},
	errorBannerText: {
		fontSize: 13,
		color: color.dangerText,
	},
	retryButton: {
		minHeight: tokens.hit,
		justifyContent: "center",
		paddingHorizontal: space.md,
	},
	retryText: {
		fontSize: 14,
		fontWeight: "600",
		color: color.dangerText,
	},
	pressed: {
		opacity: 0.9,
		transform: [{ scale: 0.98 }],
	},
	sensorTitleWrap: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	distanceStage: {
		gap: space.md,
		paddingTop: space.sm,
	},
	distanceValueRow: {
		flexDirection: "row",
		alignItems: "baseline",
		gap: 6,
	},
	distanceValueText: {
		fontSize: 32,
		fontWeight: "700",
		fontVariant: ["tabular-nums"],
	},
	distanceUnitText: {
		fontSize: 15,
		fontWeight: "600",
		color: color.text2,
	},
	progressBarTrack: {
		height: 10,
		backgroundColor: color.surface2,
		borderRadius: radius.pill,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: color.border,
	},
	progressBarFill: {
		height: "100%",
		borderRadius: radius.pill,
	},
	progressLabelsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 4,
	},
	progressLabelText: {
		fontSize: 11,
		color: color.text3,
		fontWeight: "500",
	},
	distanceStatusBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: radius.chip,
		borderWidth: 1,
	},
	distanceStatusText: {
		fontSize: 12,
		fontWeight: "600",
	},
	paginationCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: color.surface,
		borderRadius: radius.card,
		borderWidth: 1,
		borderColor: color.border,
		padding: space.md,
		marginTop: -space.sm,
		boxShadow: shadow.card,
	},
	paginationBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: color.surface2,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: radius.cta,
		borderWidth: 1,
		borderColor: color.border,
		minHeight: tokens.hit,
	},
	paginationBtnDisabled: {
		opacity: 0.45,
		backgroundColor: color.bg,
	},
	paginationBtnText: {
		fontSize: 13,
		fontWeight: "600",
		color: color.primary,
	},
	paginationBtnTextDisabled: {
		color: color.text3,
	},
	paginationCenterInfo: {
		alignItems: "center",
		gap: 2,
	},
	paginationPageIndicator: {
		fontSize: 13,
		fontWeight: "600",
		color: color.text,
	},
	pageNumberBold: {
		color: color.primary,
		fontWeight: "700",
	},
	paginationRangeIndicator: {
		fontSize: 11,
		color: color.text3,
		fontVariant: ["tabular-nums"],
	},
});
