type VitalName = "LCP" | "CLS" | "INP";

function rating(name: VitalName, value: number) {
  const limits = name === "CLS" ? [0.1, 0.25] : name === "LCP" ? [2500, 4000] : [200, 500];
  return value <= limits[0] ? "good" : value <= limits[1] ? "needs-improvement" : "poor";
}

function report(name: VitalName, value: number) {
  const body = JSON.stringify({ name, value, rating: rating(name, value) });
  if (!navigator.sendBeacon?.("/telemetry/vitals", new Blob([body], { type: "application/json" }))) {
    void fetch("/telemetry/vitals", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  }
}

export function observeWebVitals() {
  if (!("PerformanceObserver" in window)) return;
  let lcp = 0;
  let cls = 0;
  let inp = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) inp = Math.max(inp, entry.duration);
    }).observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  } catch {
    return;
  }
  addEventListener(
    "pagehide",
    () => {
      if (lcp) report("LCP", lcp);
      report("CLS", cls);
      if (inp) report("INP", inp);
    },
    { once: true },
  );
}
