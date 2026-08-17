import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  it("records normalized request counters and latency buckets", () => {
    const service = new MetricsService();
    service.recordHttpRequest("GET", "/api/v1/repositories/123/issues/456", 200, 42);
    const output = service.renderPrometheus();
    expect(output).toContain("http_requests_total");
    expect(output).toContain("route=\"/api/v1/repositories/:id/issues/:id\"");
    expect(output).toContain("le=\"50\"");
    expect(output).toContain("le=\"+Inf\"");
  });
});
