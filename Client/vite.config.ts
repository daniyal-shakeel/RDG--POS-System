import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    "allowedHosts": ["2c055f750120.ngrok-free.app"]
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
