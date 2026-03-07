import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: parseInt(env.WEB_PORT || "5173"),
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://localhost:${env.SERVER_PORT || 8789}`,
          changeOrigin: true,
        },
      },
    },
  };
});
