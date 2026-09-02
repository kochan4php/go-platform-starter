import { mockServer } from "./server.ts";

mockServer.listen({ onUnhandledRequest: "bypass" });
console.log("MSW process-local Node interceptor active; Ctrl+C stops it");

const runtime = globalThis as typeof globalThis & {
  process: { on(signal: "SIGINT" | "SIGTERM", listener: () => void): void; exit(code: number): never };
};
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  runtime.process.on(signal, () => {
    mockServer.close();
    runtime.process.exit(0);
  });
}

await new Promise(() => undefined);
