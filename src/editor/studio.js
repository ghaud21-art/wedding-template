// 스튜디오 진입 — 랜딩/온보딩(4단계)에서 로그인·시트 연결 후 편집기로 이어진다.
// 지금은 로컬 상태로 편집기를 바로 연다.
import '../styles/editor.css';
import { startEditor } from './editor.js';

export function startStudio(app) {
  startEditor(app);
}
