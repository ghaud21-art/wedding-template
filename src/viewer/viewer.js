// ─────────────────────────────────────────────────────────────
// 하객 뷰어 — ?id=시트ID 로 접속. 편집 UI는 전혀 노출되지 않는다.
//   ?id=sample → 데모용 샘플 청첩장
//   ?id=draft  → 편집기 "미리보기 새 창" (localStorage 초안)
//   그 외      → 공개 시트에서 설정 JSON + 방명록을 읽어 렌더링
// ─────────────────────────────────────────────────────────────
import { renderInvitation } from '../render/blocks.js';
import { applyDesign } from '../render/design.js';
import { normalizeConfig } from '../lib/defaultConfig.js';
import { sampleConfig, sampleGuestbook } from '../lib/sample.js';
import { toast } from '../lib/toast.js';
import { isApiKeyConfigured, loadPublicConfig, loadPublicGuestbook } from '../lib/google.js';
import { isGasConfigured, submitGuestbook, submitRsvp } from '../lib/gas.js';

let cleanup = null;

export async function startViewer(app, sheetId) {
  document.body.classList.add('viewer-page');

  let config = null;
  let guestbook = [];

  if (sheetId === 'sample') {
    config = normalizeConfig(sampleConfig());
    guestbook = sampleGuestbook();
  } else if (sheetId === 'draft') {
    // 편집기에서 연 미리보기 — 편집 중 초안을 그대로 보여준다
    try {
      config = normalizeConfig(JSON.parse(localStorage.getItem('inviteStudio.draft')));
    } catch { /* 초안 없으면 샘플 */ }
    config = config || normalizeConfig(sampleConfig());
    guestbook = sampleGuestbook();
  } else {
    // 실제 하객 접속: 공개 시트 읽기
    if (!isApiKeyConfigured()) {
      showNotice(app, '설정이 아직 끝나지 않았어요', 'src/config.js에 Sheets API 키를 넣으면 하객 링크가 열려요. (README 참고)');
      return;
    }
    showNotice(app, '청첩장을 여는 중이에요…', '', true);
    try {
      const [rawConfig, gb] = await Promise.all([
        loadPublicConfig(sheetId),
        loadPublicGuestbook(sheetId),
      ]);
      config = normalizeConfig(rawConfig);
      guestbook = gb;
    } catch (e) {
      showNotice(app, '청첩장을 불러오지 못했어요', e.message || '링크를 다시 확인해 주세요.');
      return;
    }
  }

  app.innerHTML = '<div class="viewer-shell"><div class="inv" id="inv"></div></div>';
  const invEl = document.getElementById('inv');

  // customCss 주입용 style 요소
  let styleEl = document.querySelector('style[data-role="custom-css"]');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.dataset.role = 'custom-css';
    document.head.appendChild(styleEl);
  }

  cleanup?.();
  applyDesign(invEl, config.design, styleEl);

  const names = [config.couple.groom.name, config.couple.bride.name].filter(Boolean);
  if (names.length === 2) document.title = `${names[0]} & ${names[1]} 결혼합니다`;

  // 실제 하객 접속 + GAS 설정 완료 시에만 쓰기 핸들러 연결
  const live = sheetId !== 'sample' && sheetId !== 'draft' && isGasConfigured();
  cleanup = renderInvitation(invEl, config, {
    guestbook,
    toast,
    onRsvp: live ? (payload) => submitRsvp(sheetId, payload) : null,
    onGuestbook: live ? (payload) => submitGuestbook(sheetId, payload) : null,
  });
}

function showNotice(app, title, detail, loading = false) {
  app.innerHTML = `
    <div class="viewer-shell">
      <div class="viewer-notice">
        ${loading ? '<div class="spinner"></div>' : ''}
        <b>${title}</b>
        ${detail ? `<span>${detail}</span>` : ''}
      </div>
    </div>`;
}
