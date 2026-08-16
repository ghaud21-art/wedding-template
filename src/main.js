// ─────────────────────────────────────────────────────────────
// 엔트리 — 접속 모드에 따라 화면을 나눈다.
//   ?id=시트ID  → 하객 뷰어 (편집 UI 없음)
//   그 외      → 랜딩 → 온보딩 → 편집기
// ─────────────────────────────────────────────────────────────
import './styles/base.css';
import './styles/invite.css';
import { toast } from './lib/toast.js';

const params = new URLSearchParams(location.search);
const sheetId = (params.get('id') || '').trim();

const app = document.getElementById('app');

if (sheetId) {
  // 하객 뷰어 (2단계에서 구현)
  import('./viewer/viewer.js').then(({ startViewer }) => startViewer(app, sheetId));
} else {
  // 랜딩/편집기 (3단계에서 구현)
  import('./editor/studio.js').then(({ startStudio }) => startStudio(app));
}

export { toast };
