// main.js
import {
    months,
    weekdays,
    boardCells,
    holeIds,
    initBoard,
    updateYearLabel,
    markHolesForTarget
  } from './board.js';
  
  import {
    pieces,
    buildPieces,
    layoutPiecesInitial,
    attachPieceEvents,
    getPieceCells
  } from './pieces.js';
  
  const boardEl         = document.getElementById('board');
  const yearLabelEl     = document.getElementById('year-label');
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
    updateYearLabel(target.year);
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
  
  initBoard(boardEl, yearLabelEl);
  buildPieces(piecesContainer);
  attachPieceEvents();
  pickRandomDate(); // 会调用 setTargetDate → layoutPiecesInitial
  
  // 按钮事件
  document.getElementById('new-game-btn').addEventListener('click', pickRandomDate);
  document.getElementById('today-btn').addEventListener('click', useToday);
  document.getElementById('check-btn').addEventListener('click', checkVictory);
  document.getElementById('reset-pieces-btn').addEventListener('click', () => {
    layoutPiecesInitial(piecesContainer);
    setStatus('');
  });
  