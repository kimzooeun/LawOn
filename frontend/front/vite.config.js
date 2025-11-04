import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // 프로젝트 루트
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: 'index.html', 
        chat: 'chat.html',
        mypage: 'mypage.html',
        oauth2_success: 'oauth2_success.html',
      },
    },
  },
  server: {
    host: "0.0.0.0", // 외부(도커 밖)에서도 접근 가능하게 함
    port: 3000,
    allowedHosts: ["host.docker.internal", "localhost"],
    proxy: {
      '/oauth2/authorization': {
        target: 'http://backend:8080',    // 같은 네트워크에 있는 다른 컨테이너로 요청이라서 서비스 이름으로 해도 통하는 거임 
        changeOrigin: true,
      },
      '/api': {
        target: 'http://finalproject-backend:8080',   //  브라우저에서 프론트엔드 컨테이너에서, 백엔드 컨테이너로 쏘는 거임 (도커 네트워크 기중)
        changeOrigin: true,
      },
    },
    strictPort: true,
    watch: {
      usePolling: true, // WSL2 / Docker용 변경 감지
    },
  },
});



