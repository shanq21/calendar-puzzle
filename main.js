// main.js
import {
    boardCells,
    holeIds,
    initBoard,
    markHolesForTarget
  } from './board.js';
  
  import {
    pieces,
    buildPieces,
    layoutPiecesInitial,
    attachPieceEvents,
    getPieceCells,
    setPieceStyle,
    captureSolution,
    applySolution
  } from './pieces.js';
  import * as piecesApi from './pieces.js';
  import { solvePuzzleDFS } from './solver.js';
  import { playVictorySound } from './sounds.js';
  
  const boardEl         = document.getElementById('board');
  const piecesContainer = document.getElementById('pieces-container');
  const statusEl        = document.getElementById('status');
  const targetTextEl    = document.getElementById('target-text');
  const onboardingEl    = document.getElementById('onboarding-text');
  const showAnswerConfirmEl = document.getElementById('show-answer-confirm');
  const showAnswerConfirmTextEl = document.getElementById('show-answer-confirm-text');
  const showAnswerConfirmNoteEl = document.getElementById('show-answer-confirm-note');
  const showAnswerConfirmOkBtn = document.getElementById('show-answer-confirm-ok');
  const showAnswerConfirmCancelBtn = document.getElementById('show-answer-confirm-cancel');
  const calendarSection = document.getElementById('calendar-section');
  const calendarToggle = document.getElementById('calendar-toggle');
  const langToggle = document.getElementById('lang-toggle');
  const calendarTitle   = document.getElementById('calendar-title');
  const calendarGrid    = document.getElementById('calendar-grid');
  const calPrevBtn      = document.getElementById('cal-prev');
  const calNextBtn      = document.getElementById('cal-next');
  const calMenuTitle    = document.getElementById('calendar-menu-title');
  const calRestoreBtn   = document.getElementById('cal-restore');
  const calExportBtn    = document.getElementById('cal-export');
  const calImportInput  = document.getElementById('cal-import-input');
  const solveBtn = document.getElementById('solve-btn');
  
  // 默认目标日期（可以随时被随机 / today 覆盖）
  const target = { year: 2026, monthIndex: 1, day: 3, weekdayIndex: 2 };
  const completedDates = new Set();
  const dateMarks = new Map();
  const solutions = new Map();
  const shownSolveKeysByDate = new Map();
  const MAX_HINTS = 3;
  const VICTORY_DEBOUNCE_MS = 1800;
  let activeHintSolution = null;
  let hintUsedCount = 0;
  let lastVictoryKey = '';
  let lastVictoryAt = 0;
  const hintedPieceIds = new Set();
  let selectedDate = null;
  let hasConfirmedShowAnswer = false;
  let pendingShowAnswerSolution = null;
  let calendarView = { year: target.year, monthIndex: target.monthIndex };
  const LOCALE_KEY = 'calendar-puzzle-locale';
  const SUPPORTED_LOCALES = ['en', 'zh'];
  let currentLocale = 'en';

  const I18N = {
    en: {
      htmlLang: 'en',
      pageTitle: 'Perpetual Calendar Puzzle',
      title: 'Calendar Puzzle',
      calendar: 'Calendar',
      random: 'Random Day',
      today: 'Today',
      restore: 'Restore',
      export: 'Export',
      import: 'Import',
      clear: 'Clear',
      solve: 'Auto Solve',
      hint: 'Hint',
      showAnswer: 'Show Answer',
      showAnswerConfirm: 'Show the answer?',
      showAnswerNote: 'There may be more than one solution. We’ll show one of them.',
      confirm: 'Show',
      cancel: 'Cancel',
      selected: 'Selected',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      langToggleTitle: 'Switch to Chinese',
      onboarding: 'Fill the board with all pieces, leaving only today’s month, day, and weekday uncovered.\nYou can drag pieces and click a piece to rotate it.',
      colors: {
        blue: 'Blue',
        green: 'Green',
        pink: 'Pink',
        orange: 'Orange',
        purple: 'Purple',
        coffee: 'Coffee',
        clear: 'Clear'
      },
      months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      weekdays: ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'],
      calendarWeekdays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      status: {
        dataImported: 'Data imported.',
        importFailed: 'Import failed. Please check the file format.',
        illegalPlacement: 'Some pieces are not placed correctly on the board.',
        unusableCell: 'A piece is outside the board or on an invalid cell.',
        coverTarget: 'Pieces can’t cover the target month/day/weekday.',
        overlap: 'Pieces overlap.',
        targetMustStayOpen: 'Target cells must stay uncovered.',
        notAllCovered: 'Some cells are still uncovered.',
        perfect: 'Great job, this solution works!',
        noHintSolution: 'No solution found for hints.',
        answerShown: 'Answer shown.',
        noMoreHints: 'No more hint pieces. Click “Show Answer” to reveal the full answer.',
        hintsUsedUp: 'Hints are used up. Click “Show Answer” to reveal the full answer.',
        solving: 'Solving...',
        noSolution: (ms) => `No solution found (${ms} ms).`,
        solvedRecycled: (ms) => `Solved in ${ms} ms (cycled solution pool).`,
        solvedNew: (ms) => `Solved in ${ms} ms (new solution).`,
        noSavedSolution: 'No saved solution for this date.',
        solutionRestored: 'Solution restored.',
        hintProgress: (used, max) => `Hint ${used}/${max}: placed one piece.`
      }
    },
    zh: {
      htmlLang: 'zh-CN',
      pageTitle: '万年历拼图',
      title: '日历拼图',
      calendar: '日历',
      random: '随机一天',
      today: '今天',
      restore: '恢复',
      export: '导出',
      import: '导入',
      clear: '清空',
      solve: '自动求解',
      hint: '提示',
      showAnswer: '显示答案',
      showAnswerConfirm: '要显示答案吗？',
      showAnswerNote: '可能不止一种解法，这里会显示其中一种。',
      confirm: '显示',
      cancel: '取消',
      selected: '已选择',
      prevMonth: '上个月',
      nextMonth: '下个月',
      langToggleTitle: '切换到英文',
      onboarding: '目标是用拼块填满棋盘，只露出当天对应的月份、日期和星期。\n你可以拖动拼块，也可以单击拼块旋转。',
      colors: {
        blue: '蓝色',
        green: '绿色',
        pink: '粉色',
        orange: '橙色',
        purple: '紫色',
        coffee: '咖啡色',
        clear: '透明'
      },
      months: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      weekdays: ['周日','周一','周二','周三','周四','周五','周六'],
      calendarWeekdays: ['日','一','二','三','四','五','六'],
      status: {
        dataImported: '数据导入成功。',
        importFailed: '导入失败，请检查文件格式。',
        illegalPlacement: '还有拼块没有正确放在棋盘上。',
        unusableCell: '有拼块超出棋盘或放在不可用格子上。',
        coverTarget: '拼块不能覆盖目标的月份/日期/星期。',
        overlap: '拼块发生重叠。',
        targetMustStayOpen: '目标格需要保持空白。',
        notAllCovered: '还有格子没有覆盖。',
        perfect: '太棒了，解法正确！',
        noHintSolution: '当前日期没有可用提示解。',
        answerShown: '已显示答案。',
        noMoreHints: '没有更多可提示的拼块了。点击“显示答案”查看完整解。',
        hintsUsedUp: '提示次数已用完。点击“显示答案”查看完整解。',
        solving: '正在求解…',
        noSolution: (ms) => `未找到解（${ms} 毫秒）。`,
        solvedRecycled: (ms) => `求解完成（${ms} 毫秒，循环解池）。`,
        solvedNew: (ms) => `求解完成（${ms} 毫秒，新解）。`,
        noSavedSolution: '这个日期还没有保存过解法。',
        solutionRestored: '已恢复该日期解法。',
        hintProgress: (used, max) => `提示 ${used}/${max}：已放置一个拼块。`
      }
    }
  };

  function isSupportedLocale(locale) {
    return SUPPORTED_LOCALES.includes(locale);
  }

  function detectInitialLocale() {
    let saved = null;
    try {
      saved = localStorage.getItem(LOCALE_KEY);
    } catch (e) {
      saved = null;
    }
    if (isSupportedLocale(saved)) return saved;
    const candidates = Array.isArray(navigator.languages) ? navigator.languages : [navigator.language];
    const matched = candidates.find(l => typeof l === 'string' && l.toLowerCase().startsWith('zh'));
    return matched ? 'zh' : 'en';
  }

  function t() {
    return I18N[currentLocale] || I18N.en;
  }

  function isDevEnvironment() {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1' || params.get('env') === 'dev') return true;
    return false;
  }

  const IS_DEV_ENV = isDevEnvironment();

  function formatDate(year, monthIndex, day, weekdayIndex) {
    if (currentLocale === 'zh') {
      return `${t().weekdays[weekdayIndex]}，${year}年${monthIndex + 1}月${day}日`;
    }
    return `${t().weekdays[weekdayIndex]}, ${t().months[monthIndex]} ${day}, ${year}`;
  }

  function formatCalendarTitle(year, monthIndex) {
    if (currentLocale === 'zh') return `${year}年 ${t().months[monthIndex]}`;
    return `${t().months[monthIndex]} ${year}`;
  }

  function formatSelectedDate(year, monthIndex, day) {
    if (currentLocale === 'zh') return `${t().selected}：${year}年${monthIndex + 1}月${day}日`;
    return `${t().selected}: ${t().months[monthIndex]} ${day}, ${year}`;
  }
  
  function setStatus(msg, type) {
    statusEl.textContent = msg || '';
    statusEl.classList.remove('good', 'bad');
    if (type) statusEl.classList.add(type);
  }
  
  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }
  
  function computeWeekday(y, mIndex, d) {
    return new Date(y, mIndex, d).getDay();
  }
  
  function updateTargetUI() {
    targetTextEl.innerHTML = `
      <span class="target-icon" aria-hidden="true"></span>
      <span class="target-date">${formatDate(target.year, target.monthIndex, target.day, target.weekdayIndex)}</span>
    `;
  }

  function dateKey(year, monthIndex, day) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function updateBoardLabels() {
    boardCells.forEach((cell) => {
      if (cell.id.startsWith('M')) {
        const idx = Number(cell.id.slice(1));
        cell.label = t().months[idx];
        cell.element.textContent = cell.label;
        return;
      }
      if (cell.id.startsWith('W')) {
        const idx = Number(cell.id.slice(1));
        cell.label = t().weekdays[idx];
        cell.element.textContent = cell.label;
      }
    });
  }

  function updateStaticTexts() {
    document.documentElement.lang = t().htmlLang;
    document.title = t().pageTitle;
    document.querySelector('#title-block h1').textContent = t().title;
    if (calendarToggle) calendarToggle.textContent = t().calendar;
    if (onboardingEl) onboardingEl.textContent = t().onboarding;
    document.getElementById('new-game-btn').textContent = t().random;
    document.getElementById('today-btn').textContent = t().today;
    if (calRestoreBtn) calRestoreBtn.textContent = t().restore;
    if (calExportBtn) calExportBtn.textContent = t().export;
    const importLabel = document.querySelector('.cal-import');
    if (importLabel && calImportInput) {
      importLabel.textContent = `${t().import} `;
      importLabel.appendChild(calImportInput);
    }
    document.getElementById('clear-btn').textContent = t().clear;
    if (solveBtn) solveBtn.textContent = t().solve;
    if (solveBtn) solveBtn.style.display = IS_DEV_ENV ? '' : 'none';
    if (showAnswerConfirmTextEl) showAnswerConfirmTextEl.textContent = t().showAnswerConfirm;
    if (showAnswerConfirmNoteEl) showAnswerConfirmNoteEl.textContent = t().showAnswerNote;
    if (showAnswerConfirmOkBtn) showAnswerConfirmOkBtn.textContent = t().confirm;
    if (showAnswerConfirmCancelBtn) showAnswerConfirmCancelBtn.textContent = t().cancel;
    updateHintButtonUI();
    if (calPrevBtn) calPrevBtn.setAttribute('aria-label', t().prevMonth);
    if (calNextBtn) calNextBtn.setAttribute('aria-label', t().nextMonth);
    document.querySelectorAll('.style-swatch').forEach((btn) => {
      const style = btn.getAttribute('data-style');
      if (!style) return;
      btn.setAttribute('aria-label', t().colors[style] || style);
    });
    if (langToggle) {
      langToggle.textContent = '🌐';
      langToggle.setAttribute('title', t().langToggleTitle);
      langToggle.setAttribute('aria-label', t().langToggleTitle);
    }
  }

  function refreshSelectedDateLabel() {
    if (!selectedDate || !calMenuTitle) return;
    const [yy, mm, dd] = selectedDate.split('-').map(Number);
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return;
    calMenuTitle.textContent = formatSelectedDate(yy, mm - 1, dd);
  }

  function setLocale(locale, options = {}) {
    if (!isSupportedLocale(locale)) return;
    currentLocale = locale;
    updateStaticTexts();
    updateBoardLabels();
    updateTargetUI();
    refreshSelectedDateLabel();
    renderCalendar(calendarView.year, calendarView.monthIndex);
    if (options.persist !== false) {
      try {
        localStorage.setItem(LOCALE_KEY, currentLocale);
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  function animateBoardPulseAndConfetti() {
    const boardContainer = document.getElementById('board-container');
    if (!boardContainer) return;
    boardContainer.classList.remove('victory-pulse');
    void boardContainer.offsetWidth;
    boardContainer.classList.add('victory-pulse');
    window.setTimeout(() => boardContainer.classList.remove('victory-pulse'), 520);

    const layer = document.createElement('div');
    layer.className = 'victory-confetti-layer';
    const count = 34;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.left = `${4 + Math.random() * 92}%`;
      p.style.setProperty('--confetti-delay', `${Math.round(Math.random() * 220)}ms`);
      p.style.setProperty('--confetti-duration', `${920 + Math.round(Math.random() * 500)}ms`);
      p.style.setProperty('--confetti-drift', `${-34 + Math.round(Math.random() * 68)}px`);
      p.style.setProperty('--confetti-rotate', `${120 + Math.round(Math.random() * 280)}deg`);
      p.style.backgroundColor = `hsl(${Math.round(Math.random() * 360)} 88% 66%)`;
      layer.appendChild(p);
    }
    boardContainer.appendChild(layer);
    window.setTimeout(() => {
      if (layer.parentElement) layer.parentElement.removeChild(layer);
    }, 1900);
  }

  function animatePiecesCelebrate() {
    const active = pieces.filter(p => p.isOnBoard);
    active.forEach((piece, idx) => {
      piece.element.style.setProperty('--celebrate-delay', `${idx * 42}ms`);
      piece.element.classList.remove('piece-celebrate');
      void piece.element.offsetWidth;
      piece.element.classList.add('piece-celebrate');
      window.setTimeout(() => {
        piece.element.classList.remove('piece-celebrate');
        piece.element.style.removeProperty('--celebrate-delay');
      }, 980 + idx * 42);
    });
  }

  function animateTargetCellsBloom() {
    const targets = boardEl.querySelectorAll('.cell.hole-highlight');
    targets.forEach((el, idx) => {
      el.style.setProperty('--bloom-delay', `${idx * 70}ms`);
      el.classList.remove('target-bloom');
      void el.offsetWidth;
      el.classList.add('target-bloom');
      window.setTimeout(() => {
        el.classList.remove('target-bloom');
        el.style.removeProperty('--bloom-delay');
      }, 980 + idx * 70);
    });
  }

  function playVictoryEffects(key) {
    const now = Date.now();
    if (key === lastVictoryKey && now - lastVictoryAt < VICTORY_DEBOUNCE_MS) return;
    lastVictoryKey = key;
    lastVictoryAt = now;
    playVictorySound();
    animateBoardPulseAndConfetti();
    animatePiecesCelebrate();
    animateTargetCellsBloom();
  }

  function rotatePoint(point, times) {
    let x = point.x;
    let y = point.y;
    for (let i = 0; i < times; i++) {
      const nx = -y;
      const ny = x;
      x = nx;
      y = ny;
    }
    return { x, y };
  }

  function getBlocksForRotation(shape, rotation) {
    const rotated = shape.map(p => rotatePoint(p, rotation));
    let minX = Infinity;
    let minY = Infinity;
    for (const p of rotated) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
    }
    return rotated.map(p => ({ x: p.x - minX, y: p.y - minY }));
  }

  function getCellsFromPlacement(entry) {
    if (entry == null || entry.gx == null || entry.gy == null) return [];
    const piece = pieces.find(p => p.id === entry.id);
    if (!piece) return [];
    const blocks = getBlocksForRotation(piece.shape, entry.rotation || 0);
    return blocks.map(b => ({
      gx: entry.gx + b.x,
      gy: entry.gy + b.y
    }));
  }

  function updateHintButtonUI() {
    const hintBtn = document.getElementById('hint-btn');
    if (!hintBtn) return;
    if (hintUsedCount >= MAX_HINTS) {
      hintBtn.textContent = t().showAnswer;
      hintBtn.classList.add('show-answer');
      return;
    }
    hideShowAnswerConfirm();
    hintBtn.textContent = `${t().hint} (${MAX_HINTS - hintUsedCount})`;
    hintBtn.classList.remove('show-answer');
  }

  function showShowAnswerConfirm(solved) {
    pendingShowAnswerSolution = solved;
    if (!showAnswerConfirmEl) return;
    showAnswerConfirmEl.classList.remove('is-hidden');
  }

  function hideShowAnswerConfirm() {
    pendingShowAnswerSolution = null;
    if (!showAnswerConfirmEl) return;
    showAnswerConfirmEl.classList.add('is-hidden');
  }

  async function revealFullAnswer(solved, hintBtn) {
    await revealAnswerAnimated(solved);
    applySolution(solved.solution);
    checkVictory();
    setStatus(t().status.answerShown, 'good');
    hintBtn.disabled = false;
  }

  function resetHintState() {
    activeHintSolution = null;
    hintUsedCount = 0;
    hasConfirmedShowAnswer = false;
    hideShowAnswerConfirm();
    hintedPieceIds.clear();
    updateHintButtonUI();
  }

  function getCurrentDateHintSolution() {
    if (activeHintSolution) return activeHintSolution;
    const result = solvePuzzleDFS(pieces);
    if (!result) return null;
    activeHintSolution = result;
    return result;
  }

  function applyHintedPieces(preservePieceId = null) {
    if (!activeHintSolution) return false;
    const snapshot = captureSolution().map(s => ({ ...s }));
    const byId = new Map(snapshot.map(s => [s.id, s]));
    const solutionById = new Map(activeHintSolution.solution.map(s => [s.id, s]));

    for (const pid of hintedPieceIds) {
      if (pid === preservePieceId) continue;
      const solved = solutionById.get(pid);
      if (solved) byId.set(pid, { ...solved });
    }

    const hintedOccupied = new Set();
    for (const pid of hintedPieceIds) {
      const entry = byId.get(pid);
      const cells = getCellsFromPlacement(entry);
      for (const c of cells) {
        hintedOccupied.add(`${c.gx},${c.gy}`);
      }
    }

    byId.forEach((entry, pid) => {
      if (hintedPieceIds.has(pid) && pid !== preservePieceId) return;
      const cells = getCellsFromPlacement(entry);
      for (const c of cells) {
        if (hintedOccupied.has(`${c.gx},${c.gy}`)) {
          entry.gx = null;
          entry.gy = null;
          break;
        }
      }
    });

    applySolution(Array.from(byId.values()));
    return true;
  }

  async function revealAnswerAnimated(solved) {
    const pending = solved.solution.filter(s => !hintedPieceIds.has(s.id));
    if (!pending.length) return;

    for (const entry of pending) {
      hintedPieceIds.add(entry.id);
      applyHintedPieces(entry.id);
      if (typeof piecesApi.animatePieceToSolutionEntry === 'function') {
        await piecesApi.animatePieceToSolutionEntry(entry, { duration: 360, playSnapSound: true, snapLeadMs: 30 });
      } else {
        applyHintedPieces();
      }
    }
  }

  const STORAGE_KEY = 'calendar-puzzle-completions';
  const MARKS_KEY = 'calendar-puzzle-marks';
  const SOLUTIONS_KEY = 'calendar-puzzle-solutions';

  function loadCompletions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(k => {
          if (typeof k === 'string') completedDates.add(k);
        });
      }
    } catch (e) {
      // ignore invalid storage
    }
  }

  function saveCompletions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completedDates)));
    } catch (e) {
      // ignore storage errors
    }
  }

  function loadMarks() {
    try {
      const raw = localStorage.getItem(MARKS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
          if (v && typeof v === 'object') {
            dateMarks.set(k, { heart: !!v.heart, star: !!v.star });
          }
        });
      }
    } catch (e) {
      // ignore invalid storage
    }
  }

  function saveMarks() {
    try {
      const obj = {};
      dateMarks.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(MARKS_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore storage errors
    }
  }

  function loadSolutions() {
    try {
      const raw = localStorage.getItem(SOLUTIONS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
          if (Array.isArray(v)) solutions.set(k, v);
        });
      }
    } catch (e) {
      // ignore invalid storage
    }
  }

  function saveSolutions() {
    try {
      const obj = {};
      solutions.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(SOLUTIONS_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore storage errors
    }
  }

  function exportData() {
    const payload = {
      completions: Array.from(completedDates),
      marks: (() => {
        const obj = {};
        dateMarks.forEach((v, k) => { obj[k] = v; });
        return obj;
      })(),
      solutions: (() => {
        const obj = {};
        solutions.forEach((v, k) => { obj[k] = v; });
        return obj;
      })()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calendar-puzzle-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        completedDates.clear();
        dateMarks.clear();
        solutions.clear();

        if (Array.isArray(data.completions)) {
          data.completions.forEach(k => {
            if (typeof k === 'string') completedDates.add(k);
          });
        }
        if (data.marks && typeof data.marks === 'object') {
          Object.entries(data.marks).forEach(([k, v]) => {
            if (v && typeof v === 'object') {
              dateMarks.set(k, { heart: !!v.heart, star: !!v.star });
            }
          });
        }
        if (data.solutions && typeof data.solutions === 'object') {
          Object.entries(data.solutions).forEach(([k, v]) => {
            if (Array.isArray(v)) solutions.set(k, v);
          });
        }
        saveCompletions();
        saveMarks();
        saveSolutions();
        renderCalendar(calendarView.year, calendarView.monthIndex);
        setStatus(t().status.dataImported, 'good');
      }
    } catch (e) {
      setStatus(t().status.importFailed, 'bad');
    }
  }

  function renderCalendar(year, monthIndex) {
    if (!calendarGrid || !calendarTitle) return;
    calendarView = { year, monthIndex };
    calendarTitle.textContent = formatCalendarTitle(year, monthIndex);

    calendarGrid.innerHTML = '';
    const weekLabels = t().calendarWeekdays;
    weekLabels.forEach(w => {
      const el = document.createElement('div');
      el.className = 'cal-cell cal-week';
      el.textContent = w;
      calendarGrid.appendChild(el);
    });

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const maxDay = daysInMonth(year, monthIndex);
    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell cal-day';
      const dayNum = i - firstDay + 1;
      if (dayNum > 0 && dayNum <= maxDay) {
        cell.textContent = String(dayNum);
        cell.dataset.day = String(dayNum);
        const key = dateKey(year, monthIndex, dayNum);
        if (completedDates.has(key)) cell.classList.add('is-complete');
        if (dayNum === target.day && year === target.year && monthIndex === target.monthIndex) {
          cell.classList.add('is-target');
        }
        if (selectedDate === key) cell.classList.add('is-selected');
        const mark = dateMarks.get(key);
        if (mark) {
          if (mark.heart) {
            const m = document.createElement('span');
            m.className = 'cal-marker heart';
            m.textContent = '❤';
            cell.appendChild(m);
          }
          if (mark.star) {
            const m = document.createElement('span');
            m.className = 'cal-marker star';
            m.textContent = '★';
            cell.appendChild(m);
          }
        }
      } else {
        cell.classList.add('is-empty');
      }
      calendarGrid.appendChild(cell);
    }
  }
  
  function setTargetDate(year, monthIndex, day, weekdayIndex) {
    target.year        = year;
    target.monthIndex  = monthIndex;
    target.day         = day;
    target.weekdayIndex = weekdayIndex;
  
    updateTargetUI();
    markHolesForTarget(target);
    renderCalendar(target.year, target.monthIndex);
    layoutPiecesInitial(piecesContainer);
    resetHintState();
    setStatus('');
  }

  function setSelectedDate(year, monthIndex, day) {
    selectedDate = dateKey(year, monthIndex, day);
    if (calMenuTitle) {
      calMenuTitle.textContent = formatSelectedDate(year, monthIndex, day);
    }
    const mark = dateMarks.get(selectedDate) || { heart: false, star: false };
    document.querySelectorAll('.cal-toggle').forEach(el => el.classList.remove('is-active'));
    if (mark.heart) {
      document.querySelector('.cal-toggle[data-mark="heart"]')?.classList.add('is-active');
    }
    if (mark.star) {
      document.querySelector('.cal-toggle[data-mark="star"]')?.classList.add('is-active');
    }
    renderCalendar(calendarView.year, calendarView.monthIndex);
  }


  // custom date now selected from calendar
  
  function pickRandomDate() {
    const now        = new Date();
    const year       = now.getFullYear();
    const monthIndex = Math.floor(Math.random() * 12);
    const maxDay     = daysInMonth(year, monthIndex);
    const day        = 1 + Math.floor(Math.random() * maxDay);
    const weekdayIdx = computeWeekday(year, monthIndex, day);
    setTargetDate(year, monthIndex, day, weekdayIdx);
  }
  
  function useToday() {
    const now        = new Date();
    const year       = now.getFullYear();
    const monthIndex = now.getMonth();
    const day        = now.getDate();
    const weekdayIdx = now.getDay();
    setTargetDate(year, monthIndex, day, weekdayIdx);
  }
  
  function checkVictory() {
    const covered = new Map();
  
    // 先检查所有 piece 是否都合法在 board 上
    for (const piece of pieces) {
      if (!piece.isOnBoard || piece.gx == null || piece.gy == null) {
        setStatus(t().status.illegalPlacement, 'bad');
        return;
      }
    }
  
    // 再检查覆盖关系
    for (const piece of pieces) {
      const cells = getPieceCells(piece);
      for (const c of cells) {
        const key  = `${c.gx},${c.gy}`;
        const cell = boardCells.find(bc => bc.gx === c.gx && bc.gy === c.gy);
        if (!cell) {
          setStatus(t().status.unusableCell, 'bad');
          return;
        }
        if (
          cell.id === holeIds.monthId ||
          cell.id === holeIds.dayId ||
          cell.id === holeIds.weekdayId
        ) {
          setStatus(t().status.coverTarget, 'bad');
          return;
        }
        if (covered.has(cell.id)) {
          setStatus(t().status.overlap, 'bad');
          return;
        }
        covered.set(cell.id, piece.id);
      }
    }
  
    // 检查有没有漏盖的 cell
    for (const cell of boardCells) {
      if (
        cell.id === holeIds.monthId ||
        cell.id === holeIds.dayId ||
        cell.id === holeIds.weekdayId
      ) {
        if (covered.has(cell.id)) {
          setStatus(t().status.targetMustStayOpen, 'bad');
          return;
        }
      } else {
        if (!covered.has(cell.id)) {
          setStatus(t().status.notAllCovered, 'bad');
          return;
        }
      }
    }
  
    setStatus(t().status.perfect, 'good');
    const key = dateKey(target.year, target.monthIndex, target.day);
    completedDates.add(key);
    solutions.set(key, captureSolution());
    saveCompletions();
    saveSolutions();
    renderCalendar(calendarView.year, calendarView.monthIndex);
    playVictoryEffects(key);
  }

  function maybeAutoCheck() {
    const allOnBoard = pieces.every(p => p.isOnBoard && p.gx != null && p.gy != null);
    if (!allOnBoard) return;
    checkVictory();
  }

  window.onBoardStateChanged = () => {
    maybeAutoCheck();
  };

  function nextFrame() {
    return new Promise(resolve => {
      window.requestAnimationFrame(() => resolve());
    });
  }
  
  // ========= 初始化 =========
  
  initBoard(boardEl);
  setLocale(detectInitialLocale(), { persist: false });
  buildPieces(piecesContainer);
  const initialStyle = document.querySelector('.style-swatch.is-active')?.getAttribute('data-style') || 'blue';
  setPieceStyle(initialStyle);
  attachPieceEvents();
  loadCompletions();
  loadMarks();
  loadSolutions();
  useToday(); // default to today
  renderCalendar(target.year, target.monthIndex);
  layoutPiecesInitial(piecesContainer);
  
  // 按钮事件
  document.getElementById('new-game-btn').addEventListener('click', pickRandomDate);
  document.getElementById('today-btn').addEventListener('click', useToday);
  const checkBtn = document.getElementById('check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', checkVictory);
  }
  document.getElementById('clear-btn').addEventListener('click', () => {
    layoutPiecesInitial(piecesContainer);
    setStatus('');
  });
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', async () => {
      hintBtn.disabled = true;
      const solved = getCurrentDateHintSolution();
      if (!solved) {
        setStatus(t().status.noHintSolution, 'bad');
        hintBtn.disabled = false;
        return;
      }

      if (hintUsedCount >= MAX_HINTS) {
        if (!hasConfirmedShowAnswer) {
          showShowAnswerConfirm(solved);
          hintBtn.disabled = false;
          return;
        }
        await revealFullAnswer(solved, hintBtn);
        return;
      }

      const remaining = solved.solution.filter(s => !hintedPieceIds.has(s.id));
      if (remaining.length === 0) {
        hintUsedCount = MAX_HINTS;
        updateHintButtonUI();
        setStatus(t().status.noMoreHints, 'good');
        hintBtn.disabled = false;
        return;
      }

      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      hintedPieceIds.add(pick.id);
      hintUsedCount += 1;
      applyHintedPieces(pick.id);
      if (typeof piecesApi.animatePieceToSolutionEntry === 'function') {
        await piecesApi.animatePieceToSolutionEntry(pick, { duration: 340, playSnapSound: true, snapLeadMs: 28 });
      } else {
        applyHintedPieces();
      }
      updateHintButtonUI();

      if (hintUsedCount >= MAX_HINTS) {
        setStatus(t().status.hintsUsedUp, 'good');
      } else {
        setStatus(t().status.hintProgress(hintUsedCount, MAX_HINTS), 'good');
      }
      hintBtn.disabled = false;
    });
  }
  if (solveBtn) {
    solveBtn.addEventListener('click', async () => {
      if (!IS_DEV_ENV) return;
      solveBtn.disabled = true;
      setStatus(t().status.solving, 'good');
      await nextFrame();

      const currentDateKey = dateKey(target.year, target.monthIndex, target.day);
      const shownKeys = shownSolveKeysByDate.get(currentDateKey) || new Set();
      shownSolveKeysByDate.set(currentDateKey, shownKeys);

      const startedAt = performance.now();
      let result = solvePuzzleDFS(pieces, { excludeSolutionKeys: shownKeys });
      let recycled = false;
      if (!result && shownKeys.size > 0) {
        shownKeys.clear();
        recycled = true;
        result = solvePuzzleDFS(pieces, { excludeSolutionKeys: shownKeys });
      }
      const elapsedMs = Math.round(performance.now() - startedAt);

      if (!result) {
        setStatus(t().status.noSolution(elapsedMs), 'bad');
        solveBtn.disabled = false;
        return;
      }

      shownKeys.add(result.key);
      applySolution(result.solution);
      checkVictory();
      if (recycled) {
        setStatus(t().status.solvedRecycled(elapsedMs), 'good');
      } else {
        setStatus(t().status.solvedNew(elapsedMs), 'good');
      }
      solveBtn.disabled = false;
    });
  }

  if (showAnswerConfirmOkBtn) {
    showAnswerConfirmOkBtn.addEventListener('click', async () => {
      const hintBtn = document.getElementById('hint-btn');
      if (!hintBtn || !pendingShowAnswerSolution) return;
      hasConfirmedShowAnswer = true;
      const solved = pendingShowAnswerSolution;
      hideShowAnswerConfirm();
      hintBtn.disabled = true;
      await revealFullAnswer(solved, hintBtn);
    });
  }

  if (showAnswerConfirmCancelBtn) {
    showAnswerConfirmCancelBtn.addEventListener('click', () => {
      hasConfirmedShowAnswer = false;
      hideShowAnswerConfirm();
    });
  }

  if (calendarSection && calendarToggle) {
    calendarToggle.addEventListener('click', () => {
      const isCollapsed = calendarSection.classList.toggle('is-collapsed');
      calendarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      const next = currentLocale === 'zh' ? 'en' : 'zh';
      setLocale(next, { persist: true });
    });
  }

  document.getElementById('piece-style').addEventListener('click', (e) => {
    const btn = e.target.closest('.style-swatch');
    if (!btn) return;
    const style = btn.getAttribute('data-style');
    if (!style) return;
    document.querySelectorAll('.style-swatch').forEach(el => el.classList.remove('is-active'));
    btn.classList.add('is-active');
    setPieceStyle(style);
  });

  if (calPrevBtn && calNextBtn) {
    calPrevBtn.addEventListener('click', () => {
      let y = calendarView.year;
      let m = calendarView.monthIndex - 1;
      if (m < 0) { m = 11; y -= 1; }
      renderCalendar(y, m);
    });
    calNextBtn.addEventListener('click', () => {
      let y = calendarView.year;
      let m = calendarView.monthIndex + 1;
      if (m > 11) { m = 0; y += 1; }
      renderCalendar(y, m);
    });
  }

  if (calendarGrid) {
    calendarGrid.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-day');
      if (!cell || cell.classList.contains('is-empty')) return;
      const day = Number(cell.dataset.day);
      if (!Number.isFinite(day)) return;
      const year = calendarView.year;
      const monthIndex = calendarView.monthIndex;
      const weekdayIdx = computeWeekday(year, monthIndex, day);
      setTargetDate(year, monthIndex, day, weekdayIdx);
      setSelectedDate(year, monthIndex, day);
    });
  }

  document.querySelectorAll('#calendar-menu .cal-action[data-mark]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!selectedDate) return;
      const mark = btn.getAttribute('data-mark');
      const current = dateMarks.get(selectedDate) || { heart: false, star: false };
      if (mark === 'heart') current.heart = !current.heart;
      if (mark === 'star') current.star = !current.star;
      dateMarks.set(selectedDate, current);
      saveMarks();
      renderCalendar(calendarView.year, calendarView.monthIndex);
      document.querySelectorAll('.cal-toggle').forEach(el => el.classList.remove('is-active'));
      if (current.heart) {
        document.querySelector('.cal-toggle[data-mark="heart"]')?.classList.add('is-active');
      }
      if (current.star) {
        document.querySelector('.cal-toggle[data-mark="star"]')?.classList.add('is-active');
      }
    });
  });

  if (calRestoreBtn) {
    calRestoreBtn.addEventListener('click', () => {
      if (!selectedDate) return;
      const sol = solutions.get(selectedDate);
      if (!sol) {
        setStatus(t().status.noSavedSolution, 'bad');
        return;
      }
      const parts = selectedDate.split('-');
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const weekdayIdx = computeWeekday(year, monthIndex, day);
      setTargetDate(year, monthIndex, day, weekdayIdx);
      applySolution(sol);
      setStatus(t().status.solutionRestored, 'good');
    });
  }

  if (calExportBtn) {
    calExportBtn.addEventListener('click', exportData);
  }
  if (calImportInput) {
    calImportInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      importData(file);
      e.target.value = '';
    });
  }
  
