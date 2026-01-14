// script.js — Game Matematika Interaktif (dengan history, leaderboard, animasi, suara)
// Bahasa UI: Bahasa Indonesia

/* ============================
   Data soal (Kelas X — Kurikulum Merdeka)
   setiap objek: { question, choices[], answer, explanation, difficulty }
   ============================ */
const QUESTIONS = [
  { question: "Hitung: |−7| + |3|", choices: ["10","4","7","3"], answer: "10", explanation: "|−7| = 7 dan |3| = 3 sehingga 7 + 3 = 10.", difficulty: "easy" },
  { question: "Selesaikan: x/4 = 3 → x = ...", choices: ["12","7","1/12","9"], answer: "12", explanation: "x/4 = 3 → x = 3 × 4 = 12.", difficulty: "easy" },
  { question: "Jika 2(x + 3) = 14, nilai x adalah ...", choices: ["4","5","2","3"], answer: "4", explanation: "2(x+3)=14 → x+3=7 → x=4.", difficulty: "easy" },

  { question: "Hitung: (2/3) + (1/6) = ...", choices: ["5/6","1/2","3/4","4/5"], answer: "5/6", explanation: "Samakan penyebut: 2/3 = 4/6, jadi 4/6 + 1/6 = 5/6.", difficulty: "medium" },
  { question: "Jika 3x - 5 = 16, maka x = ...", choices: ["7","8","3","5"], answer: "7", explanation: "3x - 5 = 16 → 3x = 21 → x = 7.", difficulty: "medium" },
  { question: "Perbandingan 4 : x = 6 : 9, maka x = ...", choices: ["6","8/3","3/2","6/1"], answer: "6", explanation: "4/x = 6/9 → 4/x = 2/3 → x = 4 × 3/2 = 6.", difficulty: "medium" },

  { question: "Hitung: 5 + 3 × 2 - 4 ÷ 2", choices: ["10","9","8","7"], answer: "9", explanation: "Operasi: perkalian & pembagian dulu. 3×2=6, 4÷2=2 → 5 + 6 - 2 = 9.", difficulty: "hard" },
  { question: "Jika 5 - 2x = 1, maka x = ...", choices: ["2","1","-2","3"], answer: "2", explanation: "5 - 2x = 1 → -2x = -4 → x = 2.", difficulty: "hard" },
  { question: "Perbandingan tinggi:lebar sebuah gambar 3:4. Jika lebarnya 32 cm, tinggi adalah ...", choices: ["24 cm","36 cm","18 cm","28 cm"], answer: "24 cm", explanation: "Skala = 32/4 = 8 → tinggi = 3 × 8 = 24 cm.", difficulty: "hard" },
  { question: "Jika perbandingan a:b = 5:2 dan a = 25, maka b = ...", choices: ["10","5","12.5","15"], answer: "10", explanation: "Skala = 25/5 = 5 → b = 2 × 5 = 10.", difficulty: "hard" }
];

/* ============================
   Konfigurasi difficulty dan storage keys
   ============================ */
const DIFFICULTY_CONFIG = {
  easy: { minTime: 45, maxTime: 60, points: 1 },
  medium: { minTime: 30, maxTime: 45, points: 2 },
  hard: { minTime: 20, maxTime: 30, points: 3 },
  mixed: { minTime: 20, maxTime: 60, points: 2 }
};

const HISTORY_KEY = 'math-game-history';
const LEADERBOARD_KEY_PREFIX = 'math-game-leaderboard-'; // + difficulty
const HIGHSCORE_KEY_PREFIX = 'math-game-highscore-';
const HISTORY_MAX_ENTRIES = 10;
const LEADERBOARD_MAX = 5;

/* ============================
   Utilities
   ============================ */
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function shuffleArray(array){
  for (let i = array.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function formatTime(sec){
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60).toString().padStart(2,'0');
  const ss = (s % 60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
}
function randomInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function nowIso(){ return new Date().toISOString(); }
function shortDate(iso){ return new Date(iso).toLocaleString(); }

/* ============================
   Storage: history, leaderboard, highscore
   ============================ */
function getHistory(){
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}
function pushHistory(entry){
  const h = getHistory();
  h.unshift(entry); // newest first
  if (h.length > HISTORY_MAX_ENTRIES) h.length = HISTORY_MAX_ENTRIES;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
function clearHistory(){
  localStorage.removeItem(HISTORY_KEY);
}

function leaderboardKey(diff){ return `${LEADERBOARD_KEY_PREFIX}${diff}`; }
function getLeaderboard(diff){
  try {
    return JSON.parse(localStorage.getItem(leaderboardKey(diff)) || '[]');
  } catch { return []; }
}
function saveLeaderboard(diff, arr){
  localStorage.setItem(leaderboardKey(diff), JSON.stringify(arr.slice(0, LEADERBOARD_MAX)));
}
function clearLeaderboard(){
  ['mixed','easy','medium','hard'].forEach(d => localStorage.removeItem(leaderboardKey(d)));
}

function highscoreKey(diff){ return `${HIGHSCORE_KEY_PREFIX}${diff}`; }
function getHighScore(diff){
  const v = localStorage.getItem(highscoreKey(diff));
  return v ? Number(v) : 0;
}
function setHighScore(diff, score){
  const prev = getHighScore(diff);
  if (score > prev){
    localStorage.setItem(highscoreKey(diff), String(score));
    return true;
  }
  return false;
}

/* ============================
   Audio engine (WebAudio)
   ============================ */
const AudioEngine = (() => {
  let ctx = null;
  let enabled = true;
  function ensure(){ if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  function playTone(freq, duration=0.15, type='sine', gain=0.12){
    if (!enabled) return;
    ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration + 0.02);
  }
  function playSuccess(){ if (!enabled) return; playTone(600,0.12); setTimeout(()=>playTone(900,0.12),120); }
  function playWrong(){ if (!enabled) return; playTone(220,0.35,'sawtooth',0.14); }
  function playTimeUp(){ if (!enabled) return; playTone(400,0.12); setTimeout(()=>playTone(260,0.18),140); }
  function setEnabled(v){ enabled = !!v; if (enabled && ctx && ctx.state === 'suspended') ctx.resume(); }
  return { playSuccess, playWrong, playTimeUp, setEnabled };
})();

/* ============================
   App state & DOM refs
   ============================ */
let allQuestions = [];
let questions = [];
let currentIdx = 0;
let score = 0;
let timer = null;
let timeLeft = 0;
let totalQuestions = 0;
let acceptingAnswers = false;
let activeDifficulty = 'mixed';
let pointsPerCorrect = DIFFICULTY_CONFIG.mixed.points;
let soundEnabled = true;

const startScreen = $('#start-screen');
const startBtn = $('#start-btn');
const gameScreen = $('#game-screen');
const endScreen = $('#end-screen');
const restartBtn = $('#restart-btn');

const questionCard = $('#question-card');
const questionEl = $('#question');
const explanationEl = $('#explanation');
const choicesEl = $('#choices');
const scoreEl = $('#score');
const timerEl = $('#timer');
const toastEl = $('#toast');
const questionNumberEl = $('#question-number');
const currentEl = $('#current');
const totalEl = $('#total');
const finalScoreEl = $('#final-score');
const finalMessageEl = $('#final-message');
const highscoreDisplay = $('#highscore-display');
const questionDiffEl = $('#question-diff');
const endDiffEl = $('#end-diff');
const bestScoreEl = $('#best-score');

const soundToggleEl = $('#sound-toggle');
const difficultyRadios = $all('input[name="difficulty"]');

const historyListEl = $('#history-list');
const leaderboardListEl = $('#leaderboard-list');
const lbTabs = $all('.lb-tab');
const modal = $('#name-modal');
const playerNameInput = $('#player-name');
const saveNameBtn = $('#save-name-btn');
const skipNameBtn = $('#skip-name-btn');
const modalDiffSpan = $('#modal-diff');
const endLeaderboardList = $('#end-leaderboard-list');
const endDiffSpan2 = $('#end-diff-2');
const clearHistoryBtn = $('#clear-history');
const clearLeaderboardBtn = $('#clear-leaderboard');

/* ============================
   Init & UI wiring
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  allQuestions = [...QUESTIONS];
  allQuestions.forEach(q => { if (!q.difficulty) q.difficulty = 'medium'; });

  activeDifficulty = getSelectedDifficulty();
  soundEnabled = soundToggleEl.checked;
  AudioEngine.setEnabled(soundEnabled);

  // Update displays
  updateHighscoreDisplay();
  renderHistory();
  renderLeaderboardPanel(activeDifficulty);

  // Event listeners
  startBtn.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', startGame);
  soundToggleEl.addEventListener('change', e => { soundEnabled = !!e.target.checked; AudioEngine.setEnabled(soundEnabled); });
  difficultyRadios.forEach(r => r.addEventListener('change', () => { activeDifficulty = getSelectedDifficulty(); updateHighscoreDisplay(); renderLeaderboardPanel(activeDifficulty); renderHistory(); }));

  lbTabs.forEach(tab => { tab.addEventListener('click', () => {
    lbTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLeaderboardPanel(tab.dataset.diff);
  })});

  saveNameBtn.addEventListener('click', savePlayerName);
  skipNameBtn.addEventListener('click', () => { hideModal(); finalizeEndScreen(); });

  clearHistoryBtn.addEventListener('click', () => { if (confirm('Hapus semua riwayat permainan?')){ clearHistory(); renderHistory(); }});
  clearLeaderboardBtn.addEventListener('click', () => { if (confirm('Hapus semua leaderboard?')){ clearLeaderboard(); renderLeaderboardPanel(getSelectedDifficulty()); }});
});

/* ============================
   Helpers: UI renders for history/leaderboard
   ============================ */
function getSelectedDifficulty(){ const r = document.querySelector('input[name="difficulty"]:checked'); return r ? r.value : 'mixed'; }

function updateHighscoreDisplay(){
  const diff = getSelectedDifficulty();
  const val = getHighScore(diff);
  highscoreDisplay.textContent = val > 0 ? val : '-';
}

function renderHistory(){
  const arr = getHistory();
  historyListEl.innerHTML = '';
  if (!arr.length){
    historyListEl.innerHTML = '<li class="muted">Belum ada riwayat</li>';
    return;
  }
  arr.slice(0, HISTORY_MAX_ENTRIES).forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${shortDate(entry.date)} — ${entry.difficulty.toUpperCase()} — Skor: ${entry.score} / ${entry.totalQuestions}`;
    historyListEl.appendChild(li);
  });
}

function renderLeaderboardPanel(diff){
  const list = getLeaderboard(diff);
  leaderboardListEl.innerHTML = '';
  if (!list.length){
    leaderboardListEl.innerHTML = '<li class="muted">Belum ada leaderboard</li>';
    return;
  }
  list.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name}</span><span>${item.score}</span>`;
    leaderboardListEl.appendChild(li);
  });
}

/* ============================
   Start game
   ============================ */
function startGame(){
  activeDifficulty = getSelectedDifficulty();
  pointsPerCorrect = DIFFICULTY_CONFIG[activeDifficulty].points;
  soundEnabled = soundToggleEl.checked;
  AudioEngine.setEnabled(soundEnabled);

  // Filter questions
  if (activeDifficulty === 'mixed'){
    questions = shuffleArray([...allQuestions]);
  } else {
    const filtered = allQuestions.filter(q => q.difficulty === activeDifficulty);
    questions = filtered.length ? shuffleArray(filtered) : shuffleArray([...allQuestions]);
  }

  totalQuestions = questions.length;
  if (totalQuestions === 0){ alert('Tidak ada soal tersedia. Tambahkan soal di array QUESTIONS.'); return; }

  // reset
  score = 0; currentIdx = 0;
  scoreEl.textContent = score;
  totalEl.textContent = totalQuestions;
  questionNumberEl.textContent = '';
  questionDiffEl.textContent = '';

  // show game
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');

  // initial animate
  questionCard.classList.remove('fade-in','fade-out');
  showQuestion();
}

/* ============================
   Show question with animation
   ============================ */
function showQuestion(){
  clearInterval(timer);
  explanationEl.classList.add('hidden');
  explanationEl.textContent = '';

  if (currentIdx >= totalQuestions){
    endGame();
    return;
  }

  // animate out then in for smooth transition
  questionCard.classList.add('fade-out');
  setTimeout(() => {
    // set content
    const q = questions[currentIdx];
    questionNumberEl.textContent = `Soal ${currentIdx + 1}`;
    questionDiffEl.textContent = q.difficulty ? q.difficulty.toUpperCase() : '';
    questionEl.textContent = q.question;

    // choices
    const choices = shuffleArray([...q.choices]);
    choicesEl.innerHTML = '';
    choices.forEach(choiceText => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.type = 'button';
      btn.innerHTML = `<span class="choice-label">${choiceText}</span>`;
      btn.addEventListener('click', () => handleChoice(btn, choiceText));
      choicesEl.appendChild(btn);
    });

    // timer config based on active difficulty or question difficulty when mixed
    const cfg = DIFFICULTY_CONFIG[activeDifficulty] || DIFFICULTY_CONFIG.mixed;
    const useCfg = (activeDifficulty === 'mixed' && q.difficulty && DIFFICULTY_CONFIG[q.difficulty]) ? DIFFICULTY_CONFIG[q.difficulty] : cfg;
    timeLeft = randomInt(useCfg.minTime, useCfg.maxTime);
    timerEl.textContent = formatTime(timeLeft);

    // start timer
    timer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = formatTime(timeLeft);
      if (timeLeft <= 0){ clearInterval(timer); handleTimeOut(); }
    }, 1000);

    acceptingAnswers = true;

    // animate back in
    questionCard.classList.remove('fade-out');
    questionCard.classList.add('fade-in');
    setTimeout(()=> questionCard.classList.remove('fade-in'), 350);

  }, 220);
}

/* ============================
   Handle answer selection
   ============================ */
function handleChoice(btn, chosenText){
  if (!acceptingAnswers) return;
  acceptingAnswers = false;
  clearInterval(timer);

  // disable all choices
  $all('.choice').forEach(b => { b.classList.add('disabled'); });

  const q = questions[currentIdx];
  const correct = chosenText === q.answer;

  if (correct){
    btn.classList.add('correct');
    showToast('BENAR', true);
    score += pointsPerCorrect;
    scoreEl.textContent = score;
    // score visual bump
    scoreEl.classList.add('bump');
    setTimeout(()=> scoreEl.classList.remove('bump'), 280);
    explanationEl.textContent = 'Jawaban benar — bagus!';
    explanationEl.classList.remove('hidden');
    explanationEl.classList.add('show');
    AudioEngine.playSuccess();
  } else {
    btn.classList.add('wrong');
    // highlight correct
    $all('.choice').forEach(b => { if (b.textContent.trim() === q.answer) b.classList.add('correct'); });
    showToast('SALAH', false);
    explanationEl.textContent = q.explanation || 'Penjelasan tidak tersedia.';
    explanationEl.classList.remove('hidden');
    explanationEl.classList.add('show');
    AudioEngine.playWrong();
  }

  currentIdx++;
  setTimeout(() => { showQuestion(); }, 2100);
}

/* ============================
   Time out handling
   ============================ */
function handleTimeOut(){
  if (!acceptingAnswers) return;
  acceptingAnswers = false;
  $all('.choice').forEach(b => { b.classList.add('disabled'); });

  const q = questions[currentIdx];
  $all('.choice').forEach(b => { if (b.textContent.trim() === q.answer) b.classList.add('correct'); });

  showToast('WAKTU HABIS', false);
  explanationEl.textContent = `Waktu habis. ${q.explanation || ''}`;
  explanationEl.classList.remove('hidden');
  explanationEl.classList.add('show');
  AudioEngine.playTimeUp();

  currentIdx++;
  setTimeout(() => { showQuestion(); }, 2400);
}

/* ============================
   Toast
   ============================ */
let toastTimeout = null;
function showToast(text, success = true){
  clearTimeout(toastTimeout);
  toastEl.textContent = text;
  toastEl.className = 'toast';
  toastEl.classList.add(success ? 'success' : 'error');
  toastEl.classList.remove('hidden');
  toastTimeout = setTimeout(()=> toastEl.classList.add('hidden'), 1400);
}

/* ============================
   End game: history, highscore, leaderboard prompt
   ============================ */
let pendingLeaderboardEntry = null;

function endGame(){
  clearInterval(timer);
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');

  finalScoreEl.textContent = score;

  // motivational message
  const maxPossible = totalQuestions * (DIFFICULTY_CONFIG[activeDifficulty]?.points || 2);
  const pct = Math.round((score / Math.max(1, maxPossible)) * 100);
  let message = '';
  if (pct >= 90) message = "Luar biasa! Terus pertahankan semangat belajarmu!";
  else if (pct >= 70) message = "Kerja bagus! Coba lagi untuk 100%!";
  else if (pct >= 45) message = "Bagus, ada kemajuan. Ulangi lagi supaya makin percaya diri!";
  else message = "Jangan menyerah! Pelajari lagi penjelasan tiap soal, kamu pasti bisa meningkat.";
  finalMessageEl.textContent = message;

  // push history
  const historyEntry = { date: nowIso(), difficulty: activeDifficulty, score, totalQuestions };
  pushHistory(historyEntry);
  renderHistory();

  // highscore
  const improved = setHighScore(activeDifficulty, score);
  const best = getHighScore(activeDifficulty);
  endDiffEl.textContent = activeDifficulty.toUpperCase();
  bestScoreEl.textContent = best > 0 ? best : '-';

  // show leaderboard for this difficulty
  endDiffSpan2.textContent = activeDifficulty.toUpperCase();
  renderEndLeaderboard(activeDifficulty);

  if (improved) showToast('Skor tertinggi diperbarui!', true);

  // check leaderboard qualification
  checkLeaderboardQualification();
}

/* ============================
   Leaderboard functions
   ============================ */
function checkLeaderboardQualification(){
  const lb = getLeaderboard(activeDifficulty);
  const minToEnter = (lb.length < LEADERBOARD_MAX) ? -Infinity : lb[lb.length - 1].score;
  if (lb.length < LEADERBOARD_MAX || score > minToEnter){
    // qualify
    pendingLeaderboardEntry = { name: null, score, date: nowIso() };
    showModalForName(activeDifficulty);
  } else {
    // finalize end screen
    finalizeEndScreen();
  }
}

function showModalForName(diff){
  modal.classList.remove('hidden');
  modalDiffSpan.textContent = diff.toUpperCase();
  playerNameInput.value = '';
  playerNameInput.focus();
}

function hideModal(){ modal.classList.add('hidden'); }

function savePlayerName(){
  const name = playerNameInput.value.trim().substring(0,12) || 'Anon';
  pendingLeaderboardEntry.name = name;
  const lb = getLeaderboard(activeDifficulty);
  lb.push(pendingLeaderboardEntry);
  // sort desc by score then recent date
  lb.sort((a,b) => b.score - a.score || (new Date(b.date) - new Date(a.date)));
  saveLeaderboard(activeDifficulty, lb);
  hideModal();
  renderEndLeaderboard(activeDifficulty);
  renderLeaderboardPanel(activeDifficulty);
  finalizeEndScreen();
}
function finalizeEndScreen(){
  // clear pending
  pendingLeaderboardEntry = null;
  // update start screen highscore & leaderboard
  updateHighscoreDisplay();
  renderLeaderboardPanel(getSelectedDifficulty());
}

/* render leaderboard on end screen */
function renderEndLeaderboard(diff){
  const arr = getLeaderboard(diff);
  endLeaderboardList.innerHTML = '';
  if (!arr.length){
    endLeaderboardList.innerHTML = '<li class="muted">Belum ada leaderboard</li>';
    return;
  }
  arr.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name}</span><span>${item.score}</span>`;
    endLeaderboardList.appendChild(li);
  });
}

/* ============================
   Clear beforeunload if on game
   ============================ */
window.addEventListener('beforeunload', (e) => {
  if (!gameScreen.classList.contains('hidden')) {
    e.preventDefault();
    e.returnValue = '';
  }
});