const curriculum = [
  {
    day: 1,
    radical: {
      char: '氵',
      ttsChar: '水',
      pinyin: 'shuǐ',
      cnName: '三点水', // 중국어 부수 이름
      cnPinyin: 'sān diǎn shuǐ', // 부수 이름 병음
      name: '물 수 변',
      desc: '물이 흐르는 모양. 액체와 관련된 글자를 만듭니다.',
    },
    related: [
      {
        char: '河',
        pinyin: 'hé',
        name: '강 하',
        desc: '물(氵)과 소리를 나타내는 가(可)가 합쳐져 "강"을 뜻합니다.',
      },
      {
        char: '洗',
        pinyin: 'xǐ',
        name: '씻을 세',
        desc: '발을 먼저(先) 물(氵)에 담가 "씻다"는 뜻입니다.',
      },
      {
        char: '海',
        pinyin: 'hǎi',
        name: '바다 해',
        desc: '물(氵)이 모여 이루어진 넓은 "바다"를 뜻합니다.',
      },
      {
        char: '洋',
        pinyin: 'yáng',
        name: '큰 바다 양',
        desc: '물(氵)과 양(羊)이 합쳐져 "큰 바다"를 뜻합니다.',
      },
      {
        char: '流',
        pinyin: 'liú',
        name: '흐를 류',
        desc: '물(氵)이 이리저리 "흐르다"는 뜻입니다.',
      },
    ],
  },
  {
    day: 2,
    radical: {
      char: '扌',
      ttsChar: '手',
      pinyin: 'shǒu',
      cnName: '提手旁',
      cnPinyin: 'tí shǒu páng',
      name: '손 수 변',
      desc: '손으로 하는 물리적인 행동을 나타냅니다.',
    },
    related: [
      {
        char: '打',
        pinyin: 'dǎ',
        name: '칠 타',
        desc: '손(扌)으로 "치다"라는 뜻입니다.',
      },
      {
        char: '推',
        pinyin: 'tuī',
        name: '밀 추',
        desc: '손(扌)으로 "밀다"라는 뜻입니다.',
      },
      {
        char: '拉',
        pinyin: 'lā',
        name: '끌 납',
        desc: '손(扌)으로 "끌어당기다"라는 뜻입니다.',
      },
      {
        char: '提',
        pinyin: 'tí',
        name: '끌 제',
        desc: '손(扌)으로 물건을 "들어 올리다"라는 뜻입니다.',
      },
      {
        char: '抱',
        pinyin: 'bào',
        name: '안을 포',
        desc: '손(扌)으로 "안다, 품다"라는 뜻입니다.',
      },
    ],
  },
  {
    day: 3,
    radical: {
      char: '亻',
      ttsChar: '人',
      pinyin: 'rén',
      cnName: '单人旁',
      cnPinyin: 'dān rén páng',
      name: '사람 인 변',
      desc: '옆으로 선 사람의 모양입니다.',
    },
    related: [
      {
        char: '休',
        pinyin: 'xiū',
        name: '쉴 휴',
        desc: '사람(亻)이 나무(木) 옆에서 "쉬다"라는 뜻입니다.',
      },
      {
        char: '他',
        pinyin: 'tā',
        name: '다를 타 (그)',
        desc: '사람(亻)과 어조사(也)가 합쳐져 3인칭 "그"를 뜻합니다.',
      },
      {
        char: '作',
        pinyin: 'zuò',
        name: '지을 작',
        desc: '사람(亻)이 무언가를 "만들다, 하다"라는 뜻입니다.',
      },
      {
        char: '位',
        pinyin: 'wèi',
        name: '자리 위',
        desc: '사람(亻)이 서 있는 "위치나 자리"를 뜻합니다.',
      },
      {
        char: '体',
        pinyin: 'tǐ',
        name: '몸 체',
        desc: '사람(亻)의 근본(本)이 되는 "몸"을 뜻합니다.',
      },
    ],
  },
];

// 4일부터 30일까지 빈 데이터 자동 생성
for (let i = 4; i <= 30; i++) {
  curriculum.push({
    day: i,
    radical: {
      char: '木',
      ttsChar: '木',
      pinyin: 'mù',
      cnName: '木字旁',
      cnPinyin: 'mù zì páng',
      name: `Day ${i} 부수`,
      desc: '학습 데이터 준비 중...',
    },
    related: [
      {
        char: '林',
        pinyin: 'lín',
        name: '수풀 림',
        desc: '나무(木)가 여러 그루 모여 "숲"을 이룹니다.',
      },
      {
        char: '森',
        pinyin: 'sēn',
        name: '빽빽할 삼',
        desc: '나무(木)가 세 그루 모여 "빽빽한 숲"을 이룹니다.',
      },
      {
        char: '树',
        pinyin: 'shù',
        name: '나무 수',
        desc: '"나무" 그 자체를 뜻합니다.',
      },
    ],
  });
}
