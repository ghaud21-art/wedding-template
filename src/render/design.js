// ─────────────────────────────────────────────────────────────
// 디자인 적용 — 2겹 시스템
//  1) design.tokens  → .inv 요소의 --inv-* CSS 변수로 주입
//  2) design.customCss → 검증(sanitize) 후 <style>로 주입
// 편집기 미리보기와 하객 뷰어가 동일하게 사용한다.
// ─────────────────────────────────────────────────────────────

const TOKEN_TO_VAR = {
  bg: '--inv-bg',
  ink: '--inv-ink',
  sub: '--inv-sub',
  accent: '--inv-accent',
  line: '--inv-line',
  card: '--inv-card',
  radius: '--inv-radius',
  sectionSpacing: '--inv-section-spacing',
  divider: '--inv-divider',
};

/**
 * @param {HTMLElement} invEl  .inv 컨테이너
 * @param {object} design      { tokens, customCss }
 * @param {HTMLStyleElement} [styleEl] customCss를 주입할 style 요소
 */
export function applyDesign(invEl, design, styleEl) {
  const t = design?.tokens || {};
  for (const [key, cssVar] of Object.entries(TOKEN_TO_VAR)) {
    if (t[key] != null && t[key] !== '') invEl.style.setProperty(cssVar, String(t[key]));
  }
  if (t.displayFont) invEl.style.setProperty('--inv-display', `'${t.displayFont}', serif`);
  if (t.bodyFont) invEl.style.setProperty('--inv-body', `'${t.bodyFont}', sans-serif`);
  if (styleEl) styleEl.textContent = sanitizeCss(design?.customCss || '');
}

/**
 * 커스텀 CSS 검증:
 *  - @import 제거
 *  - 외부 url() 참조 제거 (data: URI만 허용)
 *  - position:fixed 제거
 *  - .inv 하위 선택자가 아닌 규칙 제거 (@media/@supports는 내부 재검증, @keyframes는 허용)
 */
export function sanitizeCss(css) {
  let s = String(css || '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');           // 주석 제거
  s = s.replace(/@import[^;]*;?/gi, '');            // @import 제거
  s = s.replace(/url\(\s*(['"]?)(?!data:)[^)]*?\1\s*\)/gi, 'none'); // 외부 url() → none
  s = s.replace(/position\s*:\s*fixed/gi, 'position:static');
  return filterRules(s);
}

const SAFE_SELECTOR = /^\.inv($|[\s.:#>~+[])/;

function filterRules(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const head = css.slice(i, open).trim();
    // 중괄호 짝 찾기
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);

    if (head.startsWith('@')) {
      if (/^@(media|supports)/i.test(head)) {
        const inner = filterRules(body);
        if (inner.trim()) out += `${head}{${inner}}`;
      } else if (/^@keyframes/i.test(head)) {
        out += `${head}{${body}}`;
      }
      // 그 외 at-rule(@font-face 등)은 제거
    } else {
      const sels = head.split(',').map((x) => x.trim()).filter((x) => SAFE_SELECTOR.test(x));
      if (sels.length) out += `${sels.join(',')}{${body}}`;
    }
    i = j;
  }
  return out;
}
