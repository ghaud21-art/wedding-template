// ─────────────────────────────────────────────────────────────
// 블록 렌더러 — 편집기 미리보기와 하객 뷰어가 공유한다.
//
//   renderInvitation(invEl, config, ctx) → cleanup 함수 반환
//
// ctx (모두 선택):
//   guestbook: [{name, message, timestamp}]  방명록 목록
//   onRsvp(payload): Promise<boolean>        RSVP 제출 핸들러
//   onGuestbook(payload): Promise<boolean>   방명록 제출 핸들러
//   toast(msg)                               알림 함수
// ─────────────────────────────────────────────────────────────
import {
  esc, parseDate, fmtDateDots, fmtDateShort, fmtWeekday, fmtTimeKorean, copyText,
} from '../lib/util.js';
import { toDirectImageUrl } from '../lib/driveUrl.js';

// 인라인 SVG 아이콘 (feather 계열 스트로크 스타일)
const ICONS = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

/* ───────── 블록별 HTML 생성 ───────── */

function introHtml(props, config) {
  const { couple, wedding } = config;
  const d = parseDate(wedding.date);
  const photo = toDirectImageUrl(props.mainPhotoUrl);
  const venue = [d && `${fmtWeekday(d)} ${fmtTimeKorean(d)}`, wedding.venueHall || wedding.venueName]
    .filter(Boolean).join(' · ');
  return `
    <section class="inv-intro" data-block="intro">
      <div class="date-top">${d ? fmtDateDots(d) : ''}</div>
      <h1>${esc(couple.groom.name || '신랑')}<span class="amp">&amp;</span>${esc(couple.bride.name || '신부')}</h1>
      <div class="venue">${esc(venue)}</div>
      ${photo
        ? `<img class="main-photo" src="${esc(photo)}" alt="메인 사진" loading="lazy">`
        : '<div class="main-photo-empty">MAIN PHOTO</div>'}
    </section>`;
}

function greetingHtml(props, config) {
  const { groom, bride } = config.couple;
  const parents = [];
  if (groom.father || groom.mother) {
    parents.push(`<b>${esc([groom.father, groom.mother].filter(Boolean).join(' · '))}</b>의 아들 <b>${esc(groom.name)}</b>`);
  }
  if (bride.father || bride.mother) {
    parents.push(`<b>${esc([bride.father, bride.mother].filter(Boolean).join(' · '))}</b>의 딸 <b>${esc(bride.name)}</b>`);
  }
  return `
    <section class="inv-greeting" data-block="greeting">
      <div class="sec-eyebrow">INVITATION</div>
      <div class="sec-title">소중한 분들을 초대합니다</div>
      <p>${esc(props.message || '저희 두 사람이 사랑과 믿음으로\n한 가정을 이루게 되었습니다.')}</p>
      ${parents.length ? `<div class="parents">${parents.join('<br>')}</div>` : ''}
    </section>`;
}

function ddayHtml() {
  return `
    <section class="inv-dday" data-block="dday">
      <div class="sec-eyebrow">D-DAY</div>
      <div class="sec-title">결혼식까지</div>
      <div class="dday-grid">
        <div class="dday-cell"><b data-dd="d">00</b><span>DAYS</span></div>
        <div class="dday-cell"><b data-dd="h">00</b><span>HOURS</span></div>
        <div class="dday-cell"><b data-dd="m">00</b><span>MIN</span></div>
        <div class="dday-cell"><b data-dd="s">00</b><span>SEC</span></div>
      </div>
      <div class="dday-msg">두 사람의 결혼식이 <b data-dd="text">···</b> 남았습니다.</div>
    </section>`;
}

function galleryHtml(props) {
  const photos = (props.photos || []).map(toDirectImageUrl).filter(Boolean);
  const cells = photos.length
    ? photos.map((src, i) => `<button type="button" data-gal-idx="${i}" aria-label="사진 ${i + 1} 크게 보기"><img src="${esc(src)}" alt="갤러리 사진 ${i + 1}" loading="lazy"></button>`).join('')
    : Array.from({ length: 6 }, () => '<div class="gal-ph"></div>').join('');
  return `
    <section data-block="gallery">
      <div class="sec-eyebrow">GALLERY</div>
      <div class="sec-title">우리의 순간들</div>
      <div class="gal-grid">${cells}</div>
    </section>`;
}

function locationHtml(props, config) {
  const { wedding } = config;
  const name = [wedding.venueName, wedding.venueHall].filter(Boolean).join(' ');
  const query = encodeURIComponent(wedding.venueName || wedding.address || '');
  const info = [wedding.address, wedding.transport].filter(Boolean).join('\n');
  return `
    <section data-block="location">
      <div class="sec-eyebrow">LOCATION</div>
      <div class="sec-title">오시는 길</div>
      <div class="map-box">
        <div class="map-canvas"><div class="map-pin"></div></div>
        <div class="map-info">
          <b>${esc(name || '예식장')}</b>
          <p>${esc(info)}</p>
          <div class="map-btns">
            <a href="https://map.naver.com/p/search/${query}" target="_blank" rel="noopener">네이버지도</a>
            <a href="https://map.kakao.com/link/search/${query}" target="_blank" rel="noopener">카카오맵</a>
            <a href="tmap://search?name=${query}">티맵</a>
          </div>
        </div>
      </div>
    </section>`;
}

function accountRows(list) {
  return (list || []).map((a) => {
    const text = [a.bank, a.number, a.holder].filter(Boolean).join(' ');
    return `<div class="acc-row"><span>${esc(text)}</span><button type="button" class="copy-btn" data-copy="${esc([a.bank, a.number].filter(Boolean).join(' '))}">복사</button></div>`;
  }).join('');
}

function accountsHtml(props) {
  const groups = [
    { label: '신랑측 계좌번호', list: props.groomAccounts, open: true },
    { label: '신부측 계좌번호', list: props.brideAccounts, open: false },
  ].filter((g) => (g.list || []).length);
  if (!groups.length) {
    groups.push({ label: '신랑측 계좌번호', list: [], open: true }, { label: '신부측 계좌번호', list: [], open: false });
  }
  return `
    <section data-block="accounts">
      <div class="sec-eyebrow">GIFT</div>
      <div class="sec-title">마음 전하실 곳</div>
      ${groups.map((g) => `
        <div class="acc${g.open ? ' open' : ''}">
          <button type="button" class="acc-head">${esc(g.label)} <span class="arrow">${ICONS.chevronDown}</span></button>
          <div class="acc-body">${accountRows(g.list) || '<div class="acc-row"><span>계좌 정보가 아직 없어요</span></div>'}</div>
        </div>`).join('')}
    </section>`;
}

function rsvpHtml() {
  return `
    <section data-block="rsvp">
      <div class="sec-eyebrow">R.S.V.P</div>
      <div class="sec-title">참석 의사 전달</div>
      <div class="rsvp-card">
        <input type="text" data-rsvp="name" placeholder="성함을 입력해 주세요" maxlength="20">
        <div class="seg" data-rsvp="seg">
          <button type="button" class="on" data-val="참석">참석할게요</button>
          <button type="button" data-val="불참">참석이 어려워요</button>
        </div>
        <input type="number" data-rsvp="headcount" placeholder="동행 인원 포함 총 인원 (숫자)" min="1" max="20">
        <button type="button" class="rsvp-submit" data-rsvp="submit">전달하기</button>
      </div>
    </section>`;
}

function guestbookHtml(props, config, ctx) {
  const entries = ctx.guestbook || [];
  const list = entries.length
    ? entries.map((g) => `
        <div class="gb-msg"><b>${esc(g.name)}</b><time>${esc(g.timestamp || '')}</time>
        <p>${esc(g.message)}</p></div>`).join('')
    : '<div class="gb-empty">첫 번째 축하 메시지를 남겨주세요</div>';
  return `
    <section data-block="guestbook">
      <div class="sec-eyebrow">GUESTBOOK</div>
      <div class="sec-title">방명록</div>
      <div data-gb="list">${list}</div>
      <div class="gb-form">
        <input type="text" data-gb="name" placeholder="이름" maxlength="20">
        <textarea data-gb="message" rows="2" placeholder="축하 메시지를 남겨주세요" maxlength="300"></textarea>
        <button type="button" data-gb="submit">남기기</button>
      </div>
    </section>`;
}

function contactCell(role, person) {
  const phone = String(person.phone || '').trim();
  return `
    <div class="contact-cell">
      <b>${esc(role)} ${esc(person.name)}</b><span>${esc(phone)}</span>
      ${phone ? `
      <div class="cc-btns">
        <a href="tel:${esc(phone)}" aria-label="${esc(role)}에게 전화">${ICONS.phone}</a>
        <a href="sms:${esc(phone)}" aria-label="${esc(role)}에게 문자">${ICONS.sms}</a>
      </div>` : ''}
    </div>`;
}

function contactHtml(props, config) {
  return `
    <section data-block="contact">
      <div class="sec-eyebrow">CONTACT</div>
      <div class="sec-title">연락하기</div>
      <div class="contact-grid">
        ${contactCell('신랑', config.couple.groom)}
        ${contactCell('신부', config.couple.bride)}
      </div>
    </section>`;
}

function footerHtml(config) {
  const d = parseDate(config.wedding.date);
  const names = [config.couple.groom.name, config.couple.bride.name].filter(Boolean).join(' & ');
  return `
    <section class="inv-footer" data-block="footer">
      <p>${esc(names)}${names && d ? ' · ' : ''}${d ? fmtDateShort(d) : ''}</p>
    </section>`;
}

const RENDERERS = {
  intro: introHtml,
  greeting: greetingHtml,
  dday: ddayHtml,
  gallery: galleryHtml,
  location: locationHtml,
  accounts: accountsHtml,
  rsvp: rsvpHtml,
  guestbook: guestbookHtml,
  contact: contactHtml,
};

/* ───────── 메인 렌더 ───────── */

export function renderInvitation(invEl, config, ctx = {}) {
  const notify = ctx.toast || (() => {});
  const html = config.blocks
    .filter((b) => b.enabled)
    .map((b) => RENDERERS[b.type]?.(b.props || {}, config, ctx) || '')
    .join('');
  invEl.innerHTML = html + footerHtml(config);

  const cleanups = [];

  // D-day 카운트다운
  const ddayEl = invEl.querySelector('[data-block="dday"]');
  const target = parseDate(config.wedding.date);
  if (ddayEl && target) {
    const cells = {
      d: ddayEl.querySelector('[data-dd="d"]'),
      h: ddayEl.querySelector('[data-dd="h"]'),
      m: ddayEl.querySelector('[data-dd="m"]'),
      s: ddayEl.querySelector('[data-dd="s"]'),
      text: ddayEl.querySelector('[data-dd="text"]'),
    };
    const tick = () => {
      const diff = Math.max(0, target - new Date());
      cells.d.textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
      cells.h.textContent = String(Math.floor(diff / 3600000) % 24).padStart(2, '0');
      cells.m.textContent = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
      cells.s.textContent = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
      cells.text.textContent = diff > 0 ? `${Math.floor(diff / 86400000)}일` : '오늘';
    };
    tick();
    const timer = setInterval(tick, 1000);
    cleanups.push(() => clearInterval(timer));
  }

  // 갤러리 전체화면 뷰어
  const galButtons = invEl.querySelectorAll('[data-gal-idx]');
  if (galButtons.length) {
    const photos = (config.blocks.find((b) => b.type === 'gallery')?.props.photos || [])
      .map(toDirectImageUrl).filter(Boolean);
    galButtons.forEach((btn) => {
      btn.addEventListener('click', () => openGalleryViewer(photos, Number(btn.dataset.galIdx), cleanups));
    });
  }

  // 계좌 아코디언 + 복사
  invEl.querySelectorAll('.acc-head').forEach((head) => {
    head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
  });
  invEl.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await copyText(btn.dataset.copy);
      notify(ok ? '계좌번호가 복사되었어요' : '복사에 실패했어요');
      if (ok) {
        btn.textContent = '복사됨';
        setTimeout(() => { btn.textContent = '복사'; }, 1500);
      }
    });
  });

  // RSVP
  const rsvpEl = invEl.querySelector('[data-block="rsvp"]');
  if (rsvpEl) {
    const seg = rsvpEl.querySelector('[data-rsvp="seg"]');
    seg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      });
    });
    rsvpEl.querySelector('[data-rsvp="submit"]').addEventListener('click', async (e) => {
      const name = rsvpEl.querySelector('[data-rsvp="name"]').value.trim();
      const attending = seg.querySelector('button.on')?.dataset.val || '참석';
      const headcount = rsvpEl.querySelector('[data-rsvp="headcount"]').value.trim() || '1';
      if (!name) { notify('성함을 입력해 주세요'); return; }
      if (!ctx.onRsvp) { notify('미리보기에서는 전송되지 않아요'); return; }
      const btn = e.currentTarget;
      btn.disabled = true;
      const ok = await ctx.onRsvp({ name, attending, headcount, memo: '' });
      btn.disabled = false;
      if (ok) {
        notify('참석 의사가 전달되었어요. 감사합니다!');
        rsvpEl.querySelector('[data-rsvp="name"]').value = '';
        rsvpEl.querySelector('[data-rsvp="headcount"]').value = '';
      } else {
        notify('전송에 실패했어요. 잠시 후 다시 시도해 주세요');
      }
    });
  }

  // 방명록
  const gbEl = invEl.querySelector('[data-block="guestbook"]');
  if (gbEl) {
    gbEl.querySelector('[data-gb="submit"]').addEventListener('click', async (e) => {
      const nameInput = gbEl.querySelector('[data-gb="name"]');
      const msgInput = gbEl.querySelector('[data-gb="message"]');
      const name = nameInput.value.trim();
      const message = msgInput.value.trim();
      if (!name || !message) { notify('이름과 메시지를 모두 입력해 주세요'); return; }
      if (!ctx.onGuestbook) { notify('미리보기에서는 저장되지 않아요'); return; }
      const btn = e.currentTarget;
      btn.disabled = true;
      const ok = await ctx.onGuestbook({ name, message });
      btn.disabled = false;
      if (ok) {
        // 목록 맨 앞에 즉시 반영
        const list = gbEl.querySelector('[data-gb="list"]');
        list.querySelector('.gb-empty')?.remove();
        const div = document.createElement('div');
        div.className = 'gb-msg';
        div.innerHTML = `<b>${esc(name)}</b><time>방금</time><p>${esc(message)}</p>`;
        list.prepend(div);
        nameInput.value = '';
        msgInput.value = '';
        notify('축하 메시지를 남겼어요. 감사합니다!');
      } else {
        notify('저장에 실패했어요. 잠시 후 다시 시도해 주세요');
      }
    });
  }

  return () => cleanups.forEach((fn) => fn());
}

/* ───────── 갤러리 전체화면 뷰어 ───────── */

function openGalleryViewer(photos, startIdx, cleanups) {
  const overlay = document.createElement('div');
  overlay.className = 'gal-viewer';
  overlay.innerHTML = `
    <button type="button" class="gv-close" aria-label="닫기">${ICONS.x}</button>
    <div class="gv-track">
      ${photos.map((src, i) => `<div class="gv-slide"><img src="${esc(src)}" alt="사진 ${i + 1}"></div>`).join('')}
    </div>
    <div class="gv-count">${startIdx + 1} / ${photos.length}</div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const track = overlay.querySelector('.gv-track');
  const count = overlay.querySelector('.gv-count');
  // 시작 위치로 즉시 이동
  requestAnimationFrame(() => { track.scrollLeft = track.clientWidth * startIdx; });
  track.addEventListener('scroll', () => {
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    count.textContent = `${Math.min(idx + 1, photos.length)} / ${photos.length}`;
  }, { passive: true });

  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.querySelector('.gv-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.classList.contains('gv-slide')) close(); });
  document.addEventListener('keydown', onKey);
  cleanups.push(close);
}
