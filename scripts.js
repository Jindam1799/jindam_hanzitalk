// --- 전역 상태 관리 ---
let completedDays = [];
let currentStudyDay = null;
let studyFlow = [];
let currentStepIndex = 0;
let writer = null;
let currentHanziForTTS = '';

// --- 💬 완성 칭찬 메시지 10종 (TTS 재생됨) ---
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

// --- 💬 획순 추임새 7종 (자막만 표시, TTS 안 함) ---
const strokeEncouragementList = [
  '对！',
  '很好！',
  '漂亮！',
  '加油！',
  '不错！',
  '很棒！',
  '正确！',
];

// --- BGM 제어 시스템 ---
const bgmTracks = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
const bgmAudio = new Audio();
bgmAudio.volume = 0.3;

function playRandomBGM() {
  const randomTrack = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
  bgmAudio.src = randomTrack;
  bgmAudio.play().catch((e) => console.log('BGM 대기', e));
}
bgmAudio.addEventListener('ended', playRandomBGM);

// --- TTS 음성 엔진 ---
let availableVoices = [];
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}
window.speechSynthesis.onvoiceschanged = loadVoices;

// --- 🎧 아날로그 질감 사운드 엔진 ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playTokSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);

  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  const bufferSize = audioCtx.sampleRate * 0.05;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1500;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
  noiseSource.start(now);
  noiseSource.stop(now + 0.08);
}

function playTukSound() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

  oscGain.gain.setValueAtTime(0, now);
  oscGain.gain.linearRampToValueAtTime(0.8, now + 0.02);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  const bufferSize = audioCtx.sampleRate * 0.25;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 600;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
  noiseSource.start(now);
  noiseSource.stop(now + 0.25);
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
    document.getElementById('calendar-view').style.display = 'grid';

    document.getElementById('study-view').style.display = 'none';
    document.getElementById('review-list-view').style.display = 'none';
    document.getElementById('setting-modal').style.display = 'none';

    initAudio();
    playRandomBGM();
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

  const writerTarget = document.getElementById('writer-target');
  writerTarget.addEventListener('pointerdown', playTokSound);
}

function renderCalendar() {
  const container = document.getElementById('calendar-view');
  container.innerHTML = '';
  curriculum.forEach((data) => {
    const isCompleted = completedDays.includes(data.day);
    const card = document.createElement('div');
    card.className = `dot-card ${isCompleted ? 'completed' : ''}`;
    card.innerHTML = `<div class="dot-number">${data.day}</div>`;
    card.onclick = () => openSettingModal(data);
    container.appendChild(card);
  });
}

function showCalendar() {
  document.getElementById('study-view').style.display = 'none';
  document.getElementById('review-list-view').style.display = 'none';
  document.getElementById('calendar-view').style.display = 'grid';
  document.getElementById('main-header').style.display = 'block';
  if (writer) document.getElementById('writer-target').innerHTML = '';
  renderCalendar();
}

let pendingStudyDay = null;

function openSettingModal(dayData) {
  pendingStudyDay = dayData;
  document.getElementById('modal-day-title').innerText =
    `Day ${dayData.day} 설정`;
  document.getElementById('setting-modal').style.display = 'flex';
}

function confirmStudyStart(level) {
  document.getElementById('setting-modal').style.display = 'none';
  startStudy(pendingStudyDay, level);
}

// --- 일반 학습 로직 (단어/성어 분할 지원) ---
function startStudy(dayData, level) {
  currentStudyDay = dayData;
  document.getElementById('calendar-view').style.display = 'none';
  document.getElementById('main-header').style.display = 'none';
  document.getElementById('study-view').style.display = 'block';

  studyFlow = [];
  const rad = dayData.radical;

  studyFlow.push({
    type: 'trace',
    char: rad.char,
    ttsChar: rad.cnName || rad.ttsChar,
    pinyin: rad.pinyin,
    cnName: rad.cnName,
    cnPinyin: rad.cnPinyin,
    title: `${rad.name}`,
    desc: rad.desc,
  });
  studyFlow.push({
    type: 'blank',
    char: rad.char,
    ttsChar: rad.cnName || rad.ttsChar,
    pinyin: rad.pinyin,
    cnName: rad.cnName,
    cnPinyin: rad.cnPinyin,
    title: `${rad.name}`,
    desc: `밑그림 없이 기억을 떠올려 적어보세요.`,
  });

  let pool = [];
  if (level === 'beginner') {
    pool = [...(dayData.related || [])].slice(0, 5);
  } else if (level === 'intermediate') {
    pool = [...(dayData.words || dayData.related || [])];
  } else if (level === 'advanced') {
    pool = [...(dayData.idioms || dayData.related || [])];
  }

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

// --- 집중 복습장 로직 ---
function openReviewMenu() {
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

  if (!hasData) {
    grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-muted); padding:20px;">아직 완료한 학습이 없습니다. 캘린더에서 학습을 먼저 진행하세요!</p>`;
  }
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
  document.getElementById('study-view').style.display = 'block';

  currentStudyDay = null;
  studyFlow = [];

  studyFlow.push({
    type: 'trace',
    char: charData.char,
    ttsChar: isRadical ? charData.cnName || charData.ttsChar : charData.char,
    pinyin: charData.pinyin,
    cnName: charData.cnName,
    cnPinyin: charData.cnPinyin,
    title: `${charData.name}`,
    desc: charData.desc,
  });

  for (let i = 1; i <= 10; i++) {
    studyFlow.push({
      type: 'blank',
      char: charData.char,
      ttsChar: isRadical ? charData.cnName || charData.ttsChar : charData.char,
      pinyin: charData.pinyin,
      cnName: charData.cnName,
      cnPinyin: charData.cnPinyin,
      title: `${charData.name} (${i}/10)`,
      desc: `기억을 되살려 완벽하게 써보세요.`,
    });
  }

  currentStepIndex = 0;
  loadStep();
}

// --- 공통 그리기 엔진 ---
function loadStep() {
  const stepData = studyFlow[currentStepIndex];
  currentHanziForTTS = stepData.ttsChar;

  document.getElementById('step-indicator').innerText =
    `Step ${currentStepIndex + 1} / ${studyFlow.length}`;
  document.getElementById('study-title-text').innerText = stepData.title;

  const pinyinDisplay = document.getElementById('pinyin-display');
  if (stepData.cnName)
    pinyinDisplay.innerText = `${stepData.cnName} [ ${stepData.cnPinyin} ]`;
  else pinyinDisplay.innerText = `[ ${stepData.pinyin} ]`;

  document.getElementById('study-desc').innerText = stepData.desc;

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
      const randomEncourage =
        strokeEncouragementList[
          Math.floor(Math.random() * strokeEncouragementList.length)
        ];
      statusMsg.innerText = `👍 ${randomEncourage}`;
      statusMsg.style.color = 'var(--success)';
    },
    onComplete: function () {
      playTukSound();

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
  const femaleKeywords = [
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
    'google 普通话',
  ];

  let femaleVoice = zhVoices.find((v) =>
    femaleKeywords.some((kw) => v.name.toLowerCase().includes(kw)),
  );
  if (femaleVoice) utterance.voice = femaleVoice;
  else if (zhVoices.length > 0) utterance.voice = zhVoices[0];

  window.speechSynthesis.speak(utterance);
}

function handleAction() {
  if (currentStepIndex < studyFlow.length - 1) {
    currentStepIndex++;
    loadStep();
  } else {
    if (currentStudyDay !== null) {
      if (!completedDays.includes(currentStudyDay.day)) {
        completedDays.push(currentStudyDay.day);
        localStorage.setItem(
          'dothabit_progress',
          JSON.stringify(completedDays),
        );
      }
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
