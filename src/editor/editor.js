// ─────────────────────────────────────────────────────────────
// 편집기 — 시안의 3단 레이아웃
//   왼쪽: 블록 목록(토글/드래그/화살표) + 블록 상세 편집 폼
//   가운데: 폰 프레임 실시간 미리보기 (공유 렌더러 사용)
//   오른쪽: 시작점 스와치 4종 + AI 채팅 (Gemini 연결은 6단계)
// 저장: 변경 후 2초 디바운스 — 지금은 localStorage, 4단계에서 시트 저장으로 확장
// ─────────────────────────────────────────────────────────────
import { STARTER_SWATCHES, normalizeConfig } from '../lib/defaultConfig.js';
import { sampleConfig } from '../lib/sample.js';
import { sampleGuestbook } from '../lib/sample.js';
import { renderInvitation } from '../render/blocks.js';
import { applyDesign } from '../render/design.js';
import { toast } from '../lib/toast.js';
import { esc, parseDate, fmtDateShort, fmtWeekday } from '../lib/util.js';

export const DRAFT_KEY = 'inviteStudio.draft';

const BLOCK_META = {
  intro: { name: '인트로', desc: '이름 · 날짜 · 메인 사진', locked: true },
  greeting: { name: '인사말', desc: '초대 문구 · 혼주 소개' },
  dday: { name: 'D-day 카운트', desc: '결혼식까지 남은 시간' },
  gallery: { name: '갤러리', desc: '사진 그리드' },
  location: { name: '오시는 길', desc: '지도 · 교통 안내' },
  accounts: { name: '마음 전하실 곳', desc: '계좌번호 · 복사 버튼' },
  rsvp: { name: '참석 여부', desc: '하객 RSVP 수집' },
  guestbook: { name: '방명록', desc: '축하 메시지' },
  contact: { name: '연락하기', desc: '전화 · 문자 버튼' },
};

const I = {
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="#FF3E63" stroke-width="1.8"><circle cx="9.5" cy="12" r="5.5"/><circle cx="14.5" cy="12" r="5.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M12 18h.01"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z"/></svg>',
};

let config;
let selectedBlock = null;
let previewCleanup = null;
let saveTimer = null;
let previewTimer = null;
let els = {};

/* ───────── 진입 ───────── */

export function startEditor(app) {
  config = loadDraft();
  document.body.dataset.view = 'preview';

  app.innerHTML = `
    <header class="topbar">
      <div class="logo">${I.rings}</div>
      <div>
        <div class="tb-title">청첩장 스튜디오</div>
        <div class="tb-sub" id="tbSub"></div>
      </div>
      <div class="tb-spacer"></div>
      <span class="chip" id="saveChip"><span class="dot"></span>저장됨</span>
      <button class="btn btn-ghost" id="btnPreview">미리보기</button>
      <button class="btn btn-primary" id="btnShare">${I.link}<span class="txt">하객 링크 복사</span></button>
    </header>

    <div class="layout">
      <aside class="panel panel-left" id="leftPanel"></aside>

      <main class="panel-center">
        <div class="preview-label">실시간 미리보기 <span class="chip">하객이 보는 화면</span></div>
        <div class="phone">
          <div class="phone-notch"></div>
          <div class="phone-scroll"><div class="inv" id="inv"></div></div>
        </div>
      </main>

      <aside class="panel-right">
        <div class="right-section">
          <div class="panel-title">테마 미리보기</div>
          <div class="panel-desc" style="margin-bottom:0">연한 색감의 시작점이에요. 다른 색감을 원하면 아래 AI에게 말로 요청해 자유롭게 조정할 수 있어요.</div>
          <div class="theme-row" id="themeRow"></div>
        </div>
        <div class="chat-wrap">
          <div class="chat-head">
            <div class="panel-title">AI 디자인 도우미</div>
            <div class="panel-desc" style="margin-bottom:0">말로 요청하면 디자인과 블록 구성을 바꿔드려요.</div>
          </div>
          <div class="chat-scroll" id="chatScroll">
            <div class="msg msg-ai">안녕하세요! 청첩장 디자인을 도와드릴게요. 색감을 바꾸거나, 블록을 추가하거나, 문구 분위기를 바꾸고 싶으면 편하게 말씀해 주세요.</div>
          </div>
          <div class="quick-chips" id="quickChips"></div>
          <div class="chat-input">
            <input type="text" id="chatInput" placeholder="예: 좀 더 따뜻한 색감으로 바꿔줘">
            <button id="chatSend" aria-label="보내기">${I.send}</button>
          </div>
        </div>
      </aside>
    </div>

    <nav class="mobile-tabs">
      <button data-v="blocks">${I.grid}블록</button>
      <button data-v="preview" class="on">${I.phone}미리보기</button>
      <button data-v="ai">${I.sparkle}AI 디자인</button>
    </nav>`;

  els = {
    tbSub: document.getElementById('tbSub'),
    saveChip: document.getElementById('saveChip'),
    leftPanel: document.getElementById('leftPanel'),
    inv: document.getElementById('inv'),
    themeRow: document.getElementById('themeRow'),
    chatScroll: document.getElementById('chatScroll'),
    chatInput: document.getElementById('chatInput'),
  };

  // customCss 주입용 style (편집기 미리보기 전용)
  els.customStyle = document.createElement('style');
  els.customStyle.dataset.role = 'custom-css-preview';
  document.head.appendChild(els.customStyle);

  wireTopbar();
  wireMobileTabs();
  renderThemeRow();
  wireChat();
  renderLeftPanel();
  renderPreview();
  updateTopbarSub();
}

/* ───────── 상태/저장 ───────── */

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return normalizeConfig(JSON.parse(raw));
  } catch { /* 손상된 드래프트는 무시 */ }
  return normalizeConfig(sampleConfig()); // 첫 방문: 가상 샘플로 시작
}

function markChanged() {
  els.saveChip.innerHTML = '<span class="dot"></span>저장 중…';
  els.saveChip.classList.add('chip-warn');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { renderPreview(); updateTopbarSub(); }, 120);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 2000);
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
  els.saveChip.classList.remove('chip-warn');
  els.saveChip.innerHTML = '<span class="dot"></span>저장됨';
}

function updateTopbarSub() {
  const g = config.couple.groom.name;
  const b = config.couple.bride.name;
  const d = parseDate(config.wedding.date);
  const names = g && b ? `${g} & ${b}` : '새 청첩장';
  const date = d ? ` · ${fmtDateShort(d)} (${fmtWeekday(d)[0]})` : '';
  els.tbSub.textContent = names + date;
}

/* ───────── 상단 바 ───────── */

function wireTopbar() {
  document.getElementById('btnPreview').addEventListener('click', () => {
    saveDraft();
    window.open(`${location.pathname}?id=draft`, '_blank');
  });
  document.getElementById('btnShare').addEventListener('click', () => {
    toast('구글시트 연결(다음 단계) 후 하객 링크를 복사할 수 있어요');
  });
}

function wireMobileTabs() {
  document.querySelectorAll('.mobile-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.body.dataset.view = btn.dataset.v;
      document.querySelectorAll('.mobile-tabs button').forEach((b) => b.classList.toggle('on', b === btn));
    });
  });
}

/* ───────── 미리보기 ───────── */

function renderPreview() {
  previewCleanup?.();
  applyDesign(els.inv, config.design, els.customStyle);
  previewCleanup = renderInvitation(els.inv, config, { guestbook: sampleGuestbook(), toast });
}

/* ───────── 왼쪽 패널: 블록 목록 ↔ 상세 폼 ───────── */

function renderLeftPanel() {
  if (selectedBlock) renderBlockForm(selectedBlock);
  else renderBlockList();
}

function renderBlockList() {
  const p = els.leftPanel;
  p.innerHTML = `
    <div class="panel-title">청첩장 블록</div>
    <div class="panel-desc">스위치로 켜고 끄고, 드래그(또는 화살표)로 순서를 바꿔요. 블록을 누르면 내용을 편집할 수 있어요.</div>
    <div id="blockList"></div>
    <p class="lock-note">* 인트로는 항상 맨 위에 고정돼요.</p>`;
  const list = p.querySelector('#blockList');

  config.blocks.forEach((block, idx) => {
    const meta = BLOCK_META[block.type];
    if (!meta) return;
    const item = document.createElement('div');
    item.className = 'block-item' + (block.enabled ? '' : ' off');
    item.draggable = !meta.locked;
    item.dataset.type = block.type;
    item.innerHTML = `
      <span class="drag-handle">${meta.locked ? I.lock : I.grip}</span>
      <div class="block-name">${meta.name}<small>${meta.desc}</small></div>
      ${meta.locked ? '' : `
      <div class="order-btns">
        <button data-move="-1" aria-label="위로">${I.up}</button>
        <button data-move="1" aria-label="아래로">${I.down}</button>
      </div>
      <label class="switch"><input type="checkbox" ${block.enabled ? 'checked' : ''}><span class="slider"></span></label>`}
    `;

    // 블록 클릭 → 상세 편집
    item.addEventListener('click', () => { selectedBlock = block.type; renderLeftPanel(); });

    // 순서 버튼
    item.querySelectorAll('[data-move]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveBlock(block.type, Number(btn.dataset.move));
      });
    });

    // 토글
    const checkbox = item.querySelector('input[type=checkbox]');
    if (checkbox) {
      checkbox.addEventListener('click', (e) => e.stopPropagation());
      item.querySelector('.switch').addEventListener('click', (e) => e.stopPropagation());
      checkbox.addEventListener('change', () => {
        block.enabled = checkbox.checked;
        item.classList.toggle('off', !block.enabled);
        markChanged();
        toast(`'${meta.name}' 블록을 ${block.enabled ? '추가했어요' : '숨겼어요'}`);
      });
    }

    // 드래그 정렬
    if (!meta.locked) {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', block.type);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
    }
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = e.dataTransfer.getData('text/plain');
      if (from && from !== block.type) reorderBlock(from, block.type);
    });

    list.appendChild(item);
  });
}

function moveBlock(type, dir) {
  const i = config.blocks.findIndex((b) => b.type === type);
  const j = i + dir;
  if (j < 1 || j >= config.blocks.length) return; // 0은 인트로 고정
  [config.blocks[i], config.blocks[j]] = [config.blocks[j], config.blocks[i]];
  renderBlockList();
  markChanged();
}

function reorderBlock(fromType, toType) {
  const from = config.blocks.find((b) => b.type === fromType);
  const rest = config.blocks.filter((b) => b.type !== fromType);
  const idx = Math.max(1, rest.findIndex((b) => b.type === toType));
  rest.splice(idx, 0, from);
  config.blocks = rest;
  renderBlockList();
  markChanged();
}

/* ───────── 블록 상세 편집 폼 ───────── */

function propsOf(type) {
  return config.blocks.find((b) => b.type === type).props;
}

function field(label, bind, value, { type = 'text', placeholder = '' } = {}) {
  return `
    <div class="field">
      <label>${label}</label>
      <input type="${type}" data-bind="${bind}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}">
    </div>`;
}

function areaField(label, bind, value, { rows = 4, placeholder = '' } = {}) {
  return `
    <div class="field">
      <label>${label}</label>
      <textarea data-bind="${bind}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value ?? '')}</textarea>
    </div>`;
}

function formBody(type) {
  const props = propsOf(type);
  const { couple, wedding } = config;
  switch (type) {
    case 'intro':
      return `
        ${field('신랑 이름', 'couple.groom.name', couple.groom.name, { placeholder: '민준' })}
        ${field('신부 이름', 'couple.bride.name', couple.bride.name, { placeholder: '서연' })}
        ${field('예식 일시', 'wedding.date', toLocalInput(wedding.date), { type: 'datetime-local' })}
        ${field('메인 사진 URL', 'prop.mainPhotoUrl', props.mainPhotoUrl, { type: 'url', placeholder: 'https://…' })}
        <p class="form-hint">구글 드라이브 공유 링크를 붙여넣으면 자동으로 이미지 주소로 바꿔드려요. (드라이브 파일은 "링크가 있는 모든 사용자 보기"로 공유해 주세요)</p>`;
    case 'greeting':
      return `
        ${areaField('인사말', 'prop.message', props.message, { rows: 5, placeholder: '초대 문구를 적어주세요' })}
        <div class="form-section">혼주 소개</div>
        ${field('신랑 아버지', 'couple.groom.father', couple.groom.father)}
        ${field('신랑 어머니', 'couple.groom.mother', couple.groom.mother)}
        ${field('신부 아버지', 'couple.bride.father', couple.bride.father)}
        ${field('신부 어머니', 'couple.bride.mother', couple.bride.mother)}`;
    case 'dday':
      return '<p class="form-empty">인트로에서 설정한 예식 일시를 기준으로 남은 시간이 자동 계산돼요. 따로 설정할 내용이 없어요.</p>';
    case 'gallery':
      return `
        ${areaField('사진 URL 목록', 'special.photos', (props.photos || []).join('\n'), { rows: 7, placeholder: '한 줄에 사진 URL 하나씩 붙여넣어 주세요' })}
        <p class="form-hint">구글 드라이브 공유 링크도 그대로 붙여넣을 수 있어요. 사진을 탭하면 전체화면으로 크게 보여요.</p>`;
    case 'location':
      return `
        ${field('예식장 이름', 'wedding.venueName', wedding.venueName, { placeholder: '○○웨딩홀' })}
        ${field('홀 이름', 'wedding.venueHall', wedding.venueHall, { placeholder: '그랜드홀 3층' })}
        ${field('주소', 'wedding.address', wedding.address, { placeholder: '서울시 ○○구 ○○로 123' })}
        ${areaField('교통 안내', 'wedding.transport', wedding.transport, { rows: 3, placeholder: '지하철 · 버스 · 주차 안내' })}`;
    case 'accounts':
      return `
        <div class="form-section">신랑측 계좌</div>
        <div id="accGroom"></div>
        <div class="form-section">신부측 계좌</div>
        <div id="accBride"></div>`;
    case 'rsvp':
      return '<p class="form-empty">하객이 이름과 참석 여부, 인원을 남기면 구글시트 rsvp 탭에 자동으로 기록돼요. 따로 설정할 내용이 없어요.</p>';
    case 'guestbook':
      return '<p class="form-empty">하객이 남긴 축하 메시지가 구글시트 guestbook 탭에 쌓이고, 청첩장에 최근 메시지가 보여요. 따로 설정할 내용이 없어요.</p>';
    case 'contact':
      return `
        ${field('신랑 전화번호', 'couple.groom.phone', couple.groom.phone, { type: 'tel', placeholder: '010-0000-0000' })}
        ${field('신부 전화번호', 'couple.bride.phone', couple.bride.phone, { type: 'tel', placeholder: '010-0000-0000' })}`;
    default:
      return '';
  }
}

function renderBlockForm(type) {
  const meta = BLOCK_META[type];
  const p = els.leftPanel;
  p.innerHTML = `
    <button class="form-back" id="formBack">${I.back}블록 목록</button>
    <div class="panel-title">${meta.name}</div>
    <div class="panel-desc">${meta.desc}</div>
    ${formBody(type)}`;

  p.querySelector('#formBack').addEventListener('click', () => {
    selectedBlock = null;
    renderLeftPanel();
  });

  // 공통 바인딩: config 경로 / 블록 props / 특수 처리
  p.querySelectorAll('[data-bind]').forEach((input) => {
    input.addEventListener('input', () => {
      const bind = input.dataset.bind;
      let value = input.value;
      if (bind === 'wedding.date') {
        if (!value) return;
        config.wedding.date = `${value}:00+09:00`;
      } else if (bind === 'special.photos') {
        propsOf(type).photos = value.split('\n').map((s) => s.trim()).filter(Boolean);
      } else if (bind.startsWith('prop.')) {
        propsOf(type)[bind.slice(5)] = value;
      } else {
        setPath(config, bind, value);
      }
      markChanged();
    });
  });

  if (type === 'accounts') {
    renderAccountRows(p.querySelector('#accGroom'), 'groomAccounts');
    renderAccountRows(p.querySelector('#accBride'), 'brideAccounts');
  }
}

function renderAccountRows(container, key) {
  const props = propsOf('accounts');
  const list = props[key] || (props[key] = []);
  container.innerHTML = '';
  list.forEach((acc, idx) => {
    const row = document.createElement('div');
    row.className = 'acc-edit-row';
    row.innerHTML = `
      <input type="text" data-k="bank" value="${esc(acc.bank)}" placeholder="은행">
      <input type="text" data-k="number" value="${esc(acc.number)}" placeholder="계좌번호" inputmode="numeric">
      <input type="text" data-k="holder" value="${esc(acc.holder)}" placeholder="예금주">
      <button class="row-del" aria-label="삭제">${I.trash}</button>`;
    row.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        acc[input.dataset.k] = input.value;
        markChanged();
      });
    });
    row.querySelector('.row-del').addEventListener('click', () => {
      list.splice(idx, 1);
      renderAccountRows(container, key);
      markChanged();
    });
    container.appendChild(row);
  });
  const add = document.createElement('button');
  add.className = 'add-row-btn';
  add.textContent = '계좌 추가';
  add.addEventListener('click', () => {
    list.push({ bank: '', number: '', holder: '' });
    renderAccountRows(container, key);
    markChanged();
  });
  container.appendChild(add);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

function toLocalInput(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ───────── 오른쪽 패널: 스와치 + AI 채팅 ───────── */

function renderThemeRow() {
  els.themeRow.innerHTML = '';
  for (const [key, sw] of Object.entries(STARTER_SWATCHES)) {
    const btn = document.createElement('button');
    btn.className = 'theme-swatch' + (config.design.tokens.bg === sw.tokens.bg ? ' on' : '');
    btn.innerHTML = `
      <div class="sw" style="background:linear-gradient(135deg,${sw.tokens.bg} 50%,${sw.tokens.accent} 50%)"></div>
      <span>${sw.label}</span>`;
    btn.addEventListener('click', () => applySwatch(key));
    els.themeRow.appendChild(btn);
  }
}

function applySwatch(key) {
  const sw = STARTER_SWATCHES[key];
  Object.assign(config.design.tokens, sw.tokens);
  renderThemeRow();
  markChanged();
  return sw;
}

function wireChat() {
  const chips = document.getElementById('quickChips');
  const swatchChips = [
    ['크림 핑크로', 'pink'], ['크림 블루로', 'blue'], ['연한 그린으로', 'green'], ['크림으로', 'cream'],
  ];
  for (const [label, key] of swatchChips) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => {
      addMsg(`${STARTER_SWATCHES[key].label} 톤으로 바꿔줘`, 'user');
      const sw = applySwatch(key);
      addMsg(`${sw.label} 톤으로 바꿨어요. 은은하고 부드러운 분위기예요.`, 'ai', `${sw.label} 적용됨`);
    });
    chips.appendChild(b);
  }

  const send = () => {
    const text = els.chatInput.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    els.chatInput.value = '';
    // Gemini 연결(6단계) 전까지 안내만
    setTimeout(() => {
      addMsg('AI 자유 디자인은 곧 연결돼요. 지금은 위의 스와치 4종과 빠른 버튼으로 색감을 바꿔볼 수 있어요.', 'ai');
    }, 350);
  };
  document.getElementById('chatSend').addEventListener('click', send);
  els.chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}

function addMsg(text, who, applied) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + (who === 'user' ? 'user' : 'ai');
  div.textContent = text;
  if (applied) {
    const span = document.createElement('span');
    span.className = 'applied';
    span.innerHTML = `${I.check}${esc(applied)}`;
    div.appendChild(span);
  }
  els.chatScroll.appendChild(div);
  els.chatScroll.scrollTop = els.chatScroll.scrollHeight;
}
