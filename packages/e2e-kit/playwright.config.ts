import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const kitDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(kitDir, '../..');

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';

/**
 * 기준선 스크린샷을 리팩터링 이전 앱에서 만들 때는 그 서버를 직접 띄운 뒤
 * E2E_SKIP_WEBSERVER=1 E2E_BASE_URL=http://127.0.0.1:5173 로 실행한다.
 * 웹 서버 cwd는 이 저장소 루트라, main 워크트리에는 E2E_WEB_COMMAND를 쓰지 않는다.
 */
export default defineConfig({
  testDir: path.join(repoRoot, 'apps/volleyball/e2e'),
  outputDir: path.join(repoRoot, 'apps/volleyball/e2e/test-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 180_000,
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: process.env.E2E_WEB_COMMAND || 'npm --prefix apps/volleyball run dev -- --host 127.0.0.1 --port 5173 --strictPort',
        cwd: repoRoot,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 } },
    },
    {
      name: 'tablet',
      testMatch: /screenshots\.spec\.ts/,
      use: { viewport: { width: 820, height: 1180 } },
    },
  ],
});
