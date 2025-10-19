/**
 * Observability Lab - Express Web Service
 *
 * A simple web service instrumented with OpenTelemetry.
 * This service demonstrates:
 * - Automatic tracing of HTTP requests
 * - Custom spans and attributes
 * - Error tracking
 * - Multiple endpoints with different behaviors
 * - Simulated database and external API calls
 */

const express = require("express");
const { trace, SpanStatusCode, metrics } = require("@opentelemetry/api");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

// Get meter for custom metrics
const meter = metrics.getMeter(
  process.env.OTEL_SERVICE_NAME,
  process.env.OTEL_SERVICE_VERSION
);

// Create custom metrics
const requestCounter = meter.createCounter("http.server.requests.total", {
  description: "Total number of HTTP requests",
  unit: "1",
});

const errorCounter = meter.createCounter("http.server.requests.errors", {
  description: "Total number of HTTP requests that resulted in errors",
  unit: "1",
});

const rateLimitCounter = meter.createCounter(
  "http.server.rate_limit.rejections",
  {
    description: "Total number of requests rejected due to rate limiting",
    unit: "1",
  }
);

// Sliding window for tracking order requests (for rate limiting)
const orderRequestTimestamps = [];

// Setup logger with Loki integration
const logger = pino({
  level: "info",
  transport: {
    targets: [
      // Pretty print to console (for local development)
      {
        target: "pino-pretty",
        level: "info",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
      // Send logs to Grafana Cloud Loki (if configured)
      ...(process.env.LOKI_HOST
        ? [
            {
              target: "pino-loki",
              level: "info",
              options: {
                batching: true,
                interval: 5,
                host: process.env.LOKI_HOST,
                basicAuth: {
                  username: process.env.LOKI_USER,
                  password: process.env.LOKI_API_KEY,
                },
                labels: {
                  service: process.env.OTEL_SERVICE_NAME || "observability-lab",
                  environment: process.env.OTEL_ENVIRONMENT || "development",
                  version: process.env.OTEL_SERVICE_VERSION || "1.0.0",
                },
              },
            },
          ]
        : []),
    ],
  },
});

// Middleware
app.use(express.json());

// Add request logging middleware with trace correlation and metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;

    // Get current trace context for correlation
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();

    // Metric attributes for better observability
    const metricAttributes = {
      "http.method": req.method,
      "http.route": req.route?.path || req.url,
      "http.status_code": res.statusCode,
    };

    // Increment total requests counter
    requestCounter.add(1, metricAttributes);

    // Increment error counter for error responses (status >= 400)
    if (res.statusCode >= 400) {
      errorCounter.add(1, metricAttributes);
    }

    logger.info(
      {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        // Add trace IDs for correlation with traces in Grafana
        ...(spanContext && {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
        }),
      },
      "HTTP Request"
    );
  });
  next();
});

// Get the tracer for manual instrumentation
const tracer = trace.getTracer(
  process.env.OTEL_SERVICE_NAME,
  process.env.OTEL_SERVICE_VERSION
);

// ========================================
// Helper Functions (simulated operations)
// ========================================

/**
 * Simulates a database query with a custom span
 */
async function simulateDbQuery(query) {
  const span = tracer.startSpan("db.query", {
    attributes: {
      "db.system": "postgresql",
      "db.statement": query,
      "db.operation": "SELECT",
    },
  });

  return new Promise((resolve) => {
    // Simulate query time
    const queryTime = Math.random() * 100 + 50;
    setTimeout(() => {
      span.setAttribute("db.rows_returned", Math.floor(Math.random() * 10) + 1);
      span.end();
      resolve({ success: true, rows: Math.floor(Math.random() * 10) + 1 });
    }, queryTime);
  });
}

/**
 * Simulates an external API call with a custom span
 */
async function callExternalApi(apiName) {
  const span = tracer.startSpan("http.client.request", {
    attributes: {
      "http.method": "GET",
      "http.url": `https://api.example.com/${apiName}`,
      "peer.service": apiName,
    },
  });

  return new Promise((resolve, reject) => {
    const callTime = Math.random() * 200 + 100;
    setTimeout(() => {
      // Randomly succeed or fail (90% success rate)
      if (Math.random() > 0.1) {
        span.setAttribute("http.status_code", 200);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        resolve({ success: true, data: { message: "API call successful" } });
      } else {
        span.setAttribute("http.status_code", 500);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "External API error",
        });
        span.recordException(new Error("External API returned 500"));
        span.end();
        reject(new Error("External API failed"));
      }
    }, callTime);
  });
}

/**
 * Simulates complex business logic with multiple spans
 */
async function processOrder(orderId) {
  const span = tracer.startSpan("process.order", {
    attributes: {
      "order.id": orderId,
      "order.type": "online",
    },
  });

  try {
    // Step 1: Validate order
    await simulateDbQuery(`SELECT * FROM orders WHERE id = ${orderId}`);

    // Step 2: Check inventory
    await simulateDbQuery(
      `SELECT * FROM inventory WHERE product_id IN (SELECT product_id FROM order_items WHERE order_id = ${orderId})`
    );

    // Step 3: Process payment (external API)
    await callExternalApi("payment-service");

    // Step 4: Update order status
    await simulateDbQuery(
      `UPDATE orders SET status = 'completed' WHERE id = ${orderId}`
    );

    span.setAttribute("order.status", "completed");
    span.setStatus({ code: SpanStatusCode.OK });
    return { success: true, orderId, status: "completed" };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// ========================================
// API Endpoints
// ========================================

/**
 * Health check endpoint (not traced to reduce noise)
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: process.env.OTEL_SERVICE_NAME,
  });
});

/**
 * Simple endpoint - demonstrates basic tracing
 */
app.get("/", (req, res) => {
  logger.info("Root endpoint called");
  res.json({
    message: "Welcome to the Observability Lab!",
    endpoints: [
      "GET / - This endpoint",
      "GET /health - Health check",
      "GET /api/users - List users",
      "GET /api/users/:id - Get user by ID",
      "POST /api/orders - Create an order",
      "GET /api/slow - Slow endpoint (for testing)",
      "GET /api/error - Error endpoint (for testing)",
      "GET /api/random - Random response time endpoint",
    ],
  });
});

/**
 * List users - demonstrates database simulation
 */
app.get("/api/users", async (req, res) => {
  try {
    const result = await simulateDbQuery("SELECT * FROM users LIMIT 10");

    const users = Array.from({ length: result.rows }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
    }));

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    logger.error(error, "Error fetching users");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get user by ID - demonstrates parameterized queries
 */
app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;

  // Add custom attribute to the current span
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute("user.id", userId);
  }

  try {
    await simulateDbQuery(`SELECT * FROM users WHERE id = ${userId}`);

    res.json({
      success: true,
      data: {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
      },
    });
  } catch (error) {
    logger.error(error, "Error fetching user");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create order - demonstrates complex multi-step operations with rate limiting
 */
app.post("/api/orders", async (req, res) => {
  const orderId = Math.floor(Math.random() * 10000);
  const now = Date.now();

  // Track this request in the sliding window
  orderRequestTimestamps.push(now);

  // Clean up old timestamps (older than 1 second)
  const oneSecondAgo = now - 1000;
  while (
    orderRequestTimestamps.length > 0 &&
    orderRequestTimestamps[0] < oneSecondAgo
  ) {
    orderRequestTimestamps.shift();
  }

  // Calculate current RPS
  const currentRPS = orderRequestTimestamps.length;

  // Calculate error probability based on RPS
  // RPS ≤ 10: 0% error rate
  // RPS = 20: 50% error rate
  // RPS ≥ 30: 100% error rate
  const errorProbability = Math.min(1, Math.max(0, (currentRPS - 10) / 20));

  // Add custom attributes to span
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute("order.rps", currentRPS);
    span.setAttribute("order.error_probability", errorProbability);
  }

  // Check if we should reject this request based on error probability
  if (Math.random() < errorProbability) {
    rateLimitCounter.add(1, {
      "http.route": "/api/orders",
    });

    logger.warn(
      {
        orderId,
        currentRPS,
        errorProbability,
        // Add trace IDs for correlation
        ...(span && {
          trace_id: span.spanContext().traceId,
          span_id: span.spanContext().spanId,
        }),
      },
      "Order rejected due to rate limiting"
    );

    if (span) {
      span.setAttribute("order.rate_limited", true);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Rate limit exceeded",
      });
    }

    return res.status(429).json({
      success: false,
      error: "Service temporarily unavailable",
      message: `Rate limit exceeded. Current load: ${currentRPS} req/s (threshold: 10 req/s)`,
      currentRPS,
      errorProbability: Math.round(errorProbability * 100) + "%",
    });
  }

  logger.info({ orderId, currentRPS }, "Creating new order");

  try {
    const result = await processOrder(orderId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error({ orderId, error: error.message }, "Order processing failed");
    res.status(500).json({
      success: false,
      error: "Failed to process order",
      message: error.message,
    });
  }
});

/**
 * Slow endpoint - useful for testing performance monitoring
 */
app.get("/api/slow", async (req, res) => {
  const delay = parseInt(req.query.delay) || 2000;

  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute("custom.delay_ms", delay);
  }

  logger.info({ delay }, "Slow endpoint called");

  await new Promise((resolve) => setTimeout(resolve, delay));

  res.json({
    message: "This was intentionally slow",
    delay: `${delay}ms`,
  });
});

/**
 * Error endpoint - demonstrates error tracking
 */
app.get("/api/error", (req, res) => {
  const span = trace.getActiveSpan();
  const error = new Error("This is a simulated error for testing");

  if (span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  }

  logger.error(error, "Simulated error occurred");

  res.status(500).json({
    error: "Internal server error",
    message: "This error was triggered intentionally for testing",
  });
});

/**
 * Random endpoint - generates random response times
 */
app.get("/api/random", async (req, res) => {
  const delay = Math.floor(Math.random() * 1000);

  await new Promise((resolve) => setTimeout(resolve, delay));

  res.json({
    message: "Random response time endpoint",
    responseTime: `${delay}ms`,
    randomNumber: Math.floor(Math.random() * 100),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err, "Unhandled error");

  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the server
app.listen(PORT, () => {
  const lokiConfigured =
    process.env.LOKI_HOST && process.env.LOKI_USER && process.env.LOKI_API_KEY;

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 Observability Lab Server Running");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   📡 Server listening on http://localhost:${PORT}`);
  console.log(
    `   🔍 Service: ${process.env.OTEL_SERVICE_NAME || "observability-lab"}`
  );
  console.log(`   📊 Traces → Grafana Cloud`);
  console.log(`   📈 Metrics → Grafana Cloud`);
  console.log(
    `   📝 Logs → ${
      lokiConfigured
        ? "Grafana Cloud (Loki)"
        : "Console only (Loki not configured)"
    }`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Available endpoints:");
  console.log("   GET  /              - Welcome message");
  console.log("   GET  /health        - Health check");
  console.log("   GET  /api/users     - List users");
  console.log("   GET  /api/users/:id - Get user by ID");
  console.log("   POST /api/orders    - Create an order");
  console.log("   GET  /api/slow      - Slow endpoint");
  console.log("   GET  /api/error     - Error endpoint");
  console.log("   GET  /api/random    - Random response time");
  console.log("");

  if (!lokiConfigured) {
    console.log(
      "💡 Tip: Configure LOKI_HOST, LOKI_USER, and LOKI_API_KEY in .env to ship logs to Grafana Cloud"
    );
    console.log("");
  }
});
