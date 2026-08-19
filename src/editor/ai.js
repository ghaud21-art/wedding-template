// ─────────────────────────────────────────────────────────────
// AI 자유 디자인 — Gemini에게 현재 설정을 주고 변경안을 JSON으로 받는다.
// 호출은 GAS 프록시를 거친다 (API 키는 GAS 스크립트 속성에만 존재).
// ─────────────────────────────────────────────────────────────
import { aiGenerate } from '../lib/gas.js';

const SYSTEM = `너는 한국 모바일 청첩장의 디자인 도우미다. 사용자의 요청에 따라 청첩장 설정 JSON을 수정한다.

## 응답 형식 (반드시 이 JSON 하나만 출력)
{
  "reply": "사용자에게 보여줄 한두 문장의 한국어 설명",
  "design": { "tokens": { ... }, "customCss": "..." } 또는 null,
  "blocks": [ ... ] 또는 null
}
- 바꿀 것이 없는 항목은 null로 둔다. tokens는 바꿀 키만 부분적으로 넣어도 된다.
- customCss를 바꿀 때는 전체 CSS를 다시 출력한다 (부분 수정 불가).

## design.tokens (색은 hex, 키 이름 정확히)
bg(전체 배경) ink(본문 글자) sub(보조 글자) accent(포인트) line(구분선·플레이스홀더 배경) card(카드 배경)
displayFont(제목 서체) bodyFont(본문 서체) radius(모서리, 예 "14px")
sectionSpacing(섹션 간격, 예 "44px") divider("solid"|"dashed"|"dotted"|"none")
- 서체는 구글 폰트의 한글 서체 이름만: "Gowun Batang", "Noto Sans KR", "Noto Serif KR", "Nanum Myeongjo", "Gowun Dodum"

### 색 변경 규칙 (중요)
- 색을 하나라도 바꾸면 반드시 6개 색(bg, ink, sub, accent, line, card)을 전부 함께 반환한다.
  일부만 바꾸면 배경과 글자가 어긋나서 안 읽히는 화면이 된다.
- 명도 대비: bg와 ink는 대비를 크게 (WCAG 4.5:1 이상), sub도 bg 위에서 읽혀야 한다.
- 어두운 배경 요청 시: bg를 어두운 색으로, card는 bg보다 한 단계 밝게,
  line은 bg 위에서 은은히 보이는 어두운-중간 톤으로, ink는 밝은 색(거의 흰색),
  sub는 ink보다 낮은 명도의 밝은 회색, accent는 어두운 배경에서 돋보이는 밝은 포인트로.
  예시(보라 다크): bg #221E33, card #2C2743, line #3B3555, ink #F0EDF8, sub #A9A3C2, accent #C4B0FF

## design.customCss 규칙 (자유 창작 영역)
- 모든 선택자는 .inv 또는 .inv- 로 시작한다 (예: .inv h1, .inv-intro::before, .inv .sec-title)
- @keyframes 애니메이션 허용, @media 허용, ::before/::after 허용
- 금지: @import, url() 전부(이미지 불가 — 효과는 gradient로), position:fixed, 이모지 문자
- .inv와 모든 <section>은 position:relative + overflow:hidden 상태다. 오버레이 효과는
  position:absolute; inset:0; pointer-events:none 으로 만들면 안전하다.
- 중요: 전체 화면에 은은하게 깔리는 장식 효과(별빛, 반짝임 등)는 반드시
  ".inv" 전체가 아니라 "특정 섹션"(예: .inv-intro, .inv-greeting)에
  ::before로 붙인다. .inv는 모든 섹션을 합친 전체 스크롤 길이를 가진
  아주 긴 박스라서, 거기에 퍼센트 좌표로 점을 찍으면 대부분 화면 밖
  (한참 스크롤해야 나오는 아래쪽)에 위치해 하객 눈에 거의 안 보인다.
  섹션 하나(뷰포트 한 화면 정도 높이)에 붙여야 실제로 눈에 보인다.
  여러 섹션에 은은한 느낌을 주고 싶으면 각 섹션마다 개별로 붙인다
  (.inv-intro::before, .inv-greeting::before, .inv-dday::before 등).
- 장식 효과(별빛, 반짝임, 꽃잎 등)는 ::before/::after + radial-gradient/linear-gradient
  + @keyframes 조합으로 구현한다. 예: 별빛은 radial-gradient(2px 2px at 20% 30%, #fff, transparent)
  여러 개를 background-image에 겹치고 opacity/transform 애니메이션을 건다.
  배경색과 대비되는 색을 골라야 실제로 보인다 (밝은 배경엔 어두운 점, 어두운 배경엔 밝은 점).
- 쓸 수 있는 클래스: .inv-intro .date-top .amp .venue .main-photo .inv-greeting .sec-eyebrow .sec-title .parents .inv-dday .dday-grid .dday-cell .dday-msg .gal-grid .map-box .map-info .map-btns .acc .acc-head .acc-body .acc-row .copy-btn .rsvp-card .seg .rsvp-submit .gb-msg .gb-form .contact-grid .contact-cell .cc-btns .inv-footer

## blocks
- 타입은 이 9개만: intro greeting dday gallery location accounts rsvp guestbook contact
- 각 항목: { "type": "...", "enabled": true|false, "props": {...} }
- intro는 항상 첫 번째. 순서 변경/켜고 끄기 가능. props 구조는 현재 설정을 그대로 따른다.
- 문구(인사말 등)를 바꿔달라고 하면 blocks의 해당 props를 수정한다. 문구에 이모지 금지.

## 태도
- 요청이 모호하면 합리적으로 해석해서 일단 적용하고, reply에 무엇을 했는지 말한다.
- 디자인과 무관한 질문에는 design/blocks를 null로 두고 reply로만 답한다.
- 절대 금지: 사용자가 시각적 변경(색·배경·효과·문구 등)을 요청했는데
  design과 blocks를 둘 다 null로 두고 "이미 적용되어 있다"거나
  "그대로 사용하면 된다"고만 답하는 것. 요청받은 "현재 설정 JSON"에
  실제로 그 내용이 없다면 반드시 design/blocks를 채워서 실제로 반영한다.
  이미 요청한 대로 되어 있다고 판단되는 경우에도, reply에서 현재 값을
  구체적으로 근거를 들어 설명한다 (예: "지금 배경이 #221E33으로 이미
  어둡게 되어 있어요"). 근거 없이 "이미 되어 있다"고만 말하지 않는다.

## 첨부 사진
- 사용자가 사진을 첨부하면: 색감/분위기를 요청할 때는 사진의 팔레트를 추출해 tokens에 반영한다.
- 사진에 "업로드된 URL"이 함께 오면: 사용자가 사진 배치를 원할 때 그 URL을 intro의 mainPhotoUrl 또는 gallery의 photos 배열에 넣는다 (blocks로 반환).
- URL이 없는 사진은 참고용으로만 쓰고, 배치 요청에는 "로그인 후 첨부하면 바로 넣어드릴 수 있어요"라고 reply로 안내한다.`;

const history = [];

/** Gemini 응답에서 JSON을 최대한 견고하게 뽑아낸다 (마크다운 펜스·잘림 대응) */
function parseAiJson(data) {
  const finish = data.candidates?.[0]?.finishReason;
  const answer = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!answer) return null;
  try {
    return JSON.parse(answer);
  } catch { /* 아래에서 복구 시도 */ }

  // ```json … ``` 펜스 제거 후 재시도
  const fenced = answer.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch { /* 계속 */ }
  }
  // 첫 { 부터 마지막 } 까지만 잘라서 재시도 (앞뒤 잡담 제거)
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(answer.slice(start, end + 1)); } catch { /* 계속 */ }
  }
  if (finish === 'MAX_TOKENS') return null; // 응답이 중간에 잘림 — 재시도 대상
  return null;
}

/** 첫 시도가 깨졌을 때 한 번만 더 시도 (짧고 명확하게 재요청) */
async function retryOnBadJson(contents, genConfig) {
  const retryContents = [
    ...contents,
    { role: 'model', parts: [{ text: '(형식이 올바르지 않은 응답)' }] },
    { role: 'user', parts: [{ text: '방금 응답이 올바른 JSON이 아니었어요. 마크다운이나 설명 없이, 유효한 JSON 객체 하나만 다시 출력해 주세요.' }] },
  ];
  try {
    const data = await aiGenerate({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: retryContents, generationConfig: genConfig });
    return parseAiJson(data);
  } catch {
    return null;
  }
}

/**
 * @param {object} config 현재 설정
 * @param {string} userMessage 사용자 요청
 * @param {{mime:string, base64:string, url?:string}} [image] 첨부 사진
 * @returns {Promise<{reply:string, design:object|null, blocks:array|null}>}
 */
export async function requestDesign(config, userMessage, image) {
  let text = `현재 설정 JSON:\n${JSON.stringify(config)}\n\n요청: ${userMessage}`;
  const parts = [];
  if (image) {
    text += image.url
      ? `\n\n[첨부 사진 있음 — 업로드된 URL: ${image.url}]`
      : '\n\n[첨부 사진 있음 — 참고용, 업로드 URL 없음]';
    parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  }
  parts.unshift({ text });

  const contents = [...history, { role: 'user', parts }];
  const genConfig = {
    responseMimeType: 'application/json',
    temperature: 0.7,
    maxOutputTokens: 8192,
    // 내부 "생각" 토큰이 응답 예산을 잡아먹어 JSON이 잘리는 걸 막는다.
    // 구조화된 JSON 생성엔 긴 추론이 필요 없다. (pro 모델 등 미지원 시 자동 재시도)
    thinkingConfig: { thinkingBudget: 0 },
  };

  let data;
  try {
    data = await aiGenerate({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: genConfig });
  } catch (e) {
    if (!/thinking/i.test(e.message)) throw e;
    delete genConfig.thinkingConfig; // thinkingBudget 미지원 모델 폴백
    data = await aiGenerate({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: genConfig });
  }

  const parsed = parseAiJson(data) || await retryOnBadJson(contents, genConfig);
  if (!parsed) throw new Error('AI 응답을 해석하지 못했어요. 다시 요청해 주세요.');

  // 대화 맥락은 텍스트만 가볍게 유지 (설정 JSON은 매번 새로 전달)
  history.push(
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: parsed.reply || '적용했어요.' }] },
  );
  if (history.length > 12) history.splice(0, history.length - 12);

  return parsed;
}
