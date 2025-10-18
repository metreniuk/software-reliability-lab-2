# ⚡ Quick Start Guide

Get your observability lab running in 5 minutes!

## 1️⃣ Install Dependencies

```bash
npm install
```

## 2️⃣ Configure Grafana Cloud

1. Go to [grafana.com](https://grafana.com) and sign in (or create a free account)
2. Navigate to **Connections** → **OpenTelemetry**
3. Copy the configuration values shown

## 3️⃣ Create .env File

```bash
cp env.example .env
```

Edit `.env` and paste your Grafana Cloud credentials:

```bash
OTEL_SERVICE_NAME=my-observability-lab
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-XX-XXXX-X.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic YOUR_CREDENTIALS_HERE
```

## 4️⃣ Start the Server

```bash
npm start
```

Look for this message:

```
✅ OpenTelemetry initialized successfully
🚀 Observability Lab Server Running
```

## 5️⃣ Generate Traffic

In a new terminal, run some requests:

```bash
# Single requests
curl http://localhost:3000/api/users
curl http://localhost:3000/api/orders -X POST
curl http://localhost:3000/api/random

# Or generate continuous traffic
for i in {1..20}; do
  curl -s http://localhost:3000/api/users > /dev/null
  curl -s -X POST http://localhost:3000/api/orders > /dev/null
  sleep 1
done
```

## 6️⃣ View in Grafana Cloud

1. Go to Grafana Cloud → **Explore**
2. Select **Tempo** data source
3. Search for `service.name = observability-lab-service`
4. Click on traces to explore! 🎉

---

## 🔧 Troubleshooting

**Port already in use?**

```bash
# Change port in .env
PORT=3001
```

**No traces in Grafana?**

- Wait 30-60 seconds for first traces
- Verify OTLP endpoint and headers in `.env`
- Check console for errors

**Need more help?**

- See [README.md](README.md) for detailed documentation
- Check the troubleshooting section
