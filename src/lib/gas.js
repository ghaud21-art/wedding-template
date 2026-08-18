// ─────────────────────────────────────────────────────────────
// GAS 프록시 호출 — 방명록/RSVP 쓰기 + Gemini 중계
// Content-Type을 text/plain으로 보내 preflight 없이 GAS와 통신한다.
// ─────────────────────────────────────────────────────────────
import { GAS_ENDPOINT } from '../config.js';

export const isGasConfigured = () => !GAS_ENDPOINT.includes('YOUR_DEPLOY_ID');

async function gasPost(payload) {
  const res = await fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '요청에 실패했어요');
  return json;
}

/** 방명록 남기기 → true/false */
export async function submitGuestbook(sheetId, { name, message }) {
  try {
    await gasPost({ action: 'guestbook', sheetId, name, message });
    return true;
  } catch {
    return false;
  }
}

/** RSVP 남기기 → true/false */
export async function submitRsvp(sheetId, { name, attending, headcount, memo }) {
  try {
    await gasPost({ action: 'rsvp', sheetId, name, attending, headcount, memo });
    return true;
  } catch {
    return false;
  }
}

/** Gemini 요청 중계 — generateContent 요청 본문을 그대로 전달 */
export async function aiGenerate(body) {
  const { data } = await gasPost({ action: 'ai', body });
  return data;
}
