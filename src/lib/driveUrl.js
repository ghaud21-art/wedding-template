// 구글 드라이브 공유 링크 → 이미지 직접 보기 URL 변환
//
// 지원 형태:
//   https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing
//   https://drive.google.com/open?id=<FILE_ID>
//   https://drive.google.com/uc?id=<FILE_ID>...
// 그 외 URL은 그대로 반환한다.

export function toDirectImageUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  let id = '';
  const m1 = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  const m2 = u.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([\w-]+)/);
  if (m1) id = m1[1];
  else if (m2) id = m2[1];
  if (!id) return u;
  // lh3 썸네일 서버가 <img> 직접 로드에 가장 안정적이다
  return `https://lh3.googleusercontent.com/d/${id}=w1600`;
}
