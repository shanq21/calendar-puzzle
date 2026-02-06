// main.js
import {
    months,
    weekdays,
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
  
  const boardEl         = document.getElementById('board');
  const piecesContainerLeft = document.getElementById('pieces-container-left');
  const piecesContainerRight = document.getElementById('pieces-container-right');
  const statusEl        = document.getElementById('status');
  const targetTextEl    = document.getElementById('target-text');
  const calendarTitle   = document.getElementById('calendar-title');
  const calendarGrid    = document.getElementById('calendar-grid');
  const calPrevBtn      = document.getElementById('cal-prev');
  const calNextBtn      = document.getElementById('cal-next');
  const calMenuTitle    = document.getElementById('calendar-menu-title');
  const calRestoreBtn   = document.getElementById('cal-restore');
  const calExportBtn    = document.getElementById('cal-export');
  const calImportInput  = document.getElementById('cal-import-input');
  
  // 默认目标日期（可以随时被随机 / today 覆盖）
  const target = { year: 2026, monthIndex: 1, day: 3, weekdayIndex: 2 };
  const completedDates = new Set();
  const dateMarks = new Map();
  const solutions = new Map();
  let selectedDate = null;
  let calendarView = { year: target.year, monthIndex: target.monthIndex };
  
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
      Target date:<br>
      <b>${weekdays[target.weekdayIndex]}, ${months[target.monthIndex]} ${target.day}, ${target.year}</b>
    `;
  }

  function dateKey(year, monthIndex, day) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
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
        setStatus('Data imported.', 'good');
      }
    } catch (e) {
      setStatus('Import failed. Invalid file.', 'bad');
    }
  }

  function renderCalendar(year, monthIndex) {
    if (!calendarGrid || !calendarTitle) return;
    calendarView = { year, monthIndex };
    calendarTitle.textContent = `${months[monthIndex]} ${year}`;

    calendarGrid.innerHTML = '';
    const weekLabels = ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'];
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
    layoutPiecesInitial(piecesContainerLeft, piecesContainerRight);
    setStatus('');
  }

  function setSelectedDate(year, monthIndex, day) {
    selectedDate = dateKey(year, monthIndex, day);
    if (calMenuTitle) {
      calMenuTitle.textContent = `Selected: ${months[monthIndex]} ${day}, ${year}`;
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
        setStatus('Some pieces are not legally placed on the board.', 'bad');
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
          setStatus('A piece is partially off the board or on an unusable cell.', 'bad');
          return;
        }
        if (
          cell.id === holeIds.monthId ||
          cell.id === holeIds.dayId ||
          cell.id === holeIds.weekdayId
        ) {
          setStatus('Pieces cannot cover the target month/day/weekday.', 'bad');
          return;
        }
        if (covered.has(cell.id)) {
          setStatus('Pieces overlap on some cells.', 'bad');
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
          setStatus('Target cells must remain uncovered.', 'bad');
          return;
        }
      } else {
        if (!covered.has(cell.id)) {
          setStatus('Not all cells are covered yet.', 'bad');
          return;
        }
      }
    }
  
    setStatus('Perfect! This configuration works for the target date 🎉', 'good');
    const key = dateKey(target.year, target.monthIndex, target.day);
    completedDates.add(key);
    solutions.set(key, captureSolution());
    saveCompletions();
    saveSolutions();
    renderCalendar(calendarView.year, calendarView.monthIndex);
  }

  function maybeAutoCheck() {
    const allOnBoard = pieces.every(p => p.isOnBoard && p.gx != null && p.gy != null);
    if (!allOnBoard) return;
    checkVictory();
  }

  window.onBoardStateChanged = () => {
    maybeAutoCheck();
  };
  
  // ========= 初始化 =========
  
  initBoard(boardEl);
  buildPieces(piecesContainerLeft);
  const initialStyle = document.querySelector('.style-swatch.is-active')?.getAttribute('data-style') || 'blue';
  setPieceStyle(initialStyle);
  attachPieceEvents();
  loadCompletions();
  loadMarks();
  loadSolutions();
  useToday(); // default to today
  renderCalendar(target.year, target.monthIndex);
  layoutPiecesInitial(piecesContainerLeft, piecesContainerRight);
  
  // 按钮事件
  document.getElementById('new-game-btn').addEventListener('click', pickRandomDate);
  document.getElementById('today-btn').addEventListener('click', useToday);
  document.getElementById('check-btn').addEventListener('click', checkVictory);
  document.getElementById('reset-pieces-btn').addEventListener('click', () => {
    layoutPiecesInitial(piecesContainerLeft, piecesContainerRight);
    setStatus('');
  });

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
    });
  });

  if (calRestoreBtn) {
    calRestoreBtn.addEventListener('click', () => {
      if (!selectedDate) return;
      const sol = solutions.get(selectedDate);
      if (!sol) {
        setStatus('No saved solution for this date.', 'bad');
        return;
      }
      const parts = selectedDate.split('-');
      const year = Number(parts[0]);
      const monthIndex = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const weekdayIdx = computeWeekday(year, monthIndex, day);
      setTargetDate(year, monthIndex, day, weekdayIdx);
      applySolution(sol);
      setStatus('Solution restored.', 'good');
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
  
