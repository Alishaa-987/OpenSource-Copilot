import { Injectable } from "@nestjs/common";

type Labels = Record<string, string | number>;
const BUCKETS = [10, 50, 100, 250, 500, 1000, 2500, 5000];

function normalizePath(path: string): string {
  const value = (path.split("?")[0] || "/").replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id").replace(/\/\d+(?=\/|$)/g, "/:id");
  return value.slice(0, 160) || "/";
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").slice(0, 160);
}

function metricKey(name: string, labels: Labels): string {
  const labelText = Object.keys(labels).sort().map((label) => label + "=" + String(labels[label])).join(",");
  return name + "|" + labelText;
}

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();

  recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const labels = { method: method.toUpperCase(), route: normalizePath(path), status: String(statusCode) };
    this.increment("http_requests_total", labels);
    this.increment("http_request_duration_ms_sum", labels, durationMs);
    this.increment("http_request_duration_ms_count", labels);
    for (const bucket of BUCKETS) {
      if (durationMs <= bucket) this.increment("http_request_duration_ms_bucket", { ...labels, le: String(bucket) });
    }
    this.increment("http_request_duration_ms_bucket", { ...labels, le: "+Inf" });
  }

  increment(name: string, labels: Labels = {}, value = 1): void {
    const key = metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  renderPrometheus(): string {
    const lines = ["# HELP http_requests_total Total HTTP requests handled.", "# TYPE http_requests_total counter", "# HELP http_request_duration_ms HTTP request latency metrics.", "# TYPE http_request_duration_ms_bucket counter"];
    for (const [key, value] of this.counters) {
      const separator = key.indexOf("|");
      const name = separator >= 0 ? key.slice(0, separator) : key;
      const raw = separator >= 0 ? key.slice(separator + 1) : "";
      const labels = raw ? raw.split(",").filter(Boolean).map((entry) => { const parts = entry.split("="); return parts[0] + "=\"" + escapeLabel(parts.slice(1).join("=")) + "\""; }).join(",") : "";
      lines.push(name + (labels ? "{" + labels + "}" : "") + " " + value);
    }
    return lines.join("\n") + "\n";
  }
}
