// ─────────────────────────────────────────────────────────────
// 서비스 설정 — 발급 방법은 README.md 참고
// GitHub Pages는 공개 코드이므로 여기에는 "공개해도 되는 값"만 둔다.
// (OAuth 클라이언트 ID와 API 키는 공개 가능. Gemini 키는 절대 금지 → GAS 스크립트 속성에만 보관)
// ─────────────────────────────────────────────────────────────

/** Google Cloud Console에서 발급한 OAuth 2.0 클라이언트 ID (웹 애플리케이션) */
export const GOOGLE_CLIENT_ID = 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com';

/** Sheets API 읽기 전용 조회용 API 키 (하객 뷰어에서 사용, HTTP 리퍼러 제한 권장) */
export const GOOGLE_API_KEY = 'YOUR_API_KEY';

/** GAS 웹앱 배포 URL (방명록/RSVP 쓰기 + Gemini 프록시) */
export const GAS_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec';

/** 온보딩에서 안내할 템플릿 시트 "사본 만들기" 링크 */
export const TEMPLATE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_SHEET_ID/copy';

/** 편집자 OAuth scope — 본인 시트 읽기/쓰기 최소 권한 */
export const OAUTH_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
