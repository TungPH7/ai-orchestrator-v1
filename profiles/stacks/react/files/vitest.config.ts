import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // lcovonly writes coverage/lcov.info, which the CI of ai-orchestrator reads.
      reporter: ['lcovonly', 'text-summary'],
      // Every source file counts, even one that no test imports yet; main.tsx only mounts the app.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
