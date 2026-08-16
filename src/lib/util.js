// 공용 유틸리티

/** HTML 이스케이프 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** ISO 문자열 → Date (실패 시 null) */
export function parseDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2027 . 05 . 22" */
export function fmtDateDots(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()} . ${mm} . ${dd}`;
}

/** "2027. 05. 22" */
export function fmtDateShort(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}. ${mm}. ${dd}`;
}

/** "2027년 5월 22일 토요일" */
export function fmtDateKorean(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

/** "토요일" */
export function fmtWeekday(d) {
  return `${WEEKDAYS[d.getDay()]}요일`;
}

/** "낮 12시" / "오후 2시 30분" / "오전 11시" */
export function fmtTimeKorean(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const min = m ? ` ${m}분` : '';
  if (h === 12) return `낮 12시${min}`;
  if (h === 0) return `밤 12시${min}`;
  if (h < 12) return `오전 ${h}시${min}`;
  if (h < 18) return `오후 ${h - 12}시${min}`;
  return `저녁 ${h - 12}시${min}`;
}

/** 클립보드 복사 (구형 브라우저 폴백 포함) */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* 미지원 */ }
    ta.remove();
    return ok;
  }
}
