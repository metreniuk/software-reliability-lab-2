import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

// Test configuration
export const options = {
  stages: [
    { duration: "20s", target: 20 }, // Ramp up to 20 users over 20s
    { duration: "30s", target: 20 }, // Sustain 20 users for 30s
    { duration: "10s", target: 0 }, // Ramp down to 0 users over 10s
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 95% of requests should be below 5s
    errors: ["rate<0.5"], // Error rate should be below 50%
  },
};

export default function () {
  const url = "http://localhost:3000/api/orders";

  const payload = JSON.stringify({
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(url, payload, params);

  // Check if request was successful
  const success = check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "status is not 503": (r) => r.status !== 503,
  });

  // Track error rate
  errorRate.add(!success);

  // Small delay between requests
  sleep(0.5);
}
