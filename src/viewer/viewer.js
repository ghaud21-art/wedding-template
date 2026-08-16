// ─────────────────────────────────────────────────────────────
// 하객 뷰어 — ?id=시트ID 로 접속. 편집 UI는 전혀 노출되지 않는다.
// 지금은 샘플 설정으로 렌더링하고, 4단계에서 시트 로드로 교체한다.
//   ?id=sample → 항상 샘플 청첩장 (데모용으로 유지)
// ─────────────────────────────────────────────────────────────
import { renderInvitation } from '../render/blocks.js';
import { applyDesign } from '../render/design.js';
import { normalizeConfig } from '../lib/defaultConfig.js';
import { sampleConfig, sampleGuestbook } from '../lib/sample.js';
import { toast } from '../lib/toast.js';

let cleanup = null;

export function startViewer(app, sheetId) {
  document.body.classList.add('viewer-page');
  app.innerHTML = '<div class="viewer-shell"><div class="inv" id="inv"></div></div>';
  const invEl = document.getElementById('inv');

  // customCss 주입용 style 요소
  const styleEl = document.createElement('style');
  styleEl.dataset.role = 'custom-css';
  document.head.appendChild(styleEl);

  // TODO(4단계): sheetId로 config!A1을 읽어온다. 지금은 샘플/드래프트.
  let config;
  if (sheetId === 'draft') {
    // 편집기 "미리보기 새 창" — localStorage의 편집 중 초안을 보여준다
    try {
      config = normalizeConfig(JSON.parse(localStorage.getItem('inviteStudio.draft')));
    } catch { /* 초안이 없으면 샘플로 */ }
  }
  config = config || normalizeConfig(sampleConfig());
  const guestbook = sampleGuestbook();

  render(invEl, styleEl, config, guestbook);
}

function render(invEl, styleEl, config, guestbook) {
  cleanup?.();
  applyDesign(invEl, config.design, styleEl);

  const names = [config.couple.groom.name, config.couple.bride.name].filter(Boolean);
  if (names.length === 2) document.title = `${names[0]} & ${names[1]} 결혼합니다`;

  cleanup = renderInvitation(invEl, config, {
    guestbook,
    toast,
    // onRsvp / onGuestbook은 5단계(GAS 프록시)에서 연결
  });
}
