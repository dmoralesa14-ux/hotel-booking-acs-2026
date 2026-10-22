import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://hotel-backend:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/main.jsx", "src/firebase.js", "src/**/*.test.{js,jsx}"],
    },
  },
});
