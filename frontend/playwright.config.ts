import { defineConfig } from '@playwright/test'

const apiPort = process.env.E2E_API_PORT || '8001'
const frontendPort = process.env.E2E_FRONTEND_PORT || '5174'
const apiURL = `http://127.0.0.1:${apiPort}`
const frontendURL = `http://127.0.0.1:${frontendPort}`

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  use: { baseURL: frontendURL, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: [
    {
      command: process.platform === 'win32' ? '.venv\\Scripts\\python.exe tests/serve_e2e.py' : 'python tests/serve_e2e.py',
      cwd: '../backend', url: `${apiURL}/api/health`, reuseExistingServer: false,
    },
    {
      command: process.env.E2E_PREVIEW === 'true'
        ? `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${frontendPort}`
        : `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${frontendPort}`,
      url: frontendURL, env: { API_PROXY_TARGET: apiURL }, reuseExistingServer: false,
    },
  ],
})
