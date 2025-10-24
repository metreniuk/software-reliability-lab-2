# 🔍 Observability Lab - OpenTelemetry with Grafana Cloud

Welcome to the Observability Lab! This project demonstrates how to instrument a Node.js web service with OpenTelemetry and send traces and metrics to Grafana Cloud for monitoring and analysis.

## 📚 Learning Objectives

By completing this lab, you will learn:

- ✅ What OpenTelemetry is and why it's important for observability
- ✅ How to instrument a Node.js application with automatic and manual instrumentation
- ✅ How to send telemetry data (traces, metrics, and logs) to Grafana Cloud
- ✅ How to analyze traces, metrics, and logs in Grafana Cloud
- ✅ How to correlate logs with traces for powerful debugging
- ✅ How to track errors and performance issues using distributed tracing
- ✅ Best practices for application observability

## 🏗️ Architecture

This lab consists of:

1. **Express.js Web Service** (`server.js`) - A simple REST API with multiple endpoints
2. **OpenTelemetry Instrumentation** (`tracing.js`) - Automatic and manual instrumentation setup
3. **Pino Logger with Loki** - Structured logging with automatic shipping to Grafana Cloud
4. **Grafana Cloud** - Cloud-based observability platform for storing and visualizing telemetry data

```
┌─────────────────┐    OTLP/HTTP (Traces)     ┌──────────────────┐
│                 │ ─────────────────────────▶│                  │
│   Express App   │    OTLP/HTTP (Metrics)    │  Grafana Cloud   │
│  (instrumented) │ ─────────────────────────▶│   - Tempo        │
│   + Pino Logs   │    Loki API (Logs)        │   - Mimir        │
│                 │ ─────────────────────────▶│   - Loki         │
└─────────────────┘                           └──────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ installed
- A Grafana Cloud account (free tier is sufficient)
- Basic knowledge of Node.js and REST APIs

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages:

- `express` - Web framework
- `@opentelemetry/*` - OpenTelemetry SDK and instrumentation libraries
- `dotenv` - Environment variable management
- `pino` - Structured logging library
- `pino-loki` - Loki transport for shipping logs to Grafana Cloud
- `pino-pretty` - Pretty formatting for console logs

### Step 2: Set Up Grafana Cloud OTLP Endpoint

#### 2.1 Create/Access Your Grafana Cloud Account

1. Go to [grafana.com](https://grafana.com)
2. Sign up for a free account or log in
3. Create a new stack (or use an existing one)

#### 2.2 Get Your OTLP Credentials

1. In Grafana Cloud, navigate to **Connections** or **Integrations**
2. Search for **"OpenTelemetry"** or **"Application Observability"**
3. Click on the OpenTelemetry integration
4. Click **"Configure"** or **"Generate Token"**
5. The UI will display:
   - **OTLP Endpoint URL** (e.g., `https://otlp-gateway-prod-us-central-0.grafana.net/otlp`)
   - **Authorization Header** (already base64 encoded)
   - **Instance ID** (your Grafana Cloud instance identifier)

#### 2.3 Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp env.example .env
   ```

2. Open `.env` and fill in your Grafana Cloud credentials:

   ```bash
   # From Grafana Cloud OpenTelemetry configuration page
   OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
   OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic YOUR_BASE64_CREDENTIALS

   # Customize your service name
   OTEL_SERVICE_NAME=my-observability-lab
   ```

3. **Important**: The `OTEL_EXPORTER_OTLP_HEADERS` value should be copied exactly as provided by Grafana Cloud (it's already base64 encoded).

#### 2.4 Configure Loki for Logs (Optional)

To enable log shipping to Grafana Cloud Loki, add these additional environment variables to your `.env` file:

1. **Get Your Loki Endpoint**:

   - In Grafana Cloud, go to **Connections** → **Data sources**
   - Find your **Loki** data source (usually named `grafanacloud-[yourstack]-logs`)
   - Copy the **URL** field (e.g., `https://logs-prod-us-central1.grafana.net`)

2. **Get Your Instance ID (User)**:

   - On the same Loki data source page, note the **User** field
   - This is a numeric value (e.g., `123456`)

3. **Generate an API Key**:

   - Go to **Administration** → **Cloud Access Policies**
   - Click **"Create access policy"**
   - Name it (e.g., "logs-writer")
   - Add scope: **`logs:write`**
   - Click **"Create"** then **"Add token"**
   - Copy the token immediately (it won't be shown again)

4. **Add to `.env`**:
   ```bash
   # Optional: Loki configuration for logs
   LOKI_HOST=https://logs-prod-us-central1.grafana.net
   LOKI_USER=123456
   LOKI_API_KEY=glc_your_token_here
   ```

**Note**: If you don't configure Loki, the application will still work - logs will just print to the console instead of being sent to Grafana Cloud.

### Step 3: Run the Application

```bash
npm start
```

You should see output like:

```
🔧 Initializing OpenTelemetry...
   Service: observability-lab-service
   Endpoint: https://otlp-gateway-prod-us-central-0.grafana.net/otlp
✅ OpenTelemetry initialized successfully
   Traces and metrics will be sent to Grafana Cloud

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Observability Lab Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📡 Server listening on http://localhost:3000
   🔍 Service: observability-lab-service
   📊 Traces → Grafana Cloud
   📈 Metrics → Grafana Cloud
   📝 Logs → Grafana Cloud (if configured)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Generate Some Traffic

Open a new terminal and make requests to the API:

```bash
# Get welcome message
curl http://localhost:3000/

# List users (simulates database query)
curl http://localhost:3000/api/users

# Get specific user
curl http://localhost:3000/api/users/42

# Create an order (simulates complex multi-step operation)
curl -X POST http://localhost:3000/api/orders

# Test slow endpoint (2 second delay)
curl http://localhost:3000/api/slow?delay=2000

# Test error tracking
curl http://localhost:3000/api/error

# Random response times
curl http://localhost:3000/api/random
```

**Generate continuous traffic** for sustained testing:

```bash
# Run this in a loop to generate ongoing traffic
for i in {1..1000}; do
  curl -s http://localhost:3000/api/users > /dev/null
  curl -s -X POST http://localhost:3000/api/orders > /dev/null
  curl -s http://localhost:3000/api/random > /dev/null
  echo "Request batch $i completed"
  sleep 1
done
```

### Step 5: View Your Data in Grafana Cloud

#### 5.1 Explore Traces

1. In Grafana Cloud, navigate to **Explore** (compass icon in left sidebar)
2. Select your data source (usually named after your stack)
3. Switch to **Tempo** (traces) data source
4. Search for traces from your service:
   - Filter by `service.name = observability-lab-service`
   - Explore different endpoints and their spans
5. Click on individual traces to see:
   - Full request lifecycle
   - Database query spans
   - External API call spans
   - Timing information
   - Custom attributes

#### 5.2 View Metrics

1. In **Explore**, switch to the **Prometheus** or **Mimir** data source
2. Check existing metrics: `http_server_requests_errors_total`, `http_server_requests_total`

#### 5.3 Explore Logs

1. In **Explore**, switch to the **Loki** data source
2. Query your logs using LogQL:
   ```logql
   {service="observability-lab-service"}
   ```
3. Filter by log level:
   ```logql
   {service="observability-lab-service"} |= "error"
   ```
4. **View Logs with Traces**:

   - Click on any log line to see details
   - If a log has a `trace_id`, you'll see a **"Tempo"** button
   - Click it to jump directly to the corresponding trace
   - This correlation helps debug issues by showing logs and traces together!

5. **Search by trace ID**:
   ```logql
   {service="observability-lab-service"} | json | trace_id="abc123..."
   ```

#### 5.4 Create Dashboards (optional)

1. Navigate to **Dashboards** → **New Dashboard**
2. Add panels for:
   - Request rate (requests per second)
   - Error rate
   - Response time (p50, p95, p99)
   - Active requests
   - Database query durations
3. Save your dashboard

## 🔍 Understanding the Code

### Automatic Instrumentation

The `tracing.js` file uses OpenTelemetry's auto-instrumentation to automatically trace:

- HTTP requests (incoming and outgoing)
- Express.js routes and middleware
- Common Node.js libraries

This happens **without modifying your application code**!

```javascript
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");

instrumentations: [
  getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      enabled: true,
    },
    "@opentelemetry/instrumentation-express": {
      enabled: true,
    },
  }),
];
```

### Manual Instrumentation

For custom business logic, you can create manual spans:

```javascript
const { trace } = require("@opentelemetry/api");
const tracer = trace.getTracer("my-service", "1.0.0");

const span = tracer.startSpan("my.operation", {
  attributes: {
    "custom.attribute": "value",
  },
});

try {
  // Your code here
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

### Span Attributes

Add context to your traces with attributes:

```javascript
span.setAttribute("user.id", userId);
span.setAttribute("db.rows_returned", rowCount);
span.setAttribute("order.total", 99.99);
```

## 📊 Available Endpoints

| Method | Endpoint               | Description                                            |
| ------ | ---------------------- | ------------------------------------------------------ |
| GET    | `/`                    | Welcome message with endpoint list                     |
| GET    | `/health`              | Health check (not traced)                              |
| GET    | `/api/users`           | List users (simulates DB query)                        |
| GET    | `/api/users/:id`       | Get user by ID (parameterized query)                   |
| POST   | `/api/orders`          | Create order (complex multi-step operation)            |
| GET    | `/api/slow?delay=2000` | Intentionally slow endpoint (testing performance)      |
| GET    | `/api/error`           | Intentionally throws an error (testing error tracking) |
| GET    | `/api/random`          | Random response time (testing variability)             |

## 🧪 Lab Exercises

### Exercise 1: Basic Tracing

1. Start the application
2. Make requests to different endpoints
3. In Grafana Cloud, find traces for your requests
4. Identify the slowest operation in the `/api/orders` endpoint

### Exercise 2: Error Tracking

1. Generate traffic

```shell
for i in {1..1000}; do
  curl -s http://localhost:3000/api/users > /dev/null
  curl -s -X POST http://localhost:3000/api/orders > /dev/null
  curl -s http://localhost:3000/api/random > /dev/null
  echo "Request batch $i completed"
  sleep 1
done
```

2. In Grafana Cloud, find error metrics
3. Examine the error details and stack traces
4. Calculate the error rate for your service.
   Use `http_server_requests_errors_total`, `http_server_requests_total` with `sum` function:

```shell
sum(http_server_requests_errors_total)
```

### Exercise 3: Performance Analysis

1. Call `/api/slow?delay=5000` several times
2. Create a Grafana dashboard showing:
   - Average response time
   - P95 and P99 latency
   - Slow requests (> 3 seconds)

### Exercise 4: Custom Instrumentation

1. Add a new endpoint to `server.js`
2. Create custom spans for your business logic
3. Add meaningful attributes (user ID, transaction ID, etc.)
4. Verify the traces appear in Grafana Cloud

### Exercise 5: Database Query Optimization

1. Find the slowest database queries in your traces
2. Analyze the query patterns
3. Identify which endpoints make the most DB queries

### Exercise 6: Load Testing with autocannon and k6

Learn how high load impacts service behavior, latency, and error rates using load testing tools.

#### Install Load Testing Tools

Install the testing tools as dev dependencies (already included in package.json):

```bash
npm install
```

#### Simple Load Test (autocannon)

For quick testing from the CLI, we'll use [autocannon](https://github.com/mcollina/autocannon), a simple and fast HTTP benchmarking tool:

```bash
# 7 requests/second for 10 seconds (under rate limit)
npx autocannon -c 5 -d 10 -R 7 -m POST http://localhost:3000/api/orders
# npx autocannon -c 5 -d 10 -R 7 -m POST http://localhost:3000/api/users
# npx autocannon -c 5 -d 10 -R 7 -m POST http://localhost:3000/api/random
# npx autocannon -c 5 -d 10 -R 7 -m POST http://localhost:3000/api/error

# With custom headers and body
npx autocannon -c 5 -d 10 -R 7 -m POST \
  -H "Content-Type: application/json" \
  -b '{}' \
  http://localhost:3000/api/orders

# Longer test (20 seconds at 7 RPS)
npx autocannon -c 5 -d 20 -R 7 -m POST http://localhost:3000/api/orders
```

**Autocannon options:**

- `-c` = connections (concurrent users)
- `-d` = duration in seconds
- `-R` = target rate (requests per second)
- `-m` = HTTP method
- `-H` = header
- `-b` = body

This is perfect for quick performance checks and staying under the 10 RPS rate limit.

#### Stress Test with k6 (Exceeds Rate Limit)

The `/api/orders` endpoint has built-in rate limiting that starts rejecting requests when load exceeds 10 requests/second:

- **RPS ≤ 10**: 0% error rate (all requests succeed)
- **RPS = 20**: 50% error rate (probabilistic rejection)
- **RPS ≥ 30**: 100% error rate (all requests rejected)

For more advanced load testing, we use [k6](https://k6.io/), which supports complex scenarios with ramp-up patterns. Run the included stress test:

```bash
npm run k6:load
```

This k6 test will:

1. Ramp up from 1 to 20 virtual users over 20 seconds
2. Sustain 20 users for 30 seconds (exceeding the 10 RPS threshold)
3. Ramp down to 0 users over 10 seconds

**What to observe:**

1. **In k6 output**: Watch the error rate increase as load grows:

   ```
   ✓ status is 200 or 201
   ✗ status is not 503
   ```

2. **In your terminal logs**: Look for warning messages:

   ```
   WARN: Order rejected due to rate limiting
   currentRPS: 25
   errorProbability: 0.75
   ```

3. **In Grafana Cloud Explore (Prometheus/Mimir)**: Query the error rate:

   ```promql
   # Total rate-limited rejections
   sum(rate(http_server_rate_limit_rejections_total[1m]))

   # Overall error rate
   sum(rate(http_server_requests_errors_total[1m])) / sum(rate(http_server_requests_total[1m]))
   ```

4. **In Grafana Cloud Explore (Tempo)**: Find traces with rate limiting:

   - Search for traces where `order.rate_limited = true`
   - Compare response times between successful and rate-limited requests
   - Check the `order.rps` attribute to see load at rejection time

5. **In Grafana Cloud Explore (Loki)**: Search for rate limit logs:
   ```logql
   {service="observability-lab-service"} |= "rate limiting"
   ```

#### Understanding the Results

As the load test progresses, you should see:

- **Phase 1 (0-20s)**: Low error rate, requests mostly succeed
- **Phase 2 (20-50s)**: High error rate (50-80%), many 503 responses, increased latency
- **Phase 3 (50-60s)**: Error rate decreases as virtual users ramp down

This demonstrates how observability helps you:

- Detect when your service is under stress
- Understand the relationship between load and error rates
- Set appropriate alerts and capacity limits
- Make informed decisions about scaling

## 🔧 Troubleshooting

### Application won't start

**Problem**: Missing environment variables

```
❌ Missing required environment variables:
   - OTEL_EXPORTER_OTLP_ENDPOINT
```

**Solution**: Make sure you've copied `env.example` to `.env` and filled in your Grafana Cloud credentials.

---

**Problem**: Authentication error

```
Error initializing OpenTelemetry: 401 Unauthorized
```

**Solution**: Double-check your `OTEL_EXPORTER_OTLP_HEADERS` value in `.env`. It should match exactly what Grafana Cloud provides.

---

### No traces appearing in Grafana Cloud

1. **Check the console output** - Look for OpenTelemetry initialization success message
2. **Verify endpoint** - Make sure `OTEL_EXPORTER_OTLP_ENDPOINT` ends with `/otlp`
3. **Check credentials** - Verify your authorization header is correct
4. **Wait a minute** - Traces can take 30-60 seconds to appear initially
5. **Generate traffic** - Make sure you're actually calling the API endpoints

---

### Port already in use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Either stop the other process or change the port in `.env`:

```bash
PORT=3001
```

## 📖 Additional Resources

### OpenTelemetry

- [OpenTelemetry Official Docs](https://opentelemetry.io/docs/)
- [OpenTelemetry JavaScript SDK](https://opentelemetry.io/docs/instrumentation/js/)
- [Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)

### Grafana Cloud

- [Grafana Cloud OTLP Guide](https://grafana.com/docs/grafana-cloud/send-data/otlp/)
- [Application Observability](https://grafana.com/docs/grafana-cloud/monitor-applications/)
- [Tempo Tracing](https://grafana.com/docs/tempo/latest/)

### Best Practices

- [Distributed Tracing Best Practices](https://opentelemetry.io/docs/concepts/observability-primer/#distributed-tracing)
- [Observability Maturity Model](https://www.honeycomb.io/observability-maturity-model)

## 🎓 Key Takeaways

1. **Observability is crucial** for understanding system behavior in production
2. **OpenTelemetry** provides a vendor-neutral standard for instrumentation
3. **Automatic instrumentation** gives you visibility with minimal code changes
4. **Custom spans** help track business-specific operations
5. **Distributed tracing** reveals performance bottlenecks and dependencies
6. **Context propagation** connects related operations across services
7. **Logs, metrics, and traces together** provide comprehensive observability (the "three pillars")
8. **Trace-log correlation** enables powerful debugging by linking logs to specific traces

## 📝 License

This project is for educational purposes. Feel free to modify and use it for learning!
