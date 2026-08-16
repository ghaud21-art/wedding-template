import { defineConfig } from 'vite';

// GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로에 배포되므로
// 상대 경로 base를 사용한다. 커스텀 도메인을 연결해도 그대로 동작한다.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',
    outDir: 'dist',
  },
});
