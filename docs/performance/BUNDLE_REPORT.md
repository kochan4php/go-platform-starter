# Bundle audit

Production build measured on 2026-08-28 with Vite 5.4.21 and ES2022.

The comparison ES2020 build was also executed and is not viable: federation's
shared React/TanStack chunks require top-level `await`, which esbuild correctly
rejects for ES2020. ES2022 is therefore a compatibility requirement, not only a
size preference.

| App / chunk | Raw | gzip |
| --- | ---: | ---: |
| Host total JavaScript | 297 KB | budget 435 KB |
| Host main | 287.33 KB | 89.30 KB |
| Users page exposed chunk | 194.52 KB | 69.66 KB |
| Roles page exposed chunk | 60.26 KB | 18.44 KB |
| Auth shared UI | 23.71 KB | 8.86 KB |
| Auth login page | 5.43 KB | 2.40 KB |

The Vite manifest and `scripts/check-budget.mjs` provide the needed committed,
deterministic chunk inventory without adding `rollup-plugin-visualizer`. React,
ReactDOM, and TanStack Query are federation shared chunks; route pages are
separate exposed chunks. Phosphor imports were retained because Rollup
tree-shakes their ESM exports and a second SVG-sprite build path would duplicate
the icon source of truth.

Hot-path Go benchmarks from the same machine:

| Benchmark | ns/op | B/op | allocs/op |
| --- | ---: | ---: | ---: |
| `BenchmarkWriteJSON-20` | 831.4 | 1,073 | 11 |
| `BenchmarkListCursor-20` | 354.8 | 376 | 9 |

The JSON result does not justify a retained response-writer pool: most bytes are
the recorder/response itself, while pooling risks keeping user-sized buffers
alive. Re-run the checked-in benchmarks and bundle gate after dependency or UI
changes.
