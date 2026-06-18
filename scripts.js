let currentLevel = 1;
let currentDayData = null;
let currentStudyStep = 0;
let writer = null;
let progressData = JSON.parse(localStorage.getItem('jindamProgress')) || {};

const strokeAudio = new Audio(
  'https://actions.google.com/sounds/v1/ui/button_click.ogg',
);

// 🎵 BGM 설정
const bgmFiles = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
const bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = 0.3; // TTS 소리가 묻히지 않게 볼륨을 30%로 설정

const introScreen = document.getElementById('intro-screen');
const levelSelector = document.getElementById('level-selector');
const calendarView = document.getElementById('calendar-view');
const studyView = document.getElementById('study-view');
const dropdownMenu = document.getElementById('level-dropdown-menu');

// 인트로 터치 시 화면 전환 & BGM 재생
introScreen.addEventListener('click', () => {
  introScreen.style.display = 'none';
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
  renderCalendar(currentLevel);

  // 🎵 첫 터치 시 랜덤 BGM 재생 (브라우저 자동재생 정책 대응)
  if (bgmAudio.paused) {
    const randomBgm = bgmFiles[Math.floor(Math.random() * bgmFiles.length)];
    bgmAudio.src = randomBgm;
    bgmAudio.play().catch((error) => {
      console.log('BGM 재생 차단됨:', error);
    });
  }
});

document.getElementById('level-toggle-btn').addEventListener('click', () => {
  dropdownMenu.style.display =
    dropdownMenu.style.display === 'flex' ? 'none' : 'flex';
});

document.querySelectorAll('.lvl-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    currentLevel = parseInt(e.target.dataset.level);
    document.getElementById('current-level-text').innerText =
      e.target.innerText;
    dropdownMenu.style.display = 'none';
    renderCalendar(currentLevel);
  });
});

function renderCalendar(level) {
  calendarView.innerHTML = '';
  const levelData = curriculum.filter((item) => item.level === level);

  levelData.forEach((data) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn';

    if (progressData[data.day]) {
      btn.classList.add('completed');
    }

    btn.innerHTML = `<span class="char">${data.radical.char}</span><span class="name">${data.radical.name}</span>`;

    btn.onclick = () => startStudy(data);
    calendarView.appendChild(btn);
  });
}

function startStudy(data) {
  currentDayData = data;
  currentStudyStep = 0;

  calendarView.style.display = 'none';
  levelSelector.style.display = 'none';
  studyView.style.display = 'flex';

  loadHanziWriter();
}

function loadHanziWriter() {
  document.getElementById('writer-target').innerHTML = '';
  document.getElementById('next-btn').style.display = 'none'; // 처음엔 다음 버튼 숨김
  document.getElementById('status-msg').innerText = '';

  let targetData =
    currentStudyStep === 0
      ? currentDayData.radical
      : currentDayData.related[currentStudyStep - 1];

  document.getElementById('study-title-text').innerText = targetData.char;
  document.getElementById('pinyin-display').innerText = targetData.pinyin;
  document.getElementById('study-desc').innerText =
    currentStudyStep === 0 ? `[부수] ${targetData.name}` : targetData.name;
  document.getElementById('step-indicator').innerText =
    `Step ${currentStudyStep + 1} / 6`;

  playTTS(targetData.char);

  const containerSize = document.getElementById('writer-target').clientWidth;

  writer = HanziWriter.create('writer-target', targetData.char, {
    width: containerSize,
    height: containerSize,
    padding: 20,
    showOutline: true,
    strokeAnimationSpeed: 2,
    delayBetweenStrokes: 100,
    showHintAfterMisses: 2,
    highlightColor: '#e11d48',
    drawingWidth: 35,
    strokeWidth: 3,
  });

  startQuizMode();
}

function startQuizMode() {
  writer.quiz({
    onCorrectStroke: function () {
      strokeAudio.currentTime = 0;
      strokeAudio.play();
    },
    onComplete: function () {
      document.getElementById('status-msg').innerText = '훌륭해요! 👏';
      document.getElementById('next-btn').style.display = 'block'; // 💡 다 쓰면 다음 버튼 등장
    },
  });
}

function playTTS(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(
      (voice) => voice.lang.includes('zh-CN') || voice.lang.includes('zh-TW'),
    );
    if (zhVoice) utterance.voice = zhVoice;

    window.speechSynthesis.speak(utterance);
  }
}

document.getElementById('tts-btn').addEventListener('click', () => {
  const char = document.getElementById('study-title-text').innerText;
  playTTS(char);
});

document.getElementById('next-btn').addEventListener('click', () => {
  if (currentStudyStep < 5) {
    currentStudyStep++;
    loadHanziWriter();
  } else {
    progressData[currentDayData.day] = true;
    localStorage.setItem('jindamProgress', JSON.stringify(progressData));

    alert('한 칸을 마스터했습니다! 색이 칠해집니다. 🎨');
    exitStudy();
  }
});

document.getElementById('hint-btn').addEventListener('click', () => {
  if (writer) {
    writer.cancelQuiz();
    document.getElementById('status-msg').innerText = '모범 획순 시연 중...';

    writer.animateCharacter({
      onComplete: function () {
        document.getElementById('status-msg').innerText = '다시 써보세요! ✍️';
        setTimeout(() => {
          document.getElementById('status-msg').innerText = '';
          startQuizMode();
        }, 1500);
      },
    });
  }
});

document.getElementById('back-btn').addEventListener('click', exitStudy);

function exitStudy() {
  studyView.style.display = 'none';
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
  renderCalendar(currentLevel);
}
