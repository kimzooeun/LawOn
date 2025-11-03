import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // 프로젝트 루트
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'main.html'),
        chat: resolve(__dirname, 'chat.html'),
        mypage: resolve(__dirname, 'mypage.html'),
        oauth2_success: resolve(__dirname, 'oauth2_success.html'),
      },
    },
  },
  server: {
    host: "0.0.0.0", // 외부(도커 밖)에서도 접근 가능하게 함
    port: 3000,
    allowedHosts: ["host.docker.internal", "localhost"],
    proxy: {
      '/oauth2/authorization': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
    },
    strictPort: true,
    watch: {
      usePolling: true, // WSL2 / Docker용 변경 감지
    },
  },
});



