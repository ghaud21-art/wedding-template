# 모바일 청첩장 빌더 "청첩장 스튜디오" 개발 프롬프트

아래 내용을 클로드 코드에 그대로 붙여넣으세요. (레포에 `design/mockup.html`로 디자인 시안 파일을 먼저 넣어두면 가장 좋습니다.)

---

## 프로젝트 개요

친구들에게 공유할 수 있는 **모바일 청첩장 제작 웹앱**을 만들어줘. 사용자는 구글 로그인 후 자신의 구글시트 ID를 등록하면 그 시트를 데이터서버로 쓰는 자기만의 청첩장을 만들 수 있고, 하객은 링크로 접속해 완성된 청첩장만 본다.

- 프론트엔드: **GitHub Pages 정적 배포** (커스텀 도메인 연결 가능하게 CNAME 고려)
- 데이터베이스: **사용자 각자의 구글시트** (Google Sheets API v4 직접 호출)
- 방명록/RSVP 익명 쓰기 + Gemini 프록시: **GAS를 화면 없는 JSON API로만** 사용 (배너 노출 없음)
- AI 디자인 편집: **Gemini API** — 운영자(나)의 키 1개를 GAS 스크립트 속성에 보관하고, 프론트는 GAS 프록시를 호출 (GitHub Pages는 공개 코드이므로 키를 프론트에 절대 넣지 말 것)

## 기술 스택

- Vite + Vanilla JS (프레임워크 없이 모듈 구조) 또는 네가 판단하기에 유지보수 쉬운 최소 구성
- 배포: GitHub Actions로 main 푸시 시 GitHub Pages 자동 배포 워크플로 포함
- 폰트: Noto Sans KR(UI), Gowun Batang(청첩장 세리프)

## 디자인 가이드 (중요)

- `design/mockup.html` 시안을 그대로 따라줘. 편집기 화면은 **전체적으로 화이트 베이스(#FFFFFF) + 비비드 포인트 컬러(#FF3E63)**: 흰 배경, 아주 옅은 보더(#ECEEF2), 짙은 잉크(#17181C), 라운드 12px. 주요 버튼·토글·활성 상태에만 비비드 컬러를 사용해 포인트를 준다.
- 시안·스크린샷·샘플 데이터에는 실제 개인정보를 절대 넣지 않는다. 항상 가상의 샘플(민준/서연 등)을 사용.
- 청첩장(하객 화면)은 **고정 테마가 없다.** 모든 디자인은 자유값 토큰 + 커스텀 CSS로 표현되고, AI와의 대화로 만들어나간다. 시작점 예시로 **연한 색감 4종(크림 / 크림 핑크 / 크림 블루 / 연한 그린)** 스와치를 제공(선택 시 토큰 값을 채워주는 버튼일 뿐, 프리셋 시스템이 아님). 색상 값은 `design/mockup.html`의 파스텔 팔레트를 그대로 사용.
- **이모지 절대 사용 금지. 모든 아이콘은 인라인 SVG(스트로크 스타일, feather 계열)로 통일.**
- 모바일 우선 반응형. 편집기는 모바일에서 하단 탭(블록/미리보기/AI)으로 전환.

## 핵심 데이터 구조: 청첩장 설정 JSON

청첩장 하나 = 설정 JSON 하나. 시트의 `config` 탭 A1 셀에 JSON 문자열로 저장.

```json
{
  "version": 1,
  "design": {
    "tokens": {
      "bg": "#FBF8F2", "ink": "#3E3730", "sub": "#8A7F72", "accent": "#A8843C",
      "line": "#E7DFD1", "card": "#FFFFFF",
      "displayFont": "Gowun Batang", "bodyFont": "Noto Sans KR",
      "radius": "14px", "sectionSpacing": "44px", "divider": "solid"
    },
    "customCss": ""
  },
  "couple": {
    "groom": { "name": "", "phone": "", "father": "", "mother": "" },
    "bride": { "name": "", "phone": "", "father": "", "mother": "" }
  },
  "wedding": { "date": "2027-05-22T12:00:00+09:00", "venueName": "", "venueHall": "", "address": "", "transport": "" },
  "blocks": [
    { "type": "intro", "enabled": true, "props": { "mainPhotoUrl": "" } },
    { "type": "greeting", "enabled": true, "props": { "message": "" } },
    { "type": "dday", "enabled": true, "props": {} },
    { "type": "gallery", "enabled": true, "props": { "photos": [] } },
    { "type": "location", "enabled": true, "props": {} },
    { "type": "accounts", "enabled": true, "props": { "groomAccounts": [], "brideAccounts": [] } },
    { "type": "rsvp", "enabled": true, "props": {} },
    { "type": "guestbook", "enabled": true, "props": {} },
    { "type": "contact", "enabled": true, "props": {} }
  ]
}
```

- `blocks` 배열의 순서 = 렌더링 순서. intro는 항상 0번 고정.
- 뷰어와 편집기 미리보기는 **같은 렌더러 모듈**을 공유할 것 (블록 타입별 렌더 함수).

## 시트 구조 (템플릿 시트 기준)

| 탭 이름 | 용도 |
|---|---|
| `config` | A1에 설정 JSON |
| `guestbook` | timestamp, name, message |
| `rsvp` | timestamp, name, attending, headcount, memo |
| `design_history` | timestamp, 요청 문구, 적용 전 design JSON (되돌리기용, 최근 20개 유지) |

- 시트 ID는 반드시 텍스트로 다룰 것 (숫자 자동변환 버그 주의).
- 템플릿 시트 "사본 만들기" 링크를 온보딩 화면에서 안내.

## 화면 구성

1. **랜딩/시작**: 서비스 소개 + "구글로 시작하기" 버튼.
2. **온보딩**: 템플릿 시트 사본 만들기 안내 → 시트 ID(또는 URL 붙여넣기에서 ID 추출) 입력 → 접근 확인 후 편집기로.
3. **편집기** (시안의 3단 레이아웃):
   - 왼쪽: 블록 목록 (토글 스위치, 드래그+화살표로 순서 변경)
   - 가운데: 폰 프레임 실시간 미리보기
   - 오른쪽: 테마 스와치 4개 + AI 채팅
   - 상단바: 저장 상태 칩, 미리보기 새 창, 하객 링크 복사
   - 블록 클릭 시 해당 블록 상세 편집 폼 (문구, 사진 URL, 계좌 목록 등)
   - 저장 시 설정 JSON을 시트 config!A1에 기록 (자동 저장: 변경 후 2초 디바운스)
4. **하객 뷰어**: `?id=시트ID`로 접속 → API 키로 config를 읽어 청첩장 렌더링. 편집 UI 전혀 노출 안 됨.

## 인증/API 연동

- **편집자**: Google Identity Services(GIS) OAuth 토큰 방식, scope는 `https://www.googleapis.com/auth/spreadsheets` 최소로. 토큰으로 본인 시트 읽기/쓰기.
- **하객**: 시트가 "링크 있는 모든 사용자 보기"로 공개되어 있다는 전제로, Sheets API v4 + API 키로 읽기 전용 조회. 시트가 비공개면 안내 문구 표시.
- OAuth 클라이언트 ID와 API 키는 `config.js` 한 파일에 상수로 두고, README에 발급 방법 문서화.

## GAS 프록시 (방명록/RSVP 쓰기 + Gemini 중계)

GAS 웹앱 하나가 두 역할을 겸한다:
1. 방명록/RSVP를 시트에 append
2. Gemini API 중계: 프론트가 보낸 요청을 UrlFetchApp으로 Gemini에 전달하고 결과 반환. API 키는 스크립트 속성(PropertiesService)에만 저장. 간단한 남용 방지로 허용된 sheetId 목록(친구들 시트)을 스크립트 속성에 두고 검증.

- 하객은 로그인이 없으므로, GAS 웹앱(doPost, "나로 실행 + 모든 사용자 접근")을 JSON API로 배포해 시트에 append.
- CORS 프리플라이트 회피를 위해 요청은 `Content-Type: text/plain`으로 보내고 GAS에서 JSON.parse.
- 요청 파라미터: sheetId, type(guestbook|rsvp), payload. GAS는 해당 시트가 자신에게 공유되어 있거나 링크 편집 가능일 때만 기록… 대신 **더 간단한 방식이 있으면 네가 제안해줘** (예: 시트를 "링크 있는 모든 사용자 편집"으로 두고 프론트에서 직접 append하는 방식과 장단점 비교 후 결정).
- GAS 코드는 `gas/Code.gs`로 레포에 포함하고 clasp 배포 가이드를 README에 작성.

## AI 디자인 편집 (Gemini) — 자유 디자인 핵심

디자인의 자유도를 최대한 열되, 구조가 깨지지 않게 **2겹 시스템**으로 구현:

1. **디자인 토큰 (design.tokens)**: 색·폰트·여백·라운드 등 자유값. AI가 대화 맥락에 맞는 조합을 직접 창작 ("새벽 바다 느낌" → 어울리는 팔레트 생성).
2. **커스텀 CSS (design.customCss)**: 토큰으로 표현 안 되는 요청(장식 요소, 사진 프레임 스타일, 그라데이션 배경, 애니메이션 등)은 AI가 CSS를 직접 작성. 반드시 `.inv` 컨테이너 하위 선택자로만 스코프 제한. 프론트는 이 CSS를 `<style>`로 주입.

규칙:
- AI는 HTML 구조와 blocks 스키마는 절대 수정하지 못한다. 출력은 항상 { design, blocks(enabled/순서/props만) } 범위의 수정된 JSON.
- 시스템 프롬프트: "현재 설정 JSON + 사용자 요청 → 수정된 설정 JSON만 출력. 백틱/설명 금지. customCss는 .inv 하위 선택자만, position:fixed·외부 URL·@import 금지."
- 프론트에서 customCss를 주입 전 검증: `.inv` 스코프 밖 선택자, @import, url() 외부 참조는 제거.
- 응답 처리: JSON.parse 실패 시 백틱 제거 후 재시도 → 실패 시 재요청 안내. 성공 시 미리보기 즉시 반영 + "적용됨" 표시.
- **모든 적용 직전 상태를 design_history 탭에 저장**하고, 채팅 옆 "이전 디자인으로 되돌리기" 버튼 + 히스토리 목록에서 특정 시점 복원 제공. 실험해도 잃을 게 없다는 감각이 중요.
- 호출 경로: 프론트 → GAS 프록시 → Gemini (gemini-2.0-flash 계열). 키는 프론트에 존재하지 않음.

## 블록별 요구사항

- **intro**: 이름, 날짜, 예식장, 메인 사진. 사진은 URL 입력(구글 드라이브 공유 링크 → 직접 보기 URL 변환 유틸 포함).
- **greeting**: 여러 줄 문구, 혼주 소개.
- **dday**: 예식 시각 기준 실시간 카운트다운.
- **gallery**: 사진 URL 목록, 3열 그리드, 탭하면 전체화면 스와이프 뷰어.
- **location**: 주소 텍스트 + 네이버지도/카카오맵/티맵 딥링크 버튼 (지도 SDK 없이 링크로 시작, 추후 확장).
- **accounts**: 신랑측/신부측 아코디언, 계좌별 클립보드 복사 버튼.
- **rsvp**: 이름 + 참석 여부 + 인원 → 시트 rsvp 탭 기록.
- **guestbook**: 최근 메시지 목록 + 작성 폼 → 시트 guestbook 탭 기록.
- **contact**: 신랑/신부 전화(tel:)/문자(sms:) 버튼.
- 공통: 카카오톡 공유를 위한 OG 메타태그(og:title, og:image)를 index.html에 설정 가능하게.

## 작업 순서 (단계별로 진행하고 각 단계마다 확인받기)

1. 레포 스캐폴딩 + GitHub Pages 배포 워크플로 + 시안 기반 공통 스타일 토큰
2. 블록 렌더러 + 하객 뷰어 (더미 JSON으로 완성도 있게)
3. 편집기 UI (블록 토글/정렬/상세 편집, 로컬 상태로 동작)
4. 구글 로그인 + 시트 읽기/쓰기 연동 + 온보딩
5. GAS 프록시 (방명록/RSVP 쓰기 + Gemini 중계) 구현
6. AI 자유 디자인 패널 (토큰+커스텀 CSS, 히스토리/되돌리기 포함)
7. 마무리: 에러 처리, 로딩 상태, README(친구용 사용 가이드 포함)

## 주의사항

- GAS 관련: 배포 버전 갱신 필요, CSP 때문에 인라인 onclick 대신 addEventListener 사용.
- 시트 값은 텍스트 포맷 강제 (ID/전화번호 숫자 변환 버그).
- 모든 사용자 노출 문구는 한국어, 존댓말, 간결하게.
- 하객 뷰어는 저사양 폰에서도 가볍게: 외부 라이브러리 최소화.
