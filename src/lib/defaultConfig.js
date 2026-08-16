// ─────────────────────────────────────────────────────────────
// 청첩장 설정 JSON — 기본값(스키마 버전 1)
// 청첩장 하나 = 설정 JSON 하나. 시트 config!A1 에 문자열로 저장된다.
// ─────────────────────────────────────────────────────────────

/** 시작점 스와치 4종 — 프리셋이 아니라 "토큰 값을 채워주는 버튼"일 뿐이다 */
export const STARTER_SWATCHES = {
  cream: {
    label: '크림',
    tokens: { bg: '#FDFBF7', ink: '#5B534A', sub: '#A99E90', accent: '#C2A176', line: '#F0EAE0', card: '#FFFFFF' },
  },
  pink: {
    label: '크림 핑크',
    tokens: { bg: '#FEF9F7', ink: '#6B5A5C', sub: '#B99FA3', accent: '#DE8E99', line: '#F6E7E7', card: '#FFFFFF' },
  },
  blue: {
    label: '크림 블루',
    tokens: { bg: '#F9FBFD', ink: '#55606C', sub: '#97A5B4', accent: '#8FB4D4', line: '#E7EEF4', card: '#FFFFFF' },
  },
  green: {
    label: '연한 그린',
    tokens: { bg: '#F9FBF8', ink: '#59655C', sub: '#9BAA9E', accent: '#93B99C', line: '#E9F0E9', card: '#FFFFFF' },
  },
};

export function defaultConfig() {
  return {
    version: 1,
    design: {
      tokens: {
        ...STARTER_SWATCHES.cream.tokens,
        displayFont: 'Gowun Batang',
        bodyFont: 'Noto Sans KR',
        radius: '14px',
        sectionSpacing: '44px',
        divider: 'solid',
      },
      customCss: '',
    },
    couple: {
      groom: { name: '', phone: '', father: '', mother: '' },
      bride: { name: '', phone: '', father: '', mother: '' },
    },
    wedding: {
      date: '2027-05-22T12:00:00+09:00',
      venueName: '',
      venueHall: '',
      address: '',
      transport: '',
    },
    blocks: [
      { type: 'intro', enabled: true, props: { mainPhotoUrl: '' } },
      { type: 'greeting', enabled: true, props: { message: '' } },
      { type: 'dday', enabled: true, props: {} },
      { type: 'gallery', enabled: true, props: { photos: [] } },
      { type: 'location', enabled: true, props: {} },
      { type: 'accounts', enabled: true, props: { groomAccounts: [], brideAccounts: [] } },
      { type: 'rsvp', enabled: true, props: {} },
      { type: 'guestbook', enabled: true, props: {} },
      { type: 'contact', enabled: true, props: {} },
    ],
  };
}

/** 외부(시트/AI)에서 온 JSON을 기본값 위에 안전하게 병합 */
export function normalizeConfig(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const out = structuredClone(base);

  if (raw.design && typeof raw.design === 'object') {
    Object.assign(out.design.tokens, raw.design.tokens || {});
    if (typeof raw.design.customCss === 'string') out.design.customCss = raw.design.customCss;
  }
  for (const side of ['groom', 'bride']) {
    Object.assign(out.couple[side], raw.couple?.[side] || {});
  }
  Object.assign(out.wedding, raw.wedding || {});

  if (Array.isArray(raw.blocks) && raw.blocks.length) {
    const known = new Map(out.blocks.map((b) => [b.type, b]));
    const blocks = [];
    for (const b of raw.blocks) {
      const def = known.get(b?.type);
      if (!def) continue; // 모르는 블록 타입은 무시
      known.delete(b.type);
      blocks.push({ type: b.type, enabled: b.enabled !== false, props: { ...def.props, ...(b.props || {}) } });
    }
    blocks.push(...known.values()); // 누락된 블록은 기본값으로 뒤에 추가
    // intro는 항상 0번 고정
    const i = blocks.findIndex((b) => b.type === 'intro');
    if (i > 0) blocks.unshift(blocks.splice(i, 1)[0]);
    out.blocks = blocks;
  }
  return out;
}
