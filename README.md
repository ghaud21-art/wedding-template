# 청첩장 스튜디오 (wedding-template)

구글시트를 데이터베이스로 쓰는 **무료 모바일 청첩장 만들기 웹앱**입니다.

- 신랑신부는 구글로 로그인 → 블록을 켜고 끄고 내용을 채우고 → **AI와 대화하며 디자인**을 자유롭게 바꿉니다.
- 모든 데이터(내용·방명록·참석 여부)는 **본인 구글 드라이브의 시트 한 장**에만 저장됩니다.
- 하객은 로그인 없이 링크(`?id=시트ID`)로 청첩장을 보고, 방명록과 참석 여부를 남깁니다.
- 서버 없음 · 회원가입 없음 · 비용 없음 (GitHub Pages + 구글 무료 한도)

## 구조

```
하객 브라우저 ──읽기──▶ 구글시트 (config/guestbook/rsvp 탭)
     │                        ▲
     └──방명록·RSVP 쓰기──▶ GAS 프록시 ──▶ 시트에 기록
편집자 브라우저 ──OAuth 로그인──▶ 본인 시트 읽기/쓰기
편집기 AI 채팅 ──▶ GAS 프록시 ──▶ Gemini API (키는 GAS에만 저장)
```

| 파일 | 역할 |
|---|---|
| `src/render/blocks.js` | 9개 블록 렌더러 (편집기 미리보기·하객 뷰어 공유) |
| `src/render/design.js` | 디자인 토큰 주입 + AI 커스텀 CSS 검증 |
| `src/editor/` | 랜딩·온보딩·편집기·AI 패널 |
| `src/viewer/viewer.js` | 하객 뷰어 |
| `src/lib/google.js` | 구글 로그인 + Sheets/Drive API |
| `gas/Code.gs` | Apps Script 프록시 (하객 쓰기 + Gemini 중계) |
| `src/config.js` | **발급받은 키를 넣는 곳** |

## 설치 (처음 한 번, 약 20분)

### 0. 배포 주소 만들기

1. 이 저장소를 GitHub에 올리면 `.github/workflows/deploy.yml`이 자동으로 GitHub Pages에 배포합니다.
2. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정하세요.
3. 배포 주소는 `https://<계정>.github.io/<저장소>/` 형태입니다. 아래 단계에서 이 주소가 필요합니다.

### 1. Google Cloud 프로젝트 + OAuth 클라이언트 ID

1. [console.cloud.google.com](https://console.cloud.google.com) → 새 프로젝트 만들기 (이름 아무거나, 예: `wedding-template`)
2. **API 및 서비스 → 라이브러리**에서 두 가지를 검색해 **사용 설정**:
   - **Google Sheets API**
   - **Google Drive API**
3. **API 및 서비스 → OAuth 동의 화면**:
   - User Type: **외부** → 앱 이름·이메일 입력 → 저장
   - 게시 상태가 "테스트"면 **테스트 사용자**에 본인·친구들 이메일 추가 (또는 "앱 게시"를 눌러 프로덕션 전환)
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**:
   - 유형: **웹 애플리케이션**
   - **승인된 자바스크립트 원본**에 추가:
     - `https://<계정>.github.io`
     - `http://localhost:5173` (로컬 개발용)
   - 만들어진 **클라이언트 ID**(`….apps.googleusercontent.com`)를 복사

### 2. API 키 (하객 뷰어의 읽기 전용)

1. 같은 화면에서 **사용자 인증 정보 만들기 → API 키**
2. (권장) 키 수정 → **애플리케이션 제한사항: 웹사이트** → `https://<계정>.github.io/*` 추가,
   **API 제한사항**: Google Sheets API만 허용
3. 키를 복사

### 3. GAS 프록시 (방명록·RSVP 기록 + AI 중계)

1. [script.google.com](https://script.google.com) → **새 프로젝트** → `gas/Code.gs` 내용 전체를 붙여넣기
2. [aistudio.google.com/apikey](https://aistudio.google.com/apikey)에서 **Gemini API 키** 발급 (무료)
3. Apps Script **프로젝트 설정(⚙) → 스크립트 속성**에 추가:
   - `GEMINI_API_KEY` = 발급한 키
4. **배포 → 새 배포 → 유형: 웹 앱**
   - 실행 계정: **나**
   - 액세스 권한: **모든 사용자**
5. 배포 후 나오는 **웹 앱 URL**(`https://script.google.com/macros/s/…/exec`)을 복사
   - 브라우저로 열어 `{"ok":true,…}`가 보이면 정상

### 4. `src/config.js` 채우기

```js
export const GOOGLE_CLIENT_ID = '1단계의 클라이언트 ID';
export const GOOGLE_API_KEY   = '2단계의 API 키';
export const GAS_ENDPOINT     = '3단계의 웹 앱 URL';
export const GAS_OWNER_EMAIL  = 'GAS를 배포한 본인 구글 이메일';
```

> `GAS_OWNER_EMAIL`이 필요한 이유: 하객은 로그인을 하지 않으므로, 방명록·RSVP는 GAS(배포자 계정)가 대신 시트에 기록합니다. 그래서 앱이 시트를 만들 때 이 계정에 편집 권한을 자동으로 부여합니다.

커밋해서 푸시하면 자동으로 재배포됩니다. 끝!

## 사용 방법

- **신랑신부(친구)**: 배포 주소 접속 → 구글로 시작하기 → 내용 채우기 → AI에게 "좀 더 로맨틱하게 해줘" → 상단 **하객 링크 복사** → 카톡 공유
- **하객**: 받은 링크 열기 → 구경 → 방명록·참석 여부 남기기
- **데이터 확인**: 본인 구글 드라이브의 `모바일 청첩장 데이터` 시트에서 rsvp/guestbook 탭 확인

## 로컬 개발

```bash
npm install
npm run dev
```

- `http://localhost:5173` — 편집기 (키가 없으면 데모 모드로 로컬 저장)
- `http://localhost:5173/?id=sample` — 샘플 청첩장
- `http://localhost:5173/?id=draft` — 편집 중 초안 미리보기

## 자주 묻는 것

**Q. 친구도 이걸로 청첩장을 만들 수 있나요?**
네. 같은 배포 주소에서 친구가 자기 구글 계정으로 로그인하면, 친구의 드라이브에 시트가 새로 생기고 친구만의 청첩장이 됩니다. 서로의 데이터에는 접근할 수 없습니다.

**Q. 카카오톡 공유 미리보기(제목/사진)를 바꾸려면?**
`index.html`의 OG 메타태그(`og:title`, `og:image`)를 수정하세요. 정적 페이지라 청첩장별로 다르게는 안 되고, 앱 전체에 하나로 적용됩니다.

**Q. 사진은 어디에 올리나요?**
구글 드라이브에 올리고 "링크가 있는 모든 사용자 보기"로 공유한 뒤, 그 공유 링크를 편집기에 붙여넣으면 자동으로 이미지 주소로 변환됩니다.

**Q. 비용이 정말 0원인가요?**
GitHub Pages 무료, Sheets/Drive API 무료 한도, Gemini API 무료 등급(분당 요청 제한 있음) 안에서 동작합니다. 하객 수백 명 규모의 개인 청첩장에는 충분합니다.
