import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".", // 프로젝트 루트
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),  // ← src 절대경로 지정!
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: "index.html",
        chat: "chat/index.html",
        oauth2_success: "oauth2_success/index.html",
        login_fail:"login_fail/index.html",
        lawyer:"lawyer/index.html",
        // 어드민 페이지들 추가
        "admin/login": "admin/login/index.html",
        "admin/index": "admin/index.html",
        "admin/lawyers": "admin/lawyers/index.html",
        "admin/user": "admin/user/index.html",
        "admin/settings": "admin/settings/index.html",
        "admin/logs": "admin/logs/index.html",
      },
    },
  },

  server: {
    host: "0.0.0.0", // 외부(도커 밖)에서도 접근 가능하게 함
    port: 3000,
    allowedHosts: ["host.docker.internal", "localhost"],
    proxy: {
      "/oauth2/authorization": {
        target: "http://backend:8080", // 같은 네트워크에 있는 다른 컨테이너로 요청이라서 서비스 이름으로 해도 통하는 거임
        changeOrigin: true,
      },
      "/api": { target: "http://backend:8080" },
      "/simple-chat": {target: "http://fastapi:8000"},
    },
    strictPort: true,
    watch: {
      usePolling: true, // WSL2 / Docker용 변경 감지
    },
  },
});
