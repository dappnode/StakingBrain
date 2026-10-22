import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // depending on your application, base can also be "/"
  build: {
    outDir: "build"
  },
  base: "/",
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  server: {
    // this ensures that the browser opens upon server start
    //open: false,
    // this sets a default port to 3000
    //port: 3000,
    //strictPort: true,
    // this sets the server to be accessible externally
    host: true,
    watch: {
      usePolling: true
    },
    proxy: {
      "/socket.io/": {
        target: "ws://localhost:80",
        //changeOrigin: true,
        //secure: false,
        ws: true
      }
    }
  }
});
