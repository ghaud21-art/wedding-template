// 하객 뷰어 — 2단계에서 구현
export function startViewer(app, sheetId) {
  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;color:var(--sub);font-size:13px">
      하객 뷰어 준비 중… (시트 ID: ${escapeHtml(sheetId)})
    </div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
