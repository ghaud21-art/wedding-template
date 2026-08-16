// 랜딩/온보딩/편집기 — 3단계에서 구현
export function startStudio(app) {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#FF3E63" stroke-width="1.8" width="26" height="26">
          <circle cx="9.5" cy="12" r="5.5"/><circle cx="14.5" cy="12" r="5.5"/>
        </svg>
      </div>
      <h1 style="font-size:22px;letter-spacing:-.3px">청첩장 스튜디오</h1>
      <p style="font-size:13px;color:var(--sub);line-height:1.7">
        구글시트로 만드는 나만의 모바일 청첩장<br>편집기는 다음 단계에서 만들어져요.
      </p>
    </div>`;
}
