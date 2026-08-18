// ─────────────────────────────────────────────────────────────
// 청첩장 스튜디오 — GAS 프록시 (Google Apps Script)
//
// 역할 1) 하객 쓰기: 방명록/RSVP를 해당 청첩장 시트에 기록
//         (하객은 로그인이 없으므로, 이 스크립트가 대신 쓴다)
// 역할 2) Gemini 중계: API 키를 스크립트 속성에 숨기고 요청만 전달
//
// ── 배포 방법 (한 번만) ─────────────────────────────────────
// 1. script.google.com → 새 프로젝트 → 이 파일 내용 붙여넣기
// 2. 프로젝트 설정 → 스크립트 속성에 추가:
//      GEMINI_API_KEY = (aistudio.google.com에서 발급한 키)
//      GEMINI_MODEL   = gemini-2.5-flash   (선택, 기본값 있음)
// 3. 배포 → 새 배포 → 웹 앱
//      실행 계정: 나  /  액세스 권한: 모든 사용자
// 4. 배포 URL을 src/config.js의 GAS_ENDPOINT에 붙여넣기
//
// * 방명록/RSVP 기록은 "시트에 이 계정(배포자)의 편집 권한"이
//   있어야 동작한다. 앱이 시트를 만들 때 자동으로 부여한다.
//   (src/config.js의 GAS_OWNER_EMAIL 참고)
// ─────────────────────────────────────────────────────────────

var PROPS = PropertiesService.getScriptProperties();

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var out;
    if (req.action === 'guestbook') out = addGuestbook(req);
    else if (req.action === 'rsvp') out = addRsvp(req);
    else if (req.action === 'ai') out = callGemini(req);
    else throw new Error('알 수 없는 요청이에요');
    out.ok = true;
    return json(out);
  } catch (err) {
    return json({ ok: false, error: String((err && err.message) || err) });
  }
}

// 배포 확인용 (브라우저로 URL을 열면 보인다)
function doGet() {
  return json({ ok: true, service: 'invitation-studio-gas', time: new Date().toISOString() });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function openTab(sheetId, tabName) {
  var id = clean(sheetId, 120);
  if (!id) throw new Error('시트 ID가 없어요');
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('시트를 열 수 없어요. 링크를 확인해 주세요.');
  }
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) throw new Error(tabName + ' 탭이 없어요');
  if (sheet.getLastRow() > 5000) throw new Error('기록이 너무 많아요'); // 남용 방지
  return sheet;
}

/* ───────── 방명록 ───────── */

function addGuestbook(req) {
  var name = clean(req.name, 20);
  var message = clean(req.message, 300);
  if (!name || !message) throw new Error('이름과 메시지를 입력해 주세요');
  var sheet = openTab(req.sheetId, 'guestbook');
  sheet.appendRow([new Date(), name, message]);
  return {};
}

/* ───────── RSVP ───────── */

function addRsvp(req) {
  var name = clean(req.name, 20);
  var attending = clean(req.attending, 10) === '불참' ? '불참' : '참석';
  var headcount = Math.max(1, Math.min(50, parseInt(req.headcount, 10) || 1));
  var memo = clean(req.memo, 200);
  if (!name) throw new Error('성함을 입력해 주세요');
  var sheet = openTab(req.sheetId, 'rsvp');
  sheet.appendRow([new Date(), name, attending, headcount, memo]);
  return {};
}

/* ───────── Gemini 중계 ───────── */

function callGemini(req) {
  var key = PROPS.getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY가 아직 설정되지 않았어요 (스크립트 속성)');
  var model = PROPS.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash';

  var body = req.body;
  if (!body || !body.contents) throw new Error('요청 내용이 비어 있어요');

  var res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    }
  );
  var data = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) {
    throw new Error((data.error && data.error.message) || 'AI 요청에 실패했어요');
  }
  return { data: data };
}
