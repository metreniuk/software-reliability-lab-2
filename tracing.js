/**
 * OpenTelemetry Instrumentation Setup
 *
 * This file initializes the OpenTelemetry SDK with:
 * - Automatic instrumentation for Node.js libraries (Express, HTTP, etc.)
 * - OTLP exporters for traces and metrics to Grafana Cloud
 * - Resource attributes for service identification
 *
 * Load this file BEFORE your application code using: node -r ./tracing.js server.js
 */

require("dotenv").config();
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-http");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { Resource } = require("@opentelemetry/resources");
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} = require("@opentelemetry/semantic-conventions");

// Validate required environment variables
const requiredEnvVars = [
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "OTEL_SERVICE_NAME",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error(
    "\nPlease check your .env file and ensure all required variables are set."
  );
  console.error("See .env.example for reference.\n");
  process.exit(1);
}

// Parse OTLP headers from environment variable
// Format: "Authorization=Basic xxx,Other-Header=value"
const headersString = process.env.OTEL_EXPORTER_OTLP_HEADERS || "";
const headers = {};
headersString.split(",").forEach((pair) => {
  const [key, value] = pair.split("=");
  if (key && value) {
    headers[key.trim()] = value.trim();
  }
});

console.log("🔧 Initializing OpenTelemetry...");
console.log(`   Service: ${process.env.OTEL_SERVICE_NAME}`);
console.log(`   Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);

// Configure the trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  headers: headers,
});

// Configure the metrics exporter
const metricExporter = new OTLPMetricExporter({
  url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
  headers: headers,
});

// Create a metric reader that exports metrics every 60 seconds
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 60000, // Export every 60 seconds
});

// Configure resource attributes
const resource = Resource.default().merge(
  new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "1.0.0",
    "deployment.environment": process.env.OTEL_ENVIRONMENT || "development",
  })
);

// Initialize the OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: traceExporter,
  metricReader: metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize automatic instrumentation
      "@opentelemetry/instrumentation-fs": {
        enabled: false, // Disable file system instrumentation (too noisy)
      },
      "@opentelemetry/instrumentation-http": {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // Optionally ignore health check endpoints
          return req.url === "/health";
        },
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
try {
  sdk.start();
  console.log("✅ OpenTelemetry initialized successfully");
  console.log("   Traces and metrics will be sent to Grafana Cloud\n");
} catch (error) {
  console.error("❌ Error initializing OpenTelemetry:", error);
  process.exit(1);
}

// Gracefully shutdown on process termination
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => {
      console.log("OpenTelemetry SDK shut down successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error shutting down OpenTelemetry SDK:", error);
      process.exit(1);
    });
});
