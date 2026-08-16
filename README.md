# 청첩장 스튜디오

구글시트를 데이터서버로 쓰는 **모바일 청첩장 제작 웹앱**입니다.
구글 로그인 후 자신의 시트 ID를 등록하면 나만의 청첩장을 만들 수 있고,
하객은 링크(`?id=시트ID`)로 접속해 완성된 청첩장만 봅니다.

## 개발

```bash
npm install
npm run dev     # 로컬 개발 서버
npm run build   # dist/ 빌드
```

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 자동으로 GitHub Pages에 배포합니다.
레포 Settings → Pages → Source를 **GitHub Actions**로 설정하세요.

## 구조

```
index.html              앱 진입점 (OG 메타태그 포함)
src/
  main.js               모드 라우팅 (?id= → 하객 뷰어 / 그 외 → 편집기)
  config.js             OAuth 클라이언트 ID · API 키 · GAS 주소 (공개 가능 값만)
  styles/base.css       편집기 UI 토큰 (화이트 + 비비드 포인트)
  styles/invite.css     청첩장 구조 스타일 (--inv-* 변수 기반)
  lib/defaultConfig.js  설정 JSON 스키마 · 기본값 · 시작점 스와치 4종
  render/               블록 렌더러 (편집기 미리보기 · 하객 뷰어 공유)
  editor/               랜딩 · 온보딩 · 편집기
  viewer/               하객 뷰어
gas/Code.gs             GAS 프록시 (방명록/RSVP 쓰기 + Gemini 중계)
design/mockup.html      디자인 시안
```

## 키 발급 방법

> 4단계(구글 연동)·5단계(GAS) 구현 후 자세히 작성됩니다.

- **OAuth 클라이언트 ID / API 키**: Google Cloud Console → `src/config.js`에 입력
- **Gemini API 키**: GAS 스크립트 속성에만 보관 (프론트에 절대 넣지 않음)
