// ==========================================
// 진담한자톡
// 학습 기록 키(jindamProgress / jindamReviewProgress / jindamExamProgress)는
// 예전 버전과 같아서 기존 진도가 그대로 이어집니다.
// ==========================================

// ---------- 1. 저장소 ----------
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (e) {
    return {};
  }
}
function save(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {}
}
const progressData = load('jindamProgress'); // { [day]: true }  학습 완료
const reviewProgressData = load('jindamReviewProgress'); // { "day-idx": true }  10번 쓰기 완료
const examProgressData = load('jindamExamProgress'); // { "day_idx": true, "day_N_mastered": true }
const settings = Object.assign({ bgm: true, welcomed: false }, load('jindamSettings'));

// ---------- 2. 상태 ----------
const REVIEW_TARGET = 10;
const EXAM_CHANCES = 3;
const LEVELS = [
  { level: 1, icon: '🌱', label: '기본' },
  { level: 2, icon: '🔄', label: '변신' },
  { level: 3, icon: '🌿', label: '사물' },
  { level: 4, icon: '🚶', label: '행동' },
  { level: 5, icon: '💭', label: '상태' },
];

const state = {
  level: 1,
  listMode: 'learn', // 목록 화면: learn(학습) | review(복습장) | exam(시험장)
  mode: null, // 쓰기 화면: learn | review | exam
  day: null, // 현재 curriculum 항목
  idx: 0, // 현재 글자 번호 (0 = 부수)
  blind: false, // 가이드 없이 쓰기
  reviewCount: 0,
  examMistakes: 0,
  busy: false, // 모범 획순 시연 중
  timer: null,
  nextAction: null,
};
let writer = null;

const $ = (id) => document.getElementById(id);
const charsOf = (day) => [day.radical, ...day.related];
const ttsTextOf = (day, idx) => (idx === 0 ? day.radical.cnName : day.related[idx - 1].char);
const pinyinOf = (day, idx) =>
  idx === 0 ? `${day.radical.cnName} (${day.radical.cnPinyin})` : day.related[idx - 1].pinyin;

// ---------- 3. 화면 전환 ----------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

// ---------- 4. 알림창 ----------
function showAlert(title, message, btnText, callback) {
  $('alert-title').innerText = title;
  $('alert-msg').innerText = message;
  const btn = $('alert-btn');
  btn.innerText = btnText || '확인';
  $('alert-modal').hidden = false;
  btn.onclick = () => {
    $('alert-modal').hidden = true;
    if (callback) callback();
  };
}

// ---------- 5. 소리 ----------
const bgmFiles = ['bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3'];
let bgmIndex = 0;
let bgmAudio = null;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (!bgmAudio) {
    bgmAudio = new Audio();
    bgmAudio.volume = 0.3;
    bgmAudio.addEventListener('ended', () => {
      bgmIndex = (bgmIndex + 1) % bgmFiles.length;
      bgmAudio.src = bgmFiles[bgmIndex];
      if (settings.bgm) bgmAudio.play().catch(() => {});
    });
  }
}
function updateBgm() {
  $('bgm-btn').innerText = settings.bgm ? '🔊' : '🔇';
  $('bgm-btn').classList.toggle('off', !settings.bgm);
  if (!bgmAudio) return;
  if (settings.bgm) {
    if (!bgmAudio.src) bgmAudio.src = bgmFiles[bgmIndex];
    bgmAudio.play().catch(() => {});
  } else {
    bgmAudio.pause();
  }
}
$('bgm-btn').addEventListener('click', () => {
  settings.bgm = !settings.bgm;
  save('jindamSettings', settings);
  updateBgm();
});
// 앱을 내리면 음악 멈춤, 돌아오면 다시 재생
document.addEventListener('visibilitychange', () => {
  if (!bgmAudio) return;
  if (document.hidden) bgmAudio.pause();
  else if (settings.bgm && bgmAudio.src) bgmAudio.play().catch(() => {});
});

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  const [f1, f2, vol, len] = type === 'tok' ? [600, 100, 1, 0.05] : [300, 40, 1.5, 0.15];
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f1, now);
  osc.frequency.exponentialRampToValueAtTime(f2, now + len);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + len);
  osc.start(now);
  osc.stop(now + len);
}

let voices = [];
if ('speechSynthesis' in window) {
  voices = speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => (voices = speechSynthesis.getVoices());
}
function playTTS(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.8;
  if (!voices.length) voices = speechSynthesis.getVoices();
  const zh = voices.filter((v) => /zh[-_](CN|TW)/i.test(v.lang));
  const female = ['huihui', 'xiaoxiao', 'yaoyao', 'ting', 'mei', 'lilian', 'google 普通话'];
  const v = zh.find((x) => female.some((k) => x.name.toLowerCase().includes(k))) || zh[0];
  if (v) u.voice = v;
  speechSynthesis.speak(u);
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

// ---------- 6. 시작 화면 ----------
(function setupChromeBanner() {
  const info = window.__jindamChrome;
  // 아이폰에서 크롬이 아닌 경우 시작 화면에 "크롬으로 열기" 안내
  if (!info || info.isChrome || !info.isIOS || !/^https?:$/.test(location.protocol)) return;
  const link = location.href.replace(/^http(s?):\/\//, (m, s) => (s ? 'googlechromes://' : 'googlechrome://'));
  $('chrome-open-btn').href = link;
  $('chrome-open-btn').addEventListener('click', (e) => e.stopPropagation());
  $('chrome-banner').hidden = false;
})();

$('intro-screen').addEventListener('click', () => {
  if (typeof curriculum === 'undefined' || typeof HanziWriter === 'undefined') {
    showAlert('연결 오류', '필요한 파일을 불러오지 못했어요.\n인터넷 연결을 확인하고 새로고침해 주세요.');
    return;
  }
  initAudio();
  updateBgm();
  openHome('learn');
  if (!settings.welcomed) {
    settings.welcomed = true;
    save('jindamSettings', settings);
    setTimeout(() => {
      showAlert(
        '환영합니다! 🥳',
        '부수를 통해 한자의 원리를 재미있게 익혀보세요.\n\n🔊 버튼으로 배경음악을 켜고 끌 수 있어요.',
        '시작하기',
      );
    }, 250);
  }
});

// ---------- 7. 목록 화면 (학습·복습장·시험장 공용) ----------
const HOME_TEXT = {
  learn: { title: '진담한자톡', hint: '' },
  review: { title: '📝 복습장', hint: '학습을 마친 부수의 한자를 10번씩 써 봐요' },
  exam: { title: '🎓 시험장', hint: `룰렛에 뽑힌 한자를 백지에 써요 (기회 ${EXAM_CHANCES}번)` },
};

function openHome(listMode) {
  state.listMode = listMode;
  const t = HOME_TEXT[listMode];
  $('home-title').innerText = t.title;
  $('home-hint').innerText = t.hint;
  $('home-back-btn').hidden = listMode === 'learn';
  $('open-exam-btn').hidden = listMode !== 'learn';
  $('open-review-btn').hidden = listMode !== 'learn';
  showScreen('home-screen');
  renderTabs();
  renderGrid();
}
$('open-exam-btn').addEventListener('click', () => openHome('exam'));
$('open-review-btn').addEventListener('click', () => openHome('review'));
$('home-back-btn').addEventListener('click', () => openHome('learn'));

function isDone(day, listMode) {
  if (listMode === 'learn') return !!progressData[day.day];
  if (listMode === 'exam') return !!examProgressData[`day_${day.day}_mastered`];
  return charsOf(day).every((_, i) => reviewProgressData[`${day.day}-${i}`]);
}

function renderTabs() {
  const box = $('level-tabs');
  box.innerHTML = '';
  LEVELS.forEach((lv) => {
    const days = curriculum.filter((d) => d.level === lv.level);
    const done = days.filter((d) => isDone(d, state.listMode)).length;
    const b = document.createElement('button');
    b.className = 'lvl-tab' + (lv.level === state.level ? ' active' : '');
    b.innerHTML = `<span class="t1">LV.${lv.level}</span><span class="t2">${lv.icon} ${lv.label}</span><span class="t3">${done}/${days.length}</span>`;
    b.onclick = () => {
      state.level = lv.level;
      renderTabs();
      renderGrid();
    };
    box.appendChild(b);
  });
}

// 폰트가 칸 윗부분에 그리는 머리 부수는 가운데로 내려서 표시
const TOP_RADICALS = '宀艹⺮罒爫';
function makeCharBtn(ch, name) {
  const b = document.createElement('button');
  b.className = 'day-btn' + (TOP_RADICALS.includes(ch) ? ' top-radical' : '');
  b.innerHTML = `<span class="char">${ch}</span><span class="name">${name}</span>`;
  return b;
}

function renderGrid() {
  const grid = $('day-grid');
  grid.innerHTML = '';
  const days = curriculum.filter((d) => d.level === state.level);
  days.forEach((day) => {
    const b = makeCharBtn(day.radical.char, day.radical.name);
    if (state.listMode === 'learn') {
      if (progressData[day.day]) b.classList.add('completed');
      b.onclick = () => startLearn(day);
    } else if (state.listMode === 'review') {
      if (!progressData[day.day]) {
        b.classList.add('locked');
        b.onclick = () => showAlert('아직 잠겨 있어요 🔒', '먼저 학습에서 이 부수를 끝까지 마치면 복습장이 열려요!');
      } else {
        b.classList.add(isDone(day, 'review') ? 'mastered' : 'completed');
        b.onclick = () => openReviewPicker(day);
      }
    } else {
      if (examProgressData[`day_${day.day}_mastered`]) b.classList.add('mastered');
      b.onclick = () => enterExam(day);
    }
    grid.appendChild(b);
  });
  fitGrid();
}

// 세로 스크롤 없이 모든 칸이 화면 안에 들어가도록 열 수·칸 크기 계산
function fitGrid() {
  const wrap = $('grid-wrap');
  const grid = $('day-grid');
  const n = grid.children.length;
  if (!n || !wrap.clientWidth) return;
  const cs = getComputedStyle(wrap);
  const W = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const H = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const gap = Math.round(Math.max(6, Math.min(14, Math.min(W, H) * 0.02)));
  let best = { cell: 0, cols: 1 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows);
    if (cell > best.cell) best = { cell, cols };
  }
  const cell = Math.floor(Math.min(best.cell, 150));
  grid.style.setProperty('--gap', gap + 'px');
  grid.style.setProperty('--cell', cell + 'px');
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${cell}px)`;
}

// ---------- 8. 글자 고르기 팝업 (복습장) / 룰렛 (시험장) ----------
function fillPickGrid(day, decorate) {
  const grid = $('pick-grid');
  grid.innerHTML = '';
  charsOf(day).forEach((c, i) => {
    const b = makeCharBtn(c.char, c.name);
    b.id = `pick-${i}`;
    decorate(b, i);
    grid.appendChild(b);
  });
}
function closePicker() {
  $('pick-modal').hidden = true;
}
$('pick-cancel-btn').addEventListener('click', closePicker);

function openReviewPicker(day) {
  state.day = day;
  $('pick-title').innerText = '집중 복습';
  $('pick-msg').innerText = `어떤 한자를 ${REVIEW_TARGET}번 연습할까요?`;
  $('pick-cancel-btn').hidden = false;
  fillPickGrid(day, (b, i) => {
    if (reviewProgressData[`${day.day}-${i}`]) b.classList.add('completed');
    b.onclick = () => {
      closePicker();
      startReview(day, i);
    };
  });
  $('pick-modal').hidden = false;
}

// ---------- 9. 쓰기 화면 공통 ----------
function writerSize() {
  const box = $('writer-box');
  const s = Math.floor(Math.min(box.clientWidth, box.clientHeight, 680)) - 6; // 테두리 3px×2
  return Math.max(120, s);
}
function sizeTarget(size) {
  const el = $('writer-target');
  el.style.width = size + 'px';
  el.style.height = size + 'px';
}

function setStatus(msg) {
  $('status-msg').innerText = msg;
}
function showNext(label, action) {
  state.nextAction = action;
  $('next-btn').innerText = label;
  $('next-btn').hidden = false;
}
function hideStory() {
  $('story-card').classList.remove('show');
}
function showStory(text) {
  if (!text) return;
  $('story-text').innerText = text;
  requestAnimationFrame(() => $('story-card').classList.add('show'));
}
function shake() {
  const el = $('writer-target');
  el.style.transform = 'translateX(-6px)';
  setTimeout(() => (el.style.transform = 'translateX(6px)'), 90);
  setTimeout(() => (el.style.transform = ''), 180);
}
function clearTimer() {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
}
function destroyWriter() {
  if (writer) {
    try {
      writer.cancelQuiz();
    } catch (e) {}
  }
  writer = null;
  $('writer-target').innerHTML = '';
}

// 현재 글자를 화면에 띄우고 쓰기 퀴즈 시작
function showCurrentChar() {
  clearTimer();
  destroyWriter();
  state.busy = false;
  hideStory();
  $('next-btn').hidden = true;
  $('hint-btn').hidden = state.mode === 'exam';

  const { day, idx, mode } = state;
  const target = charsOf(day)[idx];
  const masked = state.blind;

  $('study-title-text').innerText = target.char;
  $('study-title-text').classList.toggle('masked', masked);

  if (mode === 'exam') {
    $('study-desc').innerText = `🎓 시험 · ${idx === 0 ? '[부수] ' : ''}${target.name}`;
    $('pinyin-display').innerText = idx === 0 ? '' : target.pinyin;
    $('step-indicator').innerText = `기회 ${EXAM_CHANCES - state.examMistakes}번`;
  } else {
    $('study-desc').innerText = idx === 0 ? `[부수] ${target.name}` : target.name;
    $('pinyin-display').innerText = pinyinOf(day, idx);
    $('step-indicator').innerText =
      mode === 'review'
        ? `집중 훈련 ${state.reviewCount + 1} / ${REVIEW_TARGET}`
        : `Step ${idx * 2 + (state.blind ? 2 : 1)} / ${charsOf(day).length * 2}`;
  }

  if (mode === 'exam') setStatus('가이드 없이 백지에 써 보세요! ✍️');
  else if (masked) setStatus('가이드 없이 스스로 써 보세요! 🧠');
  else setStatus('획순에 맞춰 따라 써 보세요. ✍️');

  if (!masked || (mode === 'review' && state.reviewCount === 0)) playTTS(ttsTextOf(day, idx));

  const size = writerSize();
  sizeTarget(size);
  writer = HanziWriter.create('writer-target', target.char, {
    width: size,
    height: size,
    padding: Math.round(size * 0.06),
    highlightColor: '#e11d48',
    drawingColor: '#333333',
    drawingWidth: Math.max(18, Math.round(size / 10)),
    strokeWidth: 3,
    showCharacter: false,
    showOutline: !masked,
    showHintAfterMisses: mode === 'exam' ? false : 3,
    onLoadCharDataError: () => onCharDataError(target),
  });
  startQuiz();
}

function onCharDataError(target) {
  setStatus('');
  showAlert(
    '글자를 불러오지 못했어요',
    `"${target.char}"의 획순 데이터를 불러오지 못했어요.\n인터넷 연결을 확인해 주세요.`,
    '건너뛰기',
    () => {
      if (state.mode === 'learn') advanceLearn(true);
      else goBackFromStudy();
    },
  );
}

function startQuiz() {
  const handlers = { learn: learnHandlers, review: reviewHandlers, exam: examHandlers }[state.mode]();
  writer.quiz(handlers);
}

// ---------- 10. 학습 ----------
function startLearn(day) {
  Object.assign(state, { mode: 'learn', day, idx: 0, blind: false });
  showScreen('study-screen');
  requestAnimationFrame(showCurrentChar);
}

function learnHandlers() {
  return {
    onCorrectStroke: () => {
      playSound('tok');
      setStatus('좋아요! 다음 획을 그어 주세요. ✨');
    },
    onMistake: () => {
      setStatus('앗! 획순이나 방향이 틀렸어요. 😅');
      shake();
    },
    onComplete: () => {
      playSound('tuk');
      showStory(charsOf(state.day)[state.idx].story);
      const p = praiseList[Math.floor(Math.random() * praiseList.length)];
      playTTS(p.cn);
      if (!state.blind) {
        setStatus(`${p.cn} (${p.kr}) 이제 혼자 써 볼까요? 🔥`);
        showNext('혼자 써 보기 ▶', () => {
          state.blind = true;
          showCurrentChar();
        });
      } else {
        advanceLearn(false, p);
      }
    },
  };
}

function advanceLearn(skipped, praise) {
  const last = state.idx >= charsOf(state.day).length - 1;
  if (last) {
    progressData[state.day.day] = true;
    save('jindamProgress', progressData);
    setStatus('오늘의 학습을 모두 마쳤어요! 🎉');
    showNext('🏠 목록으로', goBackFromStudy);
    setTimeout(
      () => showAlert('학습 완료! 🏆', '오늘의 부수와 한자를 모두 익혔어요! 🎉\n복습장도 열렸어요.', '목록으로', goBackFromStudy),
      skipped ? 0 : 600,
    );
    return;
  }
  const go = () => {
    state.idx++;
    state.blind = false;
    showCurrentChar();
  };
  if (skipped) return go();
  setStatus(`${praise.cn} (${praise.kr}) 잘 기억했어요! 👏`);
  showNext('다음 한자 ▶', go);
}

// ---------- 11. 복습장 (10번 쓰기) ----------
function startReview(day, idx) {
  Object.assign(state, { mode: 'review', day, idx, reviewCount: 0, blind: false });
  showScreen('study-screen');
  requestAnimationFrame(showCurrentChar);
}

function reviewHandlers() {
  return {
    onCorrectStroke: () => {
      playSound('tok');
      setStatus('계속 이어서 그어 주세요! ✨');
    },
    onMistake: () => {
      setStatus('앗! 획순이나 방향이 틀렸어요. 😅');
      shake();
    },
    onComplete: () => {
      playSound('tuk');
      state.reviewCount++;
      if (state.reviewCount >= REVIEW_TARGET) {
        showStory(charsOf(state.day)[state.idx].story);
        playTTS('太出色了');
        setStatus(`${REVIEW_TARGET}번 쓰기를 마쳤어요! 🎉`);
        reviewProgressData[`${state.day.day}-${state.idx}`] = true;
        save('jindamReviewProgress', reviewProgressData);
        showNext('복습장으로 ▶', goBackFromStudy);
      } else {
        setStatus(`잘했어요! (${state.reviewCount}/${REVIEW_TARGET}) 다음 칸으로… 🔥`);
        state.timer = setTimeout(() => {
          state.blind = true; // 2회차부터는 가이드 없이
          showCurrentChar();
        }, 900);
      }
    },
  };
}

// ---------- 12. 시험장 ----------
function enterExam(day) {
  // 부수를 고를 때마다 새 시험 (마스터 기록은 유지)
  charsOf(day).forEach((_, i) => delete examProgressData[`${day.day}_${i}`]);
  save('jindamExamProgress', examProgressData);
  openRoulette(day);
}

function openRoulette(day) {
  state.day = day;
  const all = charsOf(day);
  const remaining = all.map((_, i) => i).filter((i) => !examProgressData[`${day.day}_${i}`]);
  $('pick-title').innerText = '시험 룰렛';
  $('pick-msg').innerText = '어떤 한자가 나올까요?';
  $('pick-cancel-btn').hidden = true;
  fillPickGrid(day, (b, i) => {
    if (!remaining.includes(i)) b.classList.add('passed');
    b.disabled = true;
  });
  $('pick-modal').hidden = false;
  setTimeout(() => spinRoulette(remaining), 700);
}

function spinRoulette(remaining) {
  const pick = Math.floor(Math.random() * remaining.length);
  const totalSteps = remaining.length * 3 + pick;
  let step = 0;
  let speed = 40;
  $('pick-msg').innerText = '룰렛이 돌아가요…!';
  const tick = () => {
    remaining.forEach((i) => $(`pick-${i}`).classList.remove('spin'));
    $(`pick-${remaining[step % remaining.length]}`).classList.add('spin');
    playSound('tok');
    if (step < totalSteps) {
      step++;
      speed += 12;
      state.timer = setTimeout(tick, speed);
      return;
    }
    $('pick-msg').innerText = '당첨! 이 한자를 써 주세요!';
    playSound('tuk');
    state.timer = setTimeout(() => {
      closePicker();
      startExam(state.day, remaining[pick]);
    }, 1200);
  };
  tick();
}

function startExam(day, idx) {
  Object.assign(state, { mode: 'exam', day, idx, blind: true, examMistakes: 0 });
  showScreen('study-screen');
  requestAnimationFrame(showCurrentChar);
}

function examHandlers() {
  return {
    onCorrectStroke: () => playSound('tok'),
    onMistake: () => {
      state.examMistakes++;
      const left = EXAM_CHANCES - state.examMistakes;
      playSound('tuk');
      shake();
      $('step-indicator').innerText = `기회 ${Math.max(0, left)}번`;
      if (left > 0) {
        setStatus(`앗! 틀렸어요. (남은 기회: ${left}번) 😅`);
        return;
      }
      writer.cancelQuiz();
      $('study-title-text').classList.remove('masked'); // 정답 보여주기
      writer.showOutline();
      playTTS('加油');
      setStatus('정답을 확인해 보세요.');
      showAlert('아쉬워요 😭', `기회 ${EXAM_CHANCES}번을 모두 썼어요.\n정답을 확인하고 다시 도전해요!`, '다시 룰렛 돌리기', () =>
        openRoulette(state.day),
      );
    },
    onComplete: () => {
      if (state.examMistakes >= EXAM_CHANCES) return;
      playSound('tuk');
      playTTS('回答正确！做得太棒了！');
      const day = state.day;
      examProgressData[`${day.day}_${state.idx}`] = true;
      const total = charsOf(day).length;
      const passed = charsOf(day).filter((_, i) => examProgressData[`${day.day}_${i}`]).length;
      if (passed >= total) {
        examProgressData[`day_${day.day}_mastered`] = true;
        save('jindamExamProgress', examProgressData);
        showAlert('🎉 부수 마스터! 🎉', `${total}개의 한자를 모두 맞혔어요!`, '최고예요!', () => openHome('exam'));
      } else {
        save('jindamExamProgress', examProgressData);
        showAlert('정답! 👏', `정말 잘했어요!\n남은 한자: ${total - passed}개`, '다음 룰렛 돌리기', () =>
          openRoulette(day),
        );
      }
    },
  };
}

// ---------- 13. 버튼 ----------
function goBackFromStudy() {
  clearTimer();
  destroyWriter();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const mode = state.mode;
  state.mode = null;
  if (mode === 'review') {
    openHome('review');
    openReviewPicker(state.day);
  } else if (mode === 'exam') {
    openHome('exam');
  } else {
    openHome('learn');
  }
}
$('back-btn').addEventListener('click', goBackFromStudy);

$('next-btn').addEventListener('click', () => {
  const action = state.nextAction;
  state.nextAction = null;
  if (action) action();
});

$('hint-btn').addEventListener('click', () => {
  if (!writer || state.busy || state.mode === 'exam') return;
  state.busy = true;
  writer.cancelQuiz();
  setStatus('모범 획순을 보여 줄게요…');
  $('study-title-text').classList.remove('masked');
  if (state.blind) writer.showOutline();
  writer.animateCharacter({
    onComplete: () => {
      setStatus('이제 다시 써 보세요!');
      state.timer = setTimeout(() => {
        if (!writer) return;
        writer.hideCharacter();
        if (state.blind) {
          $('study-title-text').classList.add('masked');
          writer.hideOutline();
        }
        state.busy = false;
        startQuiz();
      }, 1200);
    },
  });
});

$('tts-btn').addEventListener('click', (e) => {
  e.preventDefault();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (state.day) playTTS(ttsTextOf(state.day, state.idx));
});

// ---------- 14. 화면 크기 변화 (회전·창 크기 조절) ----------
let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if ($('home-screen').classList.contains('active')) fitGrid();
    if ($('study-screen').classList.contains('active') && writer) {
      const size = writerSize();
      sizeTarget(size);
      writer.updateDimensions({ width: size, height: size, padding: Math.round(size * 0.06) });
    }
  }, 120);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
if (window.visualViewport) visualViewport.addEventListener('resize', onResize);

// ---------- 15. 확대 막기 (아이폰 사파리는 viewport 설정을 무시하므로 직접 차단) ----------
['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }),
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);
// 두 번 탭 확대는 CSS(touch-action: manipulation)로 막음
document.addEventListener('contextmenu', (e) => e.preventDefault());
// 데스크톱 Ctrl+휠 확대도 막기
document.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) e.preventDefault();
  },
  { passive: false },
);
