// MSW mock mode for offline dev (PLAN item 66). Enabled only when
// VITE_API_MOCK=on — production builds never ship the worker.
export {};

if (import.meta.env.VITE_API_MOCK === "on") {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}
