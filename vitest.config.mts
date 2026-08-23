import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['__tests__/**/*.spec.ts'],
        globalSetup: ['__tests__/setup/global-setup.mts'],
        setupFiles: ['__tests__/setup/test-env.mts'],
        testTimeout: 60_000,
        hookTimeout: 120_000,
        // singleFork: the shared testcontainer + one migration pass must not be raced
        poolOptions: {
            forks: { singleFork: true },
        },
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/database/scripts/**', 'src/database/migrations/**'],
            reporter: ['text', 'lcov'],
            // Floors sit slightly below current numbers: they gate regressions,
            // not the existing suite.
            thresholds: {
                statements: 75,
                branches: 60,
                functions: 80,
                lines: 75,
            },
        },
    },
});
