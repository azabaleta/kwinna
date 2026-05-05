import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env["VITE_API_URL"] ?? "http://localhost:3001"
      ),
      "import.meta.env.TAURI_PLATFORM": JSON.stringify(
        process.env["TAURI_ENV_PLATFORM"] ?? "desktop"
      ),
    },

    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
