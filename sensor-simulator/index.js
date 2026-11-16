import mqtt from "mqtt";

const BROKER_URL = "mqtt://broker.hivemq.com:1883";
const TOPIC_TEMP = "ppb/kel16/iot/temperature";
const TOPIC_DISTANCE = "ppb/kel16/iot/distance";
const BACKEND_BASE_URL = "http://10.123.128.135:5002";
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

async function fetchLatestThreshold() {
	try {
		const response = await fetch(`${BACKEND_BASE_URL}/api/thresholds/latest`);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = await response.json();
		return data?.value ?? null;
	} catch (error) {
		console.error("Failed to fetch threshold:", error.message);
		return null;
	}
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
			try {
				const response = await fetch(`${BACKEND_BASE_URL}/api/readings`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						temperature,
						distance,
						threshold_value: latestThreshold,
					}),
				});

				if (!response.ok) {
					const text = await response.text();
					throw new Error(`HTTP ${response.status}: ${text}`);
				}

				console.log(
					`[ALARM TRIGGERED] Saved: ${temperature}°C (Limit: ${latestThreshold}°C), Distance: ${distance} cm`,
				);
			} catch (error) {
				console.error("Failed to save triggered reading:", error.message);
			}
		}
	}, PUBLISH_INTERVAL_MS);
}

publishLoop().catch((error) => {
	console.error("Simulator failed to start:", error.message);
	process.exit(1);
});
