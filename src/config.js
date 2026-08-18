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

/**
 * GAS를 배포한 구글 계정 이메일.
 * 하객의 방명록/RSVP는 이 계정(GAS)이 대신 시트에 기록하므로,
 * 시트를 만들 때 이 계정에 편집 권한을 자동으로 부여한다.
 * 비워두면 권한 부여를 건너뛴다 (방명록/RSVP 기록 비활성).
 */
export const GAS_OWNER_EMAIL = '';

/**
 * 편집자 OAuth scope
 *  - spreadsheets: 본인 시트 읽기/쓰기
 *  - drive.file: 이 앱이 만든 파일에 한해 공유 설정 변경 (하객 링크 공개용)
 */
export const OAUTH_SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
