// --- 전역 상태 관리 ---
let completedDays = [];
let currentStudyDay = null;
let studyFlow = [];
let currentStepIndex = 0;
let writer = null;
let currentHanziForTTS = '';
let currentLevel = 1;

// --- 💡 100개 부수 고유 명칭 병음 사전 ---
const radicalPinyinMap = {
  人字旁: 'rénzìpáng',
  口字旁: 'kǒuzìpáng',
  木字旁: 'mùzìpáng',
  水字旁: 'shuǐzìpáng',
  火字旁: 'huǒzìpáng',
  日字旁: 'rìzìpáng',
  月字旁: 'yuèzìpáng',
  山字旁: 'shānzìpáng',
  女字旁: 'nǚzìpáng',
  子字旁: 'zǐzìpáng',
  目字旁: 'mùzìpáng',
  耳字旁: 'ěrzìpáng',
  手字旁: 'shǒuzìpáng',
  足字旁: 'zúzìpáng',
  心字底: 'xīnzìdǐ',
  雨字头: 'yǔzìtóu',
  门字框: 'ménzìkuàng',
  宝盖头: 'bǎogàitóu',
  草字头: 'cǎozìtóu',
  言字旁: 'yánzìpáng',
  金字旁: 'jīnzìpáng',
  食字旁: 'shízìpáng',
  绞丝底: 'jiǎosīdǐ',
  单人旁: 'dānrénpáng',
  三点水: 'sāndiǎnshuǐ',
  提手旁: 'tíshǒupáng',
  竖心旁: 'shùxīnpáng',
  绞丝旁: 'jiǎosīpáng',
  反犬旁: 'fǎnquǎnpáng',
  示字旁: 'shìzìpáng',
  立刀旁: 'lìdāopáng',
  走之旁: 'zǒuzhīpáng',
  双耳旁: 'shuāngěrpáng',
  衣字旁: 'yīzìpáng',
  四点底: 'sìdiǎndǐ',
  两点水: 'liǎngdiǎnshuǐ',
  肉月旁: 'ròuyuèpáng',
  田字旁: 'tiánzìpáng',
  石字旁: 'shízìpáng',
  竹字头: 'zhúzìtóu',
  贝字旁: 'bèizìpáng',
  马字旁: 'mǎzìpáng',
  鸟字旁: 'niǎozìpáng',
  鱼字旁: 'yúzìpáng',
  牛字旁: 'niúzìpáng',
  羊字旁: 'yángzìpáng',
  王字旁: 'wángzìpáng',
  车字旁: 'chēzìpáng',
  舟字旁: 'zhōuzìpáng',
  羽字旁: 'yǔzìpáng',
  网字头: 'wǎngzìtóu',
  豆字旁: 'dòuzìpáng',
  瓜字旁: 'guāzìpáng',
  麻字头: 'mázìtóu',
  禾字旁: 'hézìpáng',
  米字旁: 'mǐzìpáng',
  广字旁: 'guǎngzìpáng',
  行字旁: 'xíngzìpáng',
  走字旁: 'zǒuzìpáng',
  止字旁: 'zhǐzìpáng',
  又字旁: 'yòuzìpáng',
  爪字头: 'zhǎozìtóu',
  反文旁: 'fǎnwénpáng',
  殳字旁: 'shūzìpáng',
  弓字旁: 'gōngzìpáng',
  戈字旁: 'gēzìpáng',
  聿字旁: 'yùzìpáng',
  身字旁: 'shēnzìpáng',
  斤字旁: 'jīnzìpáng',
  欠字旁: 'qiànzìpáng',
  折文旁: 'zhéwénpáng',
  寸字旁: 'cùnzìpáng',
  支字旁: 'zhīzìpáng',
  飞字旁: 'fēizìpáng',
  用字旁: 'yòngzìpáng',
  力字旁: 'lìzìpáng',
  及字旁: 'jízìpáng',
  音字旁: 'yīnzìpáng',
  色字旁: 'sèzìpáng',
  香字旁: 'xiāngzìpáng',
  生字旁: 'shēngzìpáng',
  老字头: 'lǎozìtóu',
  立字旁: 'lìzìpáng',
  自字旁: 'zìzìpáng',
  非字旁: 'fēizìpáng',
  白字旁: 'báizìpáng',
  黑字旁: 'hēizìpáng',
  青字旁: 'qīngzìpáng',
  赤字旁: 'chìzìpáng',
  页字旁: 'yèzìpáng',
  首字旁: 'shǒuzìpáng',
  面字旁: 'miànzìpáng',
  鼻字旁: 'bízìpáng',
  舌字旁: 'shézìpáng',
  骨字旁: 'gǔzìpáng',
  血字旁: 'xuèzìpáng',
};

// --- 💬 피드백 메시지 설정 ---
const praiseList = [
  '太棒了！',
  '非常好！',
  '完美！',
  '写得真好！',
  '完全正确！',
  '太出色了！',
  '了不起！',
  '笔顺很漂亮！',
  '继续保持！',
  '无可挑剔！',
];
const strokeEncouragementList = [
  '对！',
  '很好！',
  '漂亮！',
  '加油！',
  '不错！',
  '很棒！',
  '正确！',
];

const bgmTracks = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
const bgmAudio = new Audio();
bgmAudio.volume = 0.3;

function playRandomBGM() {
  const randomTrack = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
  bgmAudio.src = randomTrack;
  bgmAudio.play().catch((e) => console.log('BGM 대기', e));
}
bgmAudio.addEventListener('ended', playRandomBGM);

let availableVoices = [];
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}
window.speechSynthesis.onvoiceschanged = loadVoices;

let audioCtx = null;
function initAudio() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSoundEffect(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  const bufferSize = audioCtx.sampleRate * (type === 'tok' ? 0.05 : 0.25);
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();

  osc.type = 'sine';
  if (type === 'tok') {
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.stop(now + 0.08);
    noiseSource.stop(now + 0.08);
  } else {
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.8, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 600;
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.stop(now + 0.25);
    noiseSource.stop(now + 0.25);
  }

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  osc.start(now);
  noiseSource.start(now);
}

// --- 초기화 및 이벤트 바인딩 ---
function init() {
  loadVoices();
  const savedColor = localStorage.getItem('dothabit_color');
  if (savedColor) {
    document.getElementById('theme-color').value = savedColor;
    document.documentElement.style.setProperty('--theme-color', savedColor);
  }
  const savedProgress = localStorage.getItem('dothabit_progress');
  if (savedProgress) completedDays = JSON.parse(savedProgress);

  renderCalendar();
  bindEvents();
}

function bindEvents() {
  document.getElementById('intro-screen').addEventListener('click', () => {
    document.getElementById('intro-screen').style.display = 'none';
    document.getElementById('main-header').style.display = 'block';
    document.getElementById('level-selector').style.display = 'flex'; // 💡 드롭다운 보이기
    document.getElementById('calendar-view').style.display = 'grid';
    initAudio();
    playRandomBGM();
  });

  // 💡 드롭다운 열기/닫기 로직
  const levelSelector = document.getElementById('level-selector');
  document.getElementById('level-toggle-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    levelSelector.classList.toggle('open');
  });

  // 💡 드롭다운 바깥 영역 클릭 시 닫히게 처리
  document.addEventListener('click', (e) => {
    if (!levelSelector.contains(e.target))
      levelSelector.classList.remove('open');
  });

  // 💡 드롭다운 내부 레벨 버튼 클릭 시
  document.querySelectorAll('.lvl-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const level = parseInt(e.target.dataset.level);
      changeLevel(level, e.target.innerText);
    });
  });

  document.getElementById('theme-color').addEventListener('change', (e) => {
    const newColor = e.target.value;
    document.documentElement.style.setProperty('--theme-color', newColor);
    localStorage.setItem('dothabit_color', newColor);
  });

  document.getElementById('back-btn').addEventListener('click', showCalendar);
  document
    .getElementById('open-review-btn')
    .addEventListener('click', openReviewMenu);
  document
    .getElementById('close-review-btn')
    .addEventListener('click', showCalendar);
  document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    document.getElementById('setting-modal').style.display = 'none';
  });

  document
    .getElementById('tts-btn')
    .addEventListener('click', () => playTTS(currentHanziForTTS, 0.85));
  document.getElementById('hint-btn').addEventListener('click', playHint);
  document.getElementById('next-btn').addEventListener('click', handleAction);

  document
    .getElementById('writer-target')
    .addEventListener('pointerdown', () => playSoundEffect('tok'));
}

// 💡 레벨 변경 시 텍스트 업데이트 및 메뉴 닫기 로직 추가
function changeLevel(level, btnText) {
  currentLevel = level;

  // 메인 버튼 텍스트 변경
  document.getElementById('current-level-text').innerText = btnText;

  // Active 클래스 갱신
  document.querySelectorAll('.lvl-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
  });

  // 메뉴 닫기
  document.getElementById('level-selector').classList.remove('open');

  renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-view');
  container.innerHTML = '';

  const filteredData = curriculum.filter((d) => d.level === currentLevel);
  filteredData.forEach((data) => {
    const isCompleted = completedDays.includes(data.day);
    const card = document.createElement('div');
    card.className = `dot-card ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `<div style="font-size: 1.8rem; margin-bottom: 5px;">${data.emoji}</div><div class="dot-number">${data.radical.char}</div>`;
    card.onclick = () => openSettingModal(data);
    container.appendChild(card);
  });
}

function showCalendar() {
  document.getElementById('study-view').style.display = 'none';
  document.getElementById('review-list-view').style.display = 'none';
  document.getElementById('level-selector').style.display = 'flex';
  document.getElementById('calendar-view').style.display = 'grid';
  document.getElementById('main-header').style.display = 'block';
  if (writer) document.getElementById('writer-target').innerHTML = '';
  renderCalendar();
}

let pendingStudyDay = null;
function openSettingModal(dayData) {
  pendingStudyDay = dayData;
  document.getElementById('modal-day-title').innerText =
    `[ ${dayData.radical.char} ] 학습 설정`;
  document.getElementById('setting-modal').style.display = 'flex';
}

function confirmStudyStart(level) {
  document.getElementById('setting-modal').style.display = 'none';
  startStudy(pendingStudyDay, level);
}

function startStudy(dayData, level) {
  currentStudyDay = dayData;
  document.getElementById('level-selector').style.display = 'none';
  document.getElementById('calendar-view').style.display = 'none';
  document.getElementById('main-header').style.display = 'none';
  document.getElementById('study-view').style.display = 'flex';

  studyFlow = [];
  const rad = dayData.radical;

  studyFlow.push({
    type: 'trace',
    char: rad.char,
    ttsChar: rad.cnName || rad.char,
    pinyin: rad.pinyin,
    cnName: rad.cnName,
    title: `[부수] ${rad.name}`,
    desc: rad.desc,
  });
  studyFlow.push({
    type: 'blank',
    char: rad.char,
    ttsChar: rad.cnName || rad.char,
    pinyin: rad.pinyin,
    cnName: rad.cnName,
    title: `[부수] ${rad.name}`,
    desc: `밑그림 없이 기억을 떠올려 적어보세요.`,
  });

  let pool = [];
  if (level === 'beginner') pool = [...(dayData.related || [])].slice(0, 5);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  pool.forEach((item) => {
    const chars = Array.from(item.char);
    chars.forEach((c, idx) => {
      const multiCharTag =
        chars.length > 1 ? ` (${idx + 1}/${chars.length})` : '';
      studyFlow.push({
        type: 'trace',
        char: c,
        ttsChar: c,
        pinyin: item.pinyin,
        title: `${item.name}${multiCharTag}`,
        desc: item.desc || `획순을 따라 써보세요.`,
      });
      studyFlow.push({
        type: 'blank',
        char: c,
        ttsChar: c,
        pinyin: item.pinyin,
        title: `${item.name}${multiCharTag}`,
        desc: `백지에 정확히 써보세요.`,
      });
    });
  });

  currentStepIndex = 0;
  loadStep();
}

function openReviewMenu() {
  document.getElementById('level-selector').style.display = 'none';
  document.getElementById('calendar-view').style.display = 'none';
  document.getElementById('main-header').style.display = 'none';
  document.getElementById('review-list-view').style.display = 'block';

  const grid = document.getElementById('review-grid');
  grid.innerHTML = '';

  let hasData = false;
  completedDays.forEach((dayNum) => {
    const dayData = curriculum.find((c) => c.day === dayNum);
    if (!dayData) return;
    createReviewButton(grid, dayData.radical, true);
    dayData.related.forEach((rel) => createReviewButton(grid, rel, false));
    hasData = true;
  });

  if (!hasData)
    grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); padding:20px;">아직 완료한 학습이 없습니다. 캘린더에서 학습을 먼저 진행하세요!</p>`;
}

function createReviewButton(grid, charData, isRadical) {
  const btn = document.createElement('div');
  btn.className = 'review-item';
  btn.innerHTML = `<div class="review-char">${charData.char}</div><div class="review-name">${charData.name}</div>`;
  btn.onclick = () => start10xReview(charData, isRadical);
  grid.appendChild(btn);
}

function start10xReview(charData, isRadical) {
  document.getElementById('review-list-view').style.display = 'none';
  document.getElementById('study-view').style.display = 'flex';

  currentStudyDay = null;
  studyFlow = [];

  const titlePrefix = isRadical ? `[부수] ` : '';
  studyFlow.push({
    type: 'trace',
    char: charData.char,
    ttsChar: isRadical ? charData.cnName || charData.char : charData.char,
    pinyin: charData.pinyin,
    cnName: isRadical ? charData.cnName : null,
    title: `${titlePrefix}${charData.name}`,
    desc: charData.desc,
  });

  for (let i = 1; i <= 10; i++) {
    studyFlow.push({
      type: 'blank',
      char: charData.char,
      ttsChar: isRadical ? charData.cnName || charData.char : charData.char,
      pinyin: charData.pinyin,
      cnName: isRadical ? charData.cnName : null,
      title: `${titlePrefix}${charData.name} (${i}/10)`,
      desc: `기억을 되살려 완벽하게 써보세요.`,
    });
  }

  currentStepIndex = 0;
  loadStep();
}

function loadStep() {
  const stepData = studyFlow[currentStepIndex];
  currentHanziForTTS = stepData.ttsChar;

  document.getElementById('step-indicator').innerText =
    `Step ${currentStepIndex + 1} / ${studyFlow.length}`;
  document.getElementById('study-title-text').innerText = stepData.title;

  const pinyinDisplay = document.getElementById('pinyin-display');
  if (stepData.cnName) {
    const properPinyin = radicalPinyinMap[stepData.cnName] || stepData.pinyin;
    pinyinDisplay.innerText = `${stepData.cnName} [ ${properPinyin} ]`;
  } else {
    pinyinDisplay.innerText = stepData.pinyin ? `[ ${stepData.pinyin} ]` : '';
  }

  document.getElementById('study-desc').innerText = stepData.desc || '';
  const statusMsg = document.getElementById('status-msg');
  const nextBtn = document.getElementById('next-btn');

  nextBtn.disabled = true;
  nextBtn.innerText = '진행 중...';
  document.getElementById('writer-target').innerHTML = '';

  const isBlank = stepData.type === 'blank';
  statusMsg.innerText = isBlank
    ? '📝 획순을 떠올려보세요.'
    : '✨ 연한 선을 따라 획순을 익히세요.';
  statusMsg.style.color = 'var(--text-muted)';

  const containerEl = document.querySelector('.writer-container');
  const boxSize = containerEl.clientWidth || 450;

  writer = HanziWriter.create('writer-target', stepData.char, {
    width: boxSize,
    height: boxSize,
    padding: boxSize * 0.15,
    showCharacter: false,
    showOutline: !isBlank,
    strokeColor: 'rgba(30, 41, 59, 0.9)',
    outlineColor: '#cbd5e1',
    highlightColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color')
      .trim(),
    drawingWidth: boxSize * 0.12,
  });

  playTTS(currentHanziForTTS, 0.85);

  writer.quiz({
    onMistake: function () {
      statusMsg.innerText = '⚠️ 획순이나 방향이 어긋났습니다.';
      statusMsg.style.color = '#ea580c';
    },
    onCorrectStroke: function () {
      statusMsg.innerText = `👍 ${strokeEncouragementList[Math.floor(Math.random() * strokeEncouragementList.length)]}`;
      statusMsg.style.color = 'var(--success)';
    },
    onComplete: function () {
      playSoundEffect('tuk');
      const randomPraise =
        praiseList[Math.floor(Math.random() * praiseList.length)];
      statusMsg.innerText = `🎉 ${randomPraise}`;
      statusMsg.style.color = 'var(--theme-color)';
      setTimeout(() => playTTS(randomPraise, 1.0), 200);
      nextBtn.disabled = false;
      nextBtn.innerText =
        currentStepIndex === studyFlow.length - 1 ? '훈련 완료!' : '다음 단계';
    },
  });
}

function playTTS(text, rate) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;
  if (availableVoices.length === 0)
    availableVoices = window.speechSynthesis.getVoices();
  const zhVoices = availableVoices.filter(
    (v) => v.lang.includes('zh-CN') || v.lang.includes('zh_CN'),
  );
  const femaleVoice = zhVoices.find((v) =>
    [
      'xiaoxiao',
      'yaoyao',
      'ting-ting',
      'tingting',
      'meijia',
      'mei-jia',
      'lili',
      'huihui',
      'yating',
      'hanhan',
      'female',
      '여성',
    ].some((kw) => v.name.toLowerCase().includes(kw)),
  );
  utterance.voice = femaleVoice || (zhVoices.length > 0 ? zhVoices[0] : null);
  window.speechSynthesis.speak(utterance);
}

function handleAction() {
  if (currentStepIndex < studyFlow.length - 1) {
    currentStepIndex++;
    loadStep();
  } else {
    if (
      currentStudyDay !== null &&
      !completedDays.includes(currentStudyDay.day)
    ) {
      completedDays.push(currentStudyDay.day);
      localStorage.setItem('dothabit_progress', JSON.stringify(completedDays));
    }
    showCalendar();
  }
}

function playHint() {
  if (writer) {
    writer.cancelQuiz();
    writer.animateCharacter({
      onComplete: () => setTimeout(() => loadStep(), 600),
    });
  }
}

window.onload = init;
