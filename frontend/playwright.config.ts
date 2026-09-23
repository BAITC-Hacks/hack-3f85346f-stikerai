import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    {
      command: process.platform === 'win32' ? '.venv\\Scripts\\python.exe tests/serve_e2e.py' : 'python tests/serve_e2e.py',
      cwd: '../backend', url: 'http://127.0.0.1:8001/api/health', reuseExistingServer: false,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174', env: { API_PROXY_TARGET: 'http://127.0.0.1:8001' }, reuseExistingServer: false,
    },
  ],
})
