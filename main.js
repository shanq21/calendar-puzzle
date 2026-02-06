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
    setPieceStyle
  } from './pieces.js';
  
  const boardEl         = document.getElementById('board');
  const piecesContainer = document.getElementById('pieces-container');
  const statusEl        = document.getElementById('status');
  const targetTextEl    = document.getElementById('target-text');
  
  // 默认目标日期（可以随时被随机 / today 覆盖）
  const target = { year: 2026, monthIndex: 1, day: 3, weekdayIndex: 2 };
  
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
  
  function setTargetDate(year, monthIndex, day, weekdayIndex) {
    target.year        = year;
    target.monthIndex  = monthIndex;
    target.day         = day;
    target.weekdayIndex = weekdayIndex;
  
    updateTargetUI();
    markHolesForTarget(target);
    layoutPiecesInitial(piecesContainer);
    setStatus('');
  }

  function promptCustomDate() {
    const input = window.prompt('Enter date as YYYY-MM-DD (e.g., 2026-02-06)');
    if (!input) return;
    const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      setStatus('Invalid format. Use YYYY-MM-DD.', 'bad');
      return;
    }
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) {
      setStatus('Invalid date values.', 'bad');
      return;
    }
    if (monthIndex < 0 || monthIndex > 11) {
      setStatus('Month must be 01-12.', 'bad');
      return;
    }
    const maxDay = daysInMonth(year, monthIndex);
    if (day < 1 || day > maxDay) {
      setStatus(`Day must be 01-${String(maxDay).padStart(2, '0')}.`, 'bad');
      return;
    }
    const weekdayIdx = computeWeekday(year, monthIndex, day);
    setTargetDate(year, monthIndex, day, weekdayIdx);
  }
  
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
  }
  
  // ========= 初始化 =========
  
  initBoard(boardEl);
  buildPieces(piecesContainer);
  const initialStyle = document.querySelector('.style-swatch.is-active')?.getAttribute('data-style') || 'blue';
  setPieceStyle(initialStyle);
  attachPieceEvents();
  pickRandomDate(); // 会调用 setTargetDate → layoutPiecesInitial
  
  // 按钮事件
  document.getElementById('new-game-btn').addEventListener('click', pickRandomDate);
  document.getElementById('today-btn').addEventListener('click', useToday);
  document.getElementById('custom-date-btn').addEventListener('click', promptCustomDate);
  document.getElementById('check-btn').addEventListener('click', checkVictory);
  document.getElementById('reset-pieces-btn').addEventListener('click', () => {
    layoutPiecesInitial(piecesContainer);
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
  
