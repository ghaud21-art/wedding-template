// ─────────────────────────────────────────────────────────────
// 구글 연동 — GIS(Google Identity Services) 로그인 + Sheets REST
//
// 편집자: OAuth 토큰으로 본인 시트 생성/읽기/쓰기
// 하객:   로그인 없음 — API 키 + "링크 공개" 시트를 읽기 전용 조회
// ─────────────────────────────────────────────────────────────
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, OAUTH_SCOPE, GAS_OWNER_EMAIL } from '../config.js';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_KEY = 'inviteStudio.token';

export const isGoogleConfigured = () => !GOOGLE_CLIENT_ID.startsWith('YOUR_');
export const isApiKeyConfigured = () => !GOOGLE_API_KEY.startsWith('YOUR_');

/* ───────── GIS 스크립트 로드 ───────── */

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('구글 로그인 스크립트를 불러오지 못했어요. 네트워크를 확인해 주세요.'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/* ───────── 액세스 토큰 ───────── */

function storedToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    if (t && t.exp > Date.now() + 60_000) return t.token;
  } catch { /* 무시 */ }
  return null;
}

/** 유효한 액세스 토큰 확보. interactive=true면 필요 시 로그인 팝업. */
export async function ensureToken(interactive = false) {
  const cached = storedToken();
  if (cached) return cached;
  if (!interactive) throw new Error('AUTH_REQUIRED');

  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: OAUTH_SCOPE,
      callback: (res) => {
        if (res.error) { reject(new Error('로그인이 취소되었어요.')); return; }
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
          token: res.access_token,
          exp: Date.now() + (Number(res.expires_in) || 3600) * 1000,
        }));
        resolve(res.access_token);
      },
      error_callback: () => reject(new Error('로그인 창이 닫혔어요. 다시 시도해 주세요.')),
    });
    client.requestAccessToken();
  });
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/* ───────── 인증 요청 공통 (401 시 재로그인 1회) ───────── */

async function authedFetch(url, options = {}) {
  let token = await ensureToken(true);
  const run = (t) => fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let res = await run(token);
  if (res.status === 401) {
    clearToken();
    token = await ensureToken(true);
    res = await run(token);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error?.message || `요청 실패 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* ───────── 시트 생성/읽기/쓰기 (편집자) ───────── */

/** 청첩장 저장소 시트 생성: config/guestbook/rsvp 탭 + 헤더 + 초기 설정 + 링크 공개 */
export async function createInvitationSheet(initialConfig) {
  const created = await authedFetch(SHEETS, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: '모바일 청첩장 데이터' },
      sheets: [
        { properties: { title: 'config' } },
        { properties: { title: 'guestbook' } },
        { properties: { title: 'rsvp' } },
      ],
    }),
  });
  const sheetId = created.spreadsheetId;

  await authedFetch(`${SHEETS}/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: 'config!A1', values: [[JSON.stringify(initialConfig)]] },
        { range: 'guestbook!A1:C1', values: [['타임스탬프', '이름', '메시지']] },
        { range: 'rsvp!A1:E1', values: [['타임스탬프', '이름', '참석여부', '인원', '메모']] },
      ],
    }),
  });

  // 하객 뷰어가 읽을 수 있도록 "링크가 있는 모든 사용자 보기" 권한 부여
  await authedFetch(`https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  // 하객의 방명록/RSVP는 GAS(배포자 계정)가 대신 기록하므로 편집 권한 부여
  if (GAS_OWNER_EMAIL) {
    await authedFetch(
      `https://www.googleapis.com/drive/v3/files/${sheetId}/permissions?sendNotificationEmail=false`,
      {
        method: 'POST',
        body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: GAS_OWNER_EMAIL }),
      },
    ).catch(() => { /* 권한 부여 실패 시에도 청첩장 자체는 동작 (방명록 기록만 제한) */ });
  }

  return sheetId;
}

/** (편집자) 시트에서 설정 JSON 읽기 */
export async function loadConfigFromSheet(sheetId) {
  const res = await authedFetch(`${SHEETS}/${sheetId}/values/config!A1`);
  const raw = res.values?.[0]?.[0];
  return raw ? JSON.parse(raw) : null;
}

/** (편집자) 설정 JSON 저장 */
export async function saveConfigToSheet(sheetId, config) {
  await authedFetch(`${SHEETS}/${sheetId}/values/config!A1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[JSON.stringify(config)]] }),
  });
}

/* ───────── 공개 읽기 (하객 뷰어, 로그인 없음) ───────── */

async function publicValues(sheetId, range) {
  const url = `${SHEETS}/${sheetId}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(res.status === 403 || res.status === 404
      ? '청첩장을 찾을 수 없거나 아직 공개되지 않았어요.'
      : `불러오기 실패 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return json.values || [];
}

/** (하객) 설정 JSON 읽기 */
export async function loadPublicConfig(sheetId) {
  const values = await publicValues(sheetId, 'config!A1');
  const raw = values?.[0]?.[0];
  if (!raw) throw new Error('아직 작성 중인 청첩장이에요.');
  return JSON.parse(raw);
}

/** (하객) 방명록 최근 목록 — 최신순 최대 limit개 */
export async function loadPublicGuestbook(sheetId, limit = 30) {
  try {
    const rows = await publicValues(sheetId, 'guestbook!A2:C500');
    return rows
      .filter((r) => r[1] && r[2])
      .map(([ts, name, message]) => ({ timestamp: shortDate(ts), name, message }))
      .reverse()
      .slice(0, limit);
  } catch {
    return []; // 방명록을 못 읽어도 청첩장은 보여준다
  }
}

function shortDate(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? String(ts || '') : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
