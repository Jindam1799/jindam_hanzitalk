let currentLevel = 1;
let currentDayData = null;
let currentStudyStep = 0;
let writer = null;
let progressData = JSON.parse(localStorage.getItem('jindamProgress')) || {};

const strokeAudio = new Audio(
  'https://actions.google.com/sounds/v1/ui/button_click.ogg',
);

const introScreen = document.getElementById('intro-screen');
const levelSelector = document.getElementById('level-selector');
const calendarView = document.getElementById('calendar-view');
const studyView = document.getElementById('study-view');
const dropdownMenu = document.getElementById('level-dropdown-menu');

introScreen.addEventListener('click', () => {
  introScreen.style.display = 'none';
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
  renderCalendar(currentLevel);
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

    // UI 개선: span에 각각 클래스를 부여하여 디자인 분리
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
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('status-msg').innerText = ''; // 상태 메시지 초기화

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
    drawingWidth: 35, // 💡 펜(획) 굵기 대폭 상향 (기본값 20)
    strokeWidth: 3, // 기본 그려져 있는 바탕 글씨의 굵기
  });

  // 퀴즈 시작 함수 호출
  startQuizMode();
}

// 💡 퀴즈 모드를 별도 함수로 분리 (힌트 시연 후 재시작을 위함)
function startQuizMode() {
  writer.quiz({
    onCorrectStroke: function () {
      strokeAudio.currentTime = 0;
      strokeAudio.play();
    },
    onComplete: function () {
      document.getElementById('status-msg').innerText = '훌륭해요! 👏';
      document.getElementById('next-btn').style.display = 'block';
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

// 💡 힌트 버튼 로직 변경 (시연 후 다시 퀴즈 모드로 복귀)
document.getElementById('hint-btn').addEventListener('click', () => {
  if (writer) {
    writer.cancelQuiz(); // 진행 중인 퀴즈를 잠깐 멈춤
    document.getElementById('status-msg').innerText = '모범 획순 시연 중...';

    writer.animateCharacter({
      onComplete: function () {
        document.getElementById('status-msg').innerText = '다시 써보세요! ✍️';
        setTimeout(() => {
          document.getElementById('status-msg').innerText = '';
          startQuizMode(); // 1초 후 퀴즈 모드 재가동
        }, 1500); // 1.5초 대기
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
