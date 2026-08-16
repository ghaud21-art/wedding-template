// 데모/미리보기용 가상 샘플 데이터 — 실제 개인정보 금지
import { defaultConfig } from './defaultConfig.js';

export function sampleConfig() {
  const c = defaultConfig();
  c.couple.groom = { name: '민준', phone: '010-0000-0000', father: '김○○', mother: '박○○' };
  c.couple.bride = { name: '서연', phone: '010-0000-0000', father: '이○○', mother: '최○○' };
  c.wedding = {
    date: '2027-05-22T12:00:00+09:00',
    venueName: '○○웨딩홀',
    venueHall: '그랜드홀 3층',
    address: '서울시 ○○구 ○○로 123',
    transport: '지하철 2호선 ○○역 3번 출구 도보 5분',
  };
  const props = Object.fromEntries(c.blocks.map((b) => [b.type, b.props]));
  props.greeting.message = '서로의 하루를 궁금해하던 두 사람이\n이제 같은 계절을 살아가려 합니다.\n저희의 첫 페이지에\n귀한 걸음으로 함께해 주세요.';
  props.accounts.groomAccounts = [
    { bank: '○○은행', number: '000-0000-0000', holder: '김민준' },
    { bank: '○○은행', number: '000-0000-0000', holder: '김○○' },
  ];
  props.accounts.brideAccounts = [
    { bank: '○○은행', number: '000-0000-0000', holder: '이서연' },
  ];
  return c;
}

export function sampleGuestbook() {
  return [
    { name: '수진', message: '드디어 결혼하는구나! 세상에서 제일 행복하게 살아.', timestamp: '2월 1일' },
    { name: '직장 동료', message: '결혼 진심으로 축하드려요! 꼭 갈게요.', timestamp: '1월 28일' },
  ];
}
