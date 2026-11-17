import mqtt from "mqtt";

const BROKER_URL = "mqtt://broker.hivemq.com:1883";
const TOPIC_TEMP = "ppb/kel16/iot/temperature";
const TOPIC_DISTANCE = "ppb/kel16/iot/distance";
const BACKEND_BASE_URL = "http://10.34.2.135:5002";
const PUBLISH_INTERVAL_MS = 5000;

const clientId = `simulator-${Math.random().toString(16).slice(2)}`;
const client = mqtt.connect(BROKER_URL, {
	clientId,
	clean: true,
	reconnectPeriod: 5000,
});

client.on("connect", () => {
	console.log(`MQTT connected as ${clientId}`);
});

client.on("reconnect", () => {
	console.log("Reconnecting to MQTT broker...");
});

client.on("error", (error) => {
	console.error("MQTT error", error.message);
});

async function postReadingToBackend(payload) {
	const urls = [
		`${BACKEND_BASE_URL}/api/readings`,
		"http://localhost:5002/api/readings",
	];

	for (const url of urls) {
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (response.ok) return true;
		} catch {
			// coba fallback url berikutnya
		}
	}
	return false;
}

async function fetchLatestThreshold() {
	const urls = [
		`${BACKEND_BASE_URL}/api/thresholds/latest`,
		"http://localhost:5002/api/thresholds/latest",
	];

	for (const url of urls) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				return data?.value ?? null;
			}
		} catch {
			// coba fallback url berikutnya
		}
	}
	console.error("Gagal mengambil threshold dari backend (remote & localhost unreachable).");
	return null;
}

async function publishLoop() {
	let latestThreshold = await fetchLatestThreshold();
	let counter = 0;

	setInterval(async () => {
		counter++;
		// Simulasi Sensor Suhu (20.00°C s/d 35.00°C)
		const temperature = Number((Math.random() * 15 + 20).toFixed(2));
		// Simulasi Sensor Jarak / Ultrasonic HC-SR04 (5.0 cm s/d 120.0 cm)
		const distance = Number((Math.random() * 115 + 5).toFixed(1));

		const timestamp = new Date().toISOString();
		const payload = JSON.stringify({
			temperature,
			distance,
			timestamp,
		});

		// Publish ke topik utama (berisi temperature + distance)
		client.publish(TOPIC_TEMP, payload, { qos: 0 }, (error) => {
			if (error) {
				console.error("Failed to publish telemetry", error.message);
			} else {
				console.log(`[Sensor] Temp: ${temperature}°C | Jarak: ${distance} cm -> ${TOPIC_TEMP}`);
			}
		});

		// Publish ke topik khusus distance juga
		client.publish(
			TOPIC_DISTANCE,
			JSON.stringify({ distance, timestamp }),
			{ qos: 0 }
		);

		// Perbarui threshold setiap 2 iterasi (~10 detik) atau jika null
		if (latestThreshold === null || counter % 2 === 0) {
			latestThreshold = await fetchLatestThreshold();
		}

		if (typeof latestThreshold === "number" && temperature >= latestThreshold) {
			const success = await postReadingToBackend({
				temperature,
				distance,
				threshold_value: latestThreshold,
			});

			if (success) {
				console.log(
					`[ALARM TRIGGERED] Saved: ${temperature}°C (Limit: ${latestThreshold}°C), Distance: ${distance} cm`,
				);
			} else {
				console.error("Failed to save triggered reading to backend.");
			}
		}
	}, PUBLISH_INTERVAL_MS);
}

publishLoop().catch((error) => {
	console.error("Simulator failed to start:", error.message);
	process.exit(1);
});
