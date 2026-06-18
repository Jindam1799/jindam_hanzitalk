// --- 전역 상태 관리 ---
let completedDays = [];
let currentStudyDay = null;
let studyFlow = [];
let currentStepIndex = 0;
let writer = null;
let currentHanziForTTS = '';

// --- BGM 제어 시스템 ---
const bgmTracks = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
const bgmAudio = new Audio();
bgmAudio.volume = 0.3; // 효과음/TTS를 위해 배경음은 작게

function playRandomBGM() {
  const randomTrack = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
  bgmAudio.src = randomTrack;
  bgmAudio.play().catch((e) => console.log('BGM 재생 대기', e));
}
bgmAudio.addEventListener('ended', playRandomBGM);

// --- TTS 음성 엔진 ---
let availableVoices = [];
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}
window.speechSynthesis.onvoiceschanged = loadVoices;

// --- 🎧 부드러운 연필/붓 ASMR 엔진 ---
let audioCtx = null;
let brushGainNode = null;
let isDrawing = false;

function initAudio() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    let white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.05;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 250;
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 850;
  bandpass.Q.value = 1.2;
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1500;

  brushGainNode = audioCtx.createGain();
  brushGainNode.gain.value = 0;
  noise.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(brushGainNode);
  brushGainNode.connect(audioCtx.destination);
  noise.start();
}

function startBrushSound() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  isDrawing = true;
  brushGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  brushGainNode.gain.setValueAtTime(
    brushGainNode.gain.value,
    audioCtx.currentTime,
  );
  brushGainNode.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.05);
}

function stopBrushSound() {
  if (!brushGainNode || !isDrawing) return;
  isDrawing = false;
  brushGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  brushGainNode.gain.setValueAtTime(
    brushGainNode.gain.value,
    audioCtx.currentTime,
  );
  brushGainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);
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
  // 인트로 화면 클릭 시 권한 획득 & 시작
  document.getElementById('intro-screen').addEventListener('click', () => {
    document.getElementById('intro-screen').style.display = 'none';
    document.getElementById('main-header').style.display = 'block';
    document.getElementById('calendar-view').style.display = 'grid';
    initAudio(); // 브러쉬 오디오 엔진 초기화
    playRandomBGM(); // BGM 재생 시작
  });

  document.getElementById('theme-color').addEventListener('change', (e) => {
    const newColor = e.target.value;
    document.documentElement.style.setProperty('--theme-color', newColor);
    localStorage.setItem('dothabit_color', newColor);
  });

  // 화면 전환 버튼들
  document.getElementById('back-btn').addEventListener('click', showCalendar);
  document
    .getElementById('open-review-btn')
    .addEventListener('click', openReviewMenu);
  document
    .getElementById('close-review-btn')
    .addEventListener('click', showCalendar);

  // 모달 제어
  document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    document.getElementById('setting-modal').style.display = 'none';
  });
  document
    .getElementById('modal-start-btn')
    .addEventListener('click', confirmStudyStart);

  // 스터디 컨트롤
  document.getElementById('tts-btn').addEventListener('click', playTTS);
  document.getElementById('hint-btn').addEventListener('click', playHint);
  document.getElementById('next-btn').addEventListener('click', handleAction);

  // 필기 소리 제어
  const writerTarget = document.getElementById('writer-target');
  writerTarget.addEventListener('pointerdown', startBrushSound);
  window.addEventListener('pointerup', stopBrushSound);
  window.addEventListener('pointercancel', stopBrushSound);
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

// --- 학습 설정 모달 로직 ---
let pendingStudyDay = null;

function openSettingModal(dayData) {
  pendingStudyDay = dayData;
  document.getElementById('modal-day-title').innerText =
    `Day ${dayData.day} 설정`;
  document.getElementById('setting-modal').style.display = 'flex';
}

function confirmStudyStart() {
  const countSelect = document.getElementById('char-count').value;
  document.getElementById('setting-modal').style.display = 'none';
  startStudy(pendingStudyDay, countSelect);
}

// --- 일반 학습 로직 ---
function startStudy(dayData, countSelect) {
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
    title: `[백지 인출] ${rad.name}`,
    desc: `밑그림 없이 기억을 떠올려 적어보세요.`,
  });

  let relatedPool = [...dayData.related];
  for (let i = relatedPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [relatedPool[i], relatedPool[j]] = [relatedPool[j], relatedPool[i]];
  }

  if (countSelect !== 'all') {
    relatedPool = relatedPool.slice(0, parseInt(countSelect, 10));
  }

  relatedPool.forEach((rel) => {
    studyFlow.push({
      type: 'trace',
      char: rel.char,
      ttsChar: rel.char,
      pinyin: rel.pinyin,
      title: `${rel.name}`,
      desc: rel.desc,
    });
    studyFlow.push({
      type: 'blank',
      char: rel.char,
      ttsChar: rel.char,
      pinyin: rel.pinyin,
      title: `[백지 인출] ${rel.name}`,
      desc: `백지에 정확히 써보세요.`,
    });
  });

  currentStepIndex = 0;
  loadStep();
}

// --- 집중 복습장 (10번 쓰기) 로직 ---
function openReviewMenu() {
  document.getElementById('calendar-view').style.display = 'none';
  document.getElementById('main-header').style.display = 'none';
  document.getElementById('review-list-view').style.display = 'block';

  const grid = document.getElementById('review-grid');
  grid.innerHTML = '';

  // 완료된 날짜의 한자들을 모두 모아서 버튼으로 만듦
  let hasData = false;
  completedDays.forEach((dayNum) => {
    const dayData = curriculum.find((c) => c.day === dayNum);
    if (!dayData) return;

    // 부수 추가
    createReviewButton(grid, dayData.radical, true);
    // 연계 한자 추가
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
  btn.innerHTML = `
        <div class="review-char">${charData.char}</div>
        <div class="review-name">${charData.name}</div>
    `;
  btn.onclick = () => start10xReview(charData, isRadical);
  grid.appendChild(btn);
}

function start10xReview(charData, isRadical) {
  document.getElementById('review-list-view').style.display = 'none';
  document.getElementById('study-view').style.display = 'block';

  currentStudyDay = null; // 복습 모드이므로 캘린더 진척도에 영향 안줌
  studyFlow = [];

  // 첫 1번은 가이드(trace), 나머지 9번은 백지(blank)
  studyFlow.push({
    type: 'trace',
    char: charData.char,
    ttsChar: isRadical ? charData.cnName || charData.ttsChar : charData.char,
    pinyin: charData.pinyin,
    cnName: charData.cnName,
    cnPinyin: charData.cnPinyin,
    title: `[가이드] ${charData.name} 1/10`,
    desc: charData.desc,
  });

  for (let i = 2; i <= 10; i++) {
    studyFlow.push({
      type: 'blank',
      char: charData.char,
      ttsChar: isRadical ? charData.cnName || charData.ttsChar : charData.char,
      pinyin: charData.pinyin,
      cnName: charData.cnName,
      cnPinyin: charData.cnPinyin,
      title: `[집중 훈련] ${charData.name} ${i}/10`,
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
    `진행도: ${currentStepIndex + 1} / ${studyFlow.length}`;
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

  writer = HanziWriter.create('writer-target', stepData.char, {
    width: 300,
    height: 300,
    padding: 45,
    showCharacter: false,
    showOutline: !isBlank,
    strokeColor: 'rgba(30, 41, 59, 0.9)',
    outlineColor: '#cbd5e1',
    highlightColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color')
      .trim(),
    drawingWidth: 50,
  });

  playTTS();

  writer.quiz({
    onMistake: function () {
      statusMsg.innerText = '⚠️ 획순이나 방향이 어긋났습니다.';
      statusMsg.style.color = '#ea580c';
    },
    onCorrectStroke: function () {
      statusMsg.innerText = '👍 정확합니다.';
      statusMsg.style.color = 'var(--success)';
    },
    onComplete: function () {
      stopBrushSound();
      statusMsg.innerText = '🎉 완벽합니다!';
      statusMsg.style.color = 'var(--theme-color)';
      nextBtn.disabled = false;
      nextBtn.innerText =
        currentStepIndex === studyFlow.length - 1 ? '훈련 완료!' : '다음 단계';
    },
  });
}

function playTTS() {
  if (!currentHanziForTTS) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentHanziForTTS);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;

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
      // 일반 캘린더 학습 모드 클리어 시
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
