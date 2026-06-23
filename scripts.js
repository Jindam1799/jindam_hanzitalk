// ==========================================
// 1. 전역 변수 및 상태 설정
// ==========================================
let currentLevel = 1;
let currentDayData = null;
let currentStudyStep = 0;
let isBlindMode = false;
let isReviewMode = false;
let isStudyCompleted = false; 

let currentReviewCount = 0;
const targetReviewCount = 10;
let reviewTargetData = null;
let reviewTargetIndex = 0;

let writer = null;
let progressData = JSON.parse(localStorage.getItem('jindamProgress')) || {};
let reviewProgressData = JSON.parse(localStorage.getItem('jindamReviewProgress')) || {};

// ==========================================
// 2. 커스텀 알림창 함수 (예쁜 팝업창)
// ==========================================
function showCustomAlert(title, message, btnText, callback) {
  document.getElementById('alert-title').innerText = title;
  document.getElementById('alert-msg').innerText = message;
  
  const alertBtn = document.getElementById('alert-btn');
  alertBtn.innerText = btnText || '확인';
  
  const alertModal = document.getElementById('alert-modal');
  alertModal.style.display = 'flex';

  // 버튼 클릭 시 팝업 닫고 콜백(로비 이동 등) 실행
  alertBtn.onclick = () => {
    alertModal.style.display = 'none';
    if (callback) callback();
  };
}

// ==========================================
// 3. 사운드 및 BGM 설정 (연속 재생)
// ==========================================
const bgmFiles = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
let currentBgmIndex = 0;
let bgmAudio = null;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (!bgmAudio) {
    bgmAudio = document.querySelector('audio') || new Audio();
    bgmAudio.volume = 0.3;
    bgmAudio.loop = false; 

    bgmAudio.addEventListener('ended', () => {
      currentBgmIndex++;
      if (currentBgmIndex >= bgmFiles.length) currentBgmIndex = 0; 
      bgmAudio.src = bgmFiles[currentBgmIndex];
      bgmAudio.play().catch((e) => console.log('BGM 다음 곡 재생 실패:', e));
    });
  }
}

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'tok') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gainNode.gain.setValueAtTime(1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  } else if (type === 'tuk') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gainNode.gain.setValueAtTime(1.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }
}

const praiseList = [
  { cn: '太棒了', kr: '최고예요!' },
  { cn: '做得好', kr: '잘했어요!' },
  { cn: '完美', kr: '완벽해요!' },
  { cn: '非常好', kr: '아주 좋아요!' },
  { cn: '真厉害', kr: '정말 대단해요!' },
  { cn: '进步很大', kr: '실력이 많이 늘었어요!' },
  { cn: '不错哦', kr: '훌륭해요!' },
  { cn: '继续加油', kr: '이대로 쭈욱 파이팅!' },
  { cn: '棒极了', kr: '최고 중의 최고예요!' },
  { cn: '太出色了', kr: '정말 뛰어나요!' },
];

// ==========================================
// 4. DOM 엘리먼트
// ==========================================
const introScreen = document.getElementById('intro-screen');
const mainHeader = document.getElementById('main-header'); 
const levelSelector = document.getElementById('level-selector');
const calendarView = document.getElementById('calendar-view');
const studyView = document.getElementById('study-view');
const dropdownMenu = document.getElementById('level-dropdown-menu');
const settingModal = document.getElementById('setting-modal');
const reviewListView = document.getElementById('review-list-view');
const reviewGrid = document.getElementById('review-grid');
const reviewSelectModal = document.getElementById('review-select-modal');

// ==========================================
// 5. 로비 및 메뉴 이벤트
// ==========================================
introScreen.addEventListener('click', () => {
  if (typeof curriculum === 'undefined') {
    showCustomAlert('오류', 'data.js 파일을 찾을 수 없거나 데이터가 비어있습니다!', '확인');
    return;
  }
  
  initAudio();
  introScreen.style.display = 'none';
  mainHeader.style.display = 'flex'; 
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
  renderCalendar(currentLevel);

  if (!bgmAudio.src || bgmAudio.src === '') {
    bgmAudio.src = bgmFiles[currentBgmIndex];
  }
  bgmAudio.play().catch((e) => console.log('BGM 재생 차단됨:', e));
});

document.getElementById('level-toggle-btn').addEventListener('click', () => {
  dropdownMenu.style.display = dropdownMenu.style.display === 'flex' ? 'none' : 'flex';
});

document.querySelectorAll('.lvl-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    currentLevel = parseInt(e.target.dataset.level);
    document.getElementById('current-level-text').innerText = e.target.innerText;
    dropdownMenu.style.display = 'none';
    renderCalendar(currentLevel);
  });
});

// ==========================================
// 6. 달력 렌더링 및 난이도 팝업창
// ==========================================
function renderCalendar(level) {
  calendarView.innerHTML = '';
  const levelData = curriculum.filter((item) => item.level === level);
  levelData.forEach((data) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn';
    if (progressData[data.day]) btn.classList.add('completed');
    btn.innerHTML = `<span class="char">${data.radical.char}</span><span class="name">${data.radical.name}</span>`;
    btn.onclick = () => openSettingModal(data);
    calendarView.appendChild(btn);
  });
}

function openSettingModal(data) {
  currentDayData = data;
  document.getElementById('modal-day-title').innerText = `Day ${data.day} 학습 설정`;
  settingModal.style.display = 'flex';
}

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
  settingModal.style.display = 'none';
});

window.confirmStudyStart = function () {
  settingModal.style.display = 'none';
  startStudy(currentDayData);
};

// ==========================================
// 7. 복습장 로직
// ==========================================
document.getElementById('open-review-btn').addEventListener('click', () => {
  mainHeader.style.display = 'none'; 
  calendarView.style.display = 'none';
  levelSelector.style.display = 'none';
  reviewListView.style.display = 'block';
  renderReviewList();
});

document.getElementById('close-review-btn').addEventListener('click', () => {
  reviewListView.style.display = 'none';
  mainHeader.style.display = 'flex'; 
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
});

function renderReviewList() {
  reviewGrid.innerHTML = '';
  const masteredDays = curriculum.filter((item) => progressData[item.day]);
  if (masteredDays.length === 0) {
    reviewGrid.innerHTML = '<p style="text-align: center; width: 100%; margin-top: 50px; color: #666;">아직 마스터한 한자가 없습니다.<br>달력에서 학습을 먼저 진행해 주세요!</p>';
    return;
  }
  masteredDays.forEach((data) => {
    const btn = document.createElement('button');
    btn.className = 'day-btn completed';
    btn.innerHTML = `<span class="char">${data.radical.char}</span><span class="name">${data.radical.name}</span>`;
    btn.onclick = () => openReviewSelectModal(data);
    reviewGrid.appendChild(btn);
  });
}

function openReviewSelectModal(data) {
  currentDayData = data;
  const charGrid = document.getElementById('review-char-grid');
  charGrid.innerHTML = '';

  const radicalBtn = createReviewCharBtn(data.radical, 0, data.day);
  charGrid.appendChild(radicalBtn);

  data.related.forEach((charData, index) => {
    const relatedBtn = createReviewCharBtn(charData, index + 1, data.day);
    charGrid.appendChild(relatedBtn);
  });
  reviewSelectModal.style.display = 'flex';
}

function createReviewCharBtn(charData, index, day) {
  const btn = document.createElement('button');
  btn.className = 'day-btn';
  const progressKey = `${day}-${index}`;
  if (reviewProgressData[progressKey]) btn.classList.add('completed');
  btn.innerHTML = `<span class="char">${charData.char}</span><span class="name">${charData.name}</span>`;
  btn.onclick = () => {
    reviewSelectModal.style.display = 'none';
    startReviewWriting(charData, index);
  };
  return btn;
}

document.getElementById('review-modal-cancel-btn').addEventListener('click', () => {
  reviewSelectModal.style.display = 'none';
});

function startReviewWriting(charData, index) {
  reviewTargetData = charData;
  reviewTargetIndex = index;
  isReviewMode = true;
  isBlindMode = false;
  currentReviewCount = 0;
  mainHeader.style.display = 'none'; 
  reviewListView.style.display = 'none';
  studyView.style.display = 'flex';
  loadHanziWriter();
}

// ==========================================
// 8. 한자 학습 메인 로직
// ==========================================
function startStudy(data) {
  currentDayData = data;
  currentStudyStep = 0;
  isBlindMode = false;
  isReviewMode = false;
  isStudyCompleted = false; 
  
  mainHeader.style.display = 'none'; 
  calendarView.style.display = 'none';
  levelSelector.style.display = 'none';
  studyView.style.display = 'flex';
  loadHanziWriter();
}

function loadHanziWriter() {
  document.getElementById('writer-target').innerHTML = '';
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('status-msg').innerText = '';

  const storyCard = document.getElementById('story-card');
  if (storyCard) {
    storyCard.classList.remove('show');
    storyCard.style.display = 'none';
  }

  let targetData;
  let textToRead = '';

  if (isReviewMode) {
    targetData = reviewTargetData;
    document.getElementById('study-desc').innerText = reviewTargetIndex === 0 ? `[부수] ${targetData.name}` : targetData.name;
    document.getElementById('pinyin-display').innerText = reviewTargetIndex === 0 ? `${targetData.cnName} (${targetData.cnPinyin})` : targetData.pinyin;
    textToRead = reviewTargetIndex === 0 ? targetData.cnName : targetData.char;
  } else {
    targetData = currentStudyStep === 0 ? currentDayData.radical : currentDayData.related[currentStudyStep - 1];
    if (currentStudyStep === 0) {
      document.getElementById('study-desc').innerText = `[부수] ${targetData.name}`;
      document.getElementById('pinyin-display').innerText = `${targetData.cnName} (${targetData.cnPinyin})`;
      textToRead = targetData.cnName;
    } else {
      document.getElementById('study-desc').innerText = targetData.name;
      document.getElementById('pinyin-display').innerText = targetData.pinyin;
      textToRead = targetData.char;
    }
  }

  document.getElementById('study-title-text').innerText = targetData.char;
  let isReviewBlind = isReviewMode && currentReviewCount > 0;

  if (isReviewMode) {
    document.getElementById('step-indicator').innerText = `집중 훈련: ${currentReviewCount + 1} / 10회차`;
    if (isReviewBlind) {
      document.getElementById('status-msg').innerText = '가이드 없이 백지에 도전하세요! 🧠';
      document.getElementById('study-title-text').style.visibility = 'hidden';
    } else {
      document.getElementById('status-msg').innerText = '첫 번째는 가이드라인을 따라 써보세요. ✍️';
      document.getElementById('study-title-text').style.visibility = 'visible';
      if (currentReviewCount === 0) playTTS(textToRead);
    }
  } else {
    let totalSteps = (currentDayData.related.length + 1) * 2;
    let currentStepIndicator = currentStudyStep * 2 + (isBlindMode ? 2 : 1);
    document.getElementById('step-indicator').innerText = `Step ${currentStepIndicator} / ${totalSteps}`;
    
    if (isBlindMode) {
      document.getElementById('status-msg').innerText = '가이드 없이 스스로 도전해 보세요! 🧠';
      document.getElementById('study-title-text').style.visibility = 'hidden';
    } else {
      document.getElementById('status-msg').innerText = '획순에 맞춰 예쁘게 따라 써보세요. ✍️';
      document.getElementById('study-title-text').style.visibility = 'visible';
      playTTS(textToRead);
    }
  }

  const container = document.querySelector('.writer-container');
  let size = Math.min(container.clientWidth, container.clientHeight);
  if (size > 350) size = 350;

  const targetEl = document.getElementById('writer-target');
  targetEl.style.width = size + 'px';
  targetEl.style.height = size + 'px';

  writer = HanziWriter.create('writer-target', targetData.char, {
    width: size, height: size, padding: 20, highlightColor: '#e11d48', drawingWidth: 35, strokeWidth: 3,
    showOutline: isReviewMode ? !isReviewBlind : !isBlindMode,
  });

  startQuizMode();
}

function startQuizMode() {
  writer.quiz({
    onCorrectStroke: function () {
      playSound('tok');
      document.getElementById('status-msg').innerText = isReviewMode ? '계속 이어서 그어주세요! ✨' : '좋아요! 다음 획을 그어주세요. ✨';
    },
    onMistake: function () {
      document.getElementById('status-msg').innerText = '앗! 획순이나 방향이 틀렸어요. 😅';
      const targetBox = document.getElementById('writer-target');
      targetBox.style.transform = 'translateX(-5px)';
      setTimeout(() => (targetBox.style.transform = 'translateX(5px)'), 100);
      setTimeout(() => (targetBox.style.transform = 'translateX(0)'), 200);
    },
    onComplete: function () {
      playSound('tuk');

      let currentTarget = isReviewMode ? reviewTargetData : (currentStudyStep === 0 ? currentDayData.radical : currentDayData.related[currentStudyStep - 1]);
      if (currentTarget.story) {
        const storyCard = document.getElementById('story-card');
        document.getElementById('story-text').innerText = currentTarget.story;
        storyCard.style.display = 'flex';
        requestAnimationFrame(() => {
          setTimeout(() => storyCard.classList.add('show'), 10);
        });
      }

      if (isReviewMode) {
        currentReviewCount++;
        if (currentReviewCount >= targetReviewCount) {
          playTTS('太出色了');
          document.getElementById('status-msg').innerText = `완벽해요! 10번 쓰기를 마스터했습니다! 🎉`;
          const progressKey = `${currentDayData.day}-${reviewTargetIndex}`;
          reviewProgressData[progressKey] = true;
          localStorage.setItem('jindamReviewProgress', JSON.stringify(reviewProgressData));

          const nextBtn = document.getElementById('next-btn');
          nextBtn.innerText = '복습장으로 돌아가기';
          nextBtn.style.display = 'block';
        } else {
          document.getElementById('status-msg').innerText = `잘했어요! 1초 뒤 다음 빈칸 진행... (${currentReviewCount}/10) 🔥`;
          setTimeout(() => { loadHanziWriter(); }, 1000);
        }
        return;
      }

      const randomPraise = praiseList[Math.floor(Math.random() * praiseList.length)];
      playTTS(randomPraise.cn);

      if (isBlindMode) {
        if (currentStudyStep >= currentDayData.related.length) {
          isStudyCompleted = true;
          progressData[currentDayData.day] = true;
          localStorage.setItem('jindamProgress', JSON.stringify(progressData));

          document.getElementById('status-msg').innerText = '축하합니다! 오늘의 학습을 모두 마스터했습니다! 🎉';
          
          const nextBtn = document.getElementById('next-btn');
          nextBtn.innerText = '🏠 로비로 돌아가기';
          nextBtn.style.display = 'block';

          // 💡 투박한 alert 대신 예쁜 팝업을 띄우고 확인을 누르면 탈출하도록 변경!
          setTimeout(() => {
            showCustomAlert(
              "학습 완료! 🏆", 
              "축하합니다! 오늘의 부수와 한자를 모두 마스터했습니다! 🎉", 
              "확인 (로비로 돌아가기)", 
              exitStudy
            );
          }, 500);

        } else {
          document.getElementById('status-msg').innerText = `${randomPraise.cn} (${randomPraise.kr}) 완벽하게 외우셨네요! 👏`;
          const nextBtn = document.getElementById('next-btn');
          nextBtn.innerText = '다음 한자 배우기';
          nextBtn.style.display = 'block';
        }
      } else {
        document.getElementById('status-msg').innerText = `${randomPraise.cn} (${randomPraise.kr}) 이제 스스로 써볼까요? 🔥`;
        const nextBtn = document.getElementById('next-btn');
        nextBtn.innerText = '혼자서 써보기';
        nextBtn.style.display = 'block';
      }
    },
  });
}

// ==========================================
// 9. 버튼 이벤트 모음
// ==========================================
document.getElementById('next-btn').addEventListener('click', () => {
  if (isReviewMode) {
    studyView.style.display = 'none';
    reviewListView.style.display = 'block';
    renderReviewList();
    openReviewSelectModal(currentDayData);
    return;
  }

  if (isStudyCompleted) {
    exitStudy();
    return;
  }

  if (!isBlindMode) {
    isBlindMode = true;
    loadHanziWriter();
  } else {
    isBlindMode = false;
    currentStudyStep++;
    loadHanziWriter();
  }
});

document.getElementById('hint-btn').addEventListener('click', () => {
  if (writer) {
    writer.cancelQuiz();
    document.getElementById('status-msg').innerText = '모범 획순 시연 중...';
    document.getElementById('study-title-text').style.visibility = 'visible';

    let isReviewBlind = isReviewMode && currentReviewCount > 0;
    if (isBlindMode || isReviewBlind) writer.showOutline();

    writer.animateCharacter({
      onComplete: function () {
        document.getElementById('status-msg').innerText = '다시 기억을 더듬어 써보세요!';
        setTimeout(() => {
          if (isBlindMode || isReviewBlind) {
            document.getElementById('study-title-text').style.visibility = 'hidden';
            writer.hideOutline();
          }
          document.getElementById('status-msg').innerText = '';
          startQuizMode();
        }, 1500);
      },
    });
  }
});

document.getElementById('back-btn').addEventListener('click', () => {
  if (isReviewMode) {
    studyView.style.display = 'none';
    reviewListView.style.display = 'block';
    openReviewSelectModal(currentDayData);
  } else {
    exitStudy();
  }
});

const ttsButton = document.getElementById('tts-btn');
const triggerTTS = (e) => {
  if (e) e.preventDefault(); 
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  
  let targetData = (isReviewMode && reviewTargetIndex === 0) || (!isReviewMode && currentStudyStep === 0)
                   ? currentDayData.radical
                   : (isReviewMode ? reviewTargetData : currentDayData.related[currentStudyStep - 1]);
  let textToRead = (isReviewMode && reviewTargetIndex === 0) || (!isReviewMode && currentStudyStep === 0)
                   ? targetData.cnName : targetData.char;
  playTTS(textToRead);
};
ttsButton.addEventListener('touchstart', triggerTTS, { passive: false });
ttsButton.addEventListener('click', triggerTTS);

// ==========================================
// 10. 공통 함수 (TTS 등)
// ==========================================
let availableVoices = [];
window.speechSynthesis.onvoiceschanged = () => { availableVoices = window.speechSynthesis.getVoices(); };

function playTTS(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    if (availableVoices.length === 0) availableVoices = window.speechSynthesis.getVoices();
    const zhVoices = availableVoices.filter((v) => v.lang.includes('zh-CN') || v.lang.includes('zh-TW'));
    const femaleKeywords = ['huihui', 'xiaoxiao', 'yaoyao', 'ting', 'mei', 'lilian', 'google 普通话'];
    let selectedVoice = zhVoices.find((voice) => femaleKeywords.some((keyword) => voice.name.toLowerCase().includes(keyword)));
    if (!selectedVoice && zhVoices.length > 0) selectedVoice = zhVoices[0];
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  }
}

function exitStudy() {
  studyView.style.display = 'none';
  mainHeader.style.display = 'flex'; 
  levelSelector.style.display = 'flex';
  calendarView.style.display = 'grid';
  renderCalendar(currentLevel);
}
