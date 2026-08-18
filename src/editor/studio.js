// ─────────────────────────────────────────────────────────────
// 스튜디오 진입 — 랜딩 → 구글 로그인 → 시트 준비(온보딩) → 편집기
//
// 로그인한 사람마다 "자기 구글 드라이브"에 시트가 만들어지고,
// 편집 내용은 전부 그 시트에 저장된다. (친구가 로그인하면 친구의
// 시트가 새로 생기고, 서로의 청첩장에는 접근할 수 없다)
//
// 클라이언트 ID가 아직 없으면(개발 중) 데모 모드로 로컬 편집만 제공.
// ─────────────────────────────────────────────────────────────
import '../styles/editor.css';
import { startEditor } from './editor.js';
import { toast } from '../lib/toast.js';
import { defaultConfig, normalizeConfig } from '../lib/defaultConfig.js';
import {
  isGoogleConfigured, ensureToken, createInvitationSheet, loadConfigFromSheet, saveConfigToSheet,
} from '../lib/google.js';

const SHEET_KEY = 'inviteStudio.sheetId';

const I = {
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF3E63" stroke-width="1.8"><circle cx="9.5" cy="12" r="5.5"/><circle cx="14.5" cy="12" r="5.5"/></svg>',
  google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.1 3.7-8.6z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-7-5.1L1.2 17.2C3.2 21.2 7.3 24 12 24z"/><path fill="#FBBC05" d="M5 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.2 6.8C.4 8.4 0 10.1 0 12s.4 3.6 1.2 5.2L5 14.3z"/><path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.2 2.8 1.2 6.8L5 9.7c1-3 3.8-5 7-5z"/></svg>',
};

export function startStudio(app) {
  renderLanding(app);
}

/* ───────── 랜딩 ───────── */

function renderLanding(app) {
  const configured = isGoogleConfigured();
  app.innerHTML = `
    <div class="landing">
      <div class="landing-card">
        <div class="logo logo-lg">${I.rings}</div>
        <h1>모바일 청첩장,<br>내 데이터로 직접 만들기</h1>
        <p class="landing-desc">
          디자인은 AI와 대화하며 자유롭게, 데이터는 전부
          <b>내 구글시트</b>에만 저장돼요.<br>서버도, 회원가입도, 비용도 없어요.
        </p>
        ${configured ? `
          <button class="btn btn-primary btn-lg" id="btnLogin">${I.google}구글로 시작하기</button>
          <button class="btn btn-ghost btn-lg" id="btnDemo">로그인 없이 체험하기</button>
          <p class="landing-note">로그인하면 회원님의 구글 드라이브에 청첩장 데이터 시트가 하나 만들어져요.<br>친구도 자기 계정으로 로그인하면 자기만의 청첩장을 만들 수 있어요.</p>
        ` : `
          <span class="chip chip-warn" style="margin-bottom:14px">데모 모드</span>
          <button class="btn btn-primary btn-lg" id="btnDemo">체험하기 (로컬 저장)</button>
          <p class="landing-note">구글 로그인을 켜려면 <code>src/config.js</code>에 OAuth 클라이언트 ID를 넣어주세요. 발급 방법은 README에 있어요.</p>
        `}
      </div>
    </div>`;

  document.getElementById('btnDemo')?.addEventListener('click', () => startEditor(app));
  document.getElementById('btnLogin')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnLogin');
    btn.disabled = true;
    try {
      await ensureToken(true);
      await onboard(app);
    } catch (e) {
      toast(e.message || '로그인에 실패했어요');
      btn.disabled = false;
    }
  });
}

/* ───────── 온보딩: 시트 확보 → 편집기 ───────── */

async function onboard(app) {
  let sheetId = localStorage.getItem(SHEET_KEY);

  // 기존 시트가 있으면 불러오기
  if (sheetId) {
    showLoading(app, '청첩장을 불러오는 중이에요…');
    try {
      const raw = await loadConfigFromSheet(sheetId);
      openEditor(app, sheetId, normalizeConfig(raw));
      return;
    } catch (e) {
      // 시트가 삭제되었거나 다른 계정으로 로그인한 경우 → 새로 만든다
      if (e.status === 403 || e.status === 404) {
        localStorage.removeItem(SHEET_KEY);
        sheetId = null;
      } else {
        showError(app, '청첩장을 불러오지 못했어요', e.message);
        return;
      }
    }
  }

  // 새 시트 생성
  showLoading(app, '내 드라이브에 청첩장 시트를 만들고 있어요…', '처음 한 번만 진행돼요 (몇 초 걸려요)');
  try {
    const newId = await createInvitationSheet(defaultConfig());
    localStorage.setItem(SHEET_KEY, newId);
    toast('청첩장 시트가 만들어졌어요. 이제 내용을 채워볼까요?');
    openEditor(app, newId, normalizeConfig(null));
  } catch (e) {
    showError(app, '시트를 만들지 못했어요', e.message);
  }
}

function openEditor(app, sheetId, config) {
  startEditor(app, {
    sheetId,
    config,
    saveRemote: (cfg) => saveConfigToSheet(sheetId, cfg),
  });
}

/* ───────── 로딩/에러 화면 ───────── */

function showLoading(app, title, sub = '') {
  app.innerHTML = `
    <div class="landing">
      <div class="landing-card">
        <div class="spinner"></div>
        <p class="loading-title">${title}</p>
        ${sub ? `<p class="landing-note">${sub}</p>` : ''}
      </div>
    </div>`;
}

function showError(app, title, detail) {
  app.innerHTML = `
    <div class="landing">
      <div class="landing-card">
        <p class="loading-title">${title}</p>
        <p class="landing-note">${detail || ''}</p>
        <button class="btn btn-primary btn-lg" id="btnRetry">다시 시도</button>
      </div>
    </div>`;
  document.getElementById('btnRetry').addEventListener('click', () => renderLanding(app));
}
