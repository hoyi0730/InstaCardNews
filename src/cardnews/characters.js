// Mood/context each character photo reads as, used to steer which pose Claude
// picks per card (see copy.js) and to look up the matching asset (template.js).
export const CHARACTER_POSES = [
  {
    id: 'classroom',
    description: '교실 책상에 앉아 화들짝 놀란 표정 — 의외의 사실, 충격적인 반전, 논쟁적인 내용에 어울림',
  },
  {
    id: 'selfie',
    description: '셀카 각도로 볼에 손을 대고 사랑스럽게 포즈 — 공감되는 감정, 다정한 마무리, 설레는 내용에 어울림',
  },
  {
    id: 'oliveyoung',
    description: '올리브영 매장에서 제품을 고르며 쇼핑하는 모습 — 소비·구매·지출·제품·쇼핑 관련 내용에 어울림',
  },
];
