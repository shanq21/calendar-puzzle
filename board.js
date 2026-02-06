// board.js

export const cellSize = 52;

export const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const weekdays = ['Sun','Mon','Tues','Wed','Thur','Fri','Sat'];

export const boardCells = [];
export const cellById   = new Map();
export const cellByGrid = new Map();
export const holeIds    = { monthId: null, dayId: null, weekdayId: null };

let boardElement      = null;
let ghostLayer        = null;

function gridKey(gx, gy) {
  return `${gx},${gy}`;
}

export function initBoard(boardEl) {
  boardElement = boardEl;
  buildBoard();
}

function buildBoard() {
  boardElement.innerHTML = '';
  boardCells.length = 0;
  cellById.clear();
  cellByGrid.clear();

  // months rows
  for (let gx = 0; gx < 6; gx++) {
    createCell('M' + gx,      'month', months[gx],      gx, 0);
  }
  for (let gx = 0; gx < 6; gx++) {
    createCell('M' + (6 + gx),'month', months[6 + gx],  gx, 1);
  }

  // days 1..28
  let day = 1;
  for (let gy = 2; gy <= 5; gy++) {
    for (let gx = 0; gx < 7; gx++) {
      createCell('D' + day, 'day', String(day), gx, gy);
      day++;
    }
  }

  // 29,30,31 + weekday row 1
  createCell('D29', 'day', '29',   0, 6);
  createCell('D30', 'day', '30',   1, 6);
  createCell('D31', 'day', '31',   2, 6);
  createCell('W0',  'weekday', 'Sun',  3, 6);
  createCell('W1',  'weekday', 'Mon',  4, 6);
  createCell('W2',  'weekday', 'Tues', 5, 6);
  createCell('W3',  'weekday', 'Wed',  6, 6);

  // weekday row 2
  createCell('W4', 'weekday', 'Thur', 4, 7);
  createCell('W5', 'weekday', 'Fri',  5, 7);
  createCell('W6', 'weekday', 'Sat',  6, 7);

  const maxGx = 6;
  const maxGy = 7;
  boardElement.style.width  = ((maxGx + 1) * cellSize) + 'px';
  boardElement.style.height = ((maxGy + 1) * cellSize) + 'px';

  // ghost 图层
  ghostLayer = document.createElement('div');
  ghostLayer.id = 'ghost-layer';
  ghostLayer.style.position = 'absolute';
  ghostLayer.style.left = '0';
  ghostLayer.style.top  = '0';
  ghostLayer.style.right = '0';
  ghostLayer.style.bottom = '0';
  ghostLayer.style.pointerEvents = 'none';
  boardElement.appendChild(ghostLayer);
}

function createCell(id, type, label, gx, gy) {
  const cell = document.createElement('div');
  cell.className = `cell ${type}`;
  cell.textContent = label;
  cell.style.left = (gx * cellSize) + 'px';
  cell.style.top  = (gy * cellSize) + 'px';
  boardElement.appendChild(cell);

  const info = { id, type, label, gx, gy, element: cell };
  boardCells.push(info);
  cellById.set(id, info);
  cellByGrid.set(gridKey(gx, gy), info);
}

export function markHolesForTarget(target) {
  // target: {year, monthIndex, day, weekdayIndex}
  boardCells.forEach(c => c.element.classList.remove('hole-highlight'));

  const monthId = 'M' + target.monthIndex;
  const dayId   = 'D' + target.day;
  const wId     = 'W' + target.weekdayIndex;

  const mCell = cellById.get(monthId);
  const dCell = cellById.get(dayId);
  const wCell = cellById.get(wId);
  if (mCell) mCell.element.classList.add('hole-highlight');
  if (dCell) dCell.element.classList.add('hole-highlight');
  if (wCell) wCell.element.classList.add('hole-highlight');

  holeIds.monthId   = monthId;
  holeIds.dayId     = dayId;
  holeIds.weekdayId = wId;
}

export function clearGhost() {
  if (ghostLayer) ghostLayer.innerHTML = '';
}

/**
 * 显示 ghost 形状：
 *  - blocks: 形状在自身局部坐标的格子 [{x,y}, ...]（以包围盒左上角为 0,0）
 *  - anchor: {gx, gy}，piece 包围盒左上角在棋盘上的格子坐标
 *
 * 这样 ghost 的逻辑坐标系和 piece 完全一致，方便对齐。
 */
export function showGhostCells(blocks, anchor) {
  if (!ghostLayer) return;
  ghostLayer.innerHTML = '';

  if (!anchor || !blocks || !blocks.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'ghost-piece';
  wrapper.style.position = 'absolute';
  wrapper.style.left = (anchor.gx * cellSize) + 'px';
  wrapper.style.top  = (anchor.gy * cellSize) + 'px';
  ghostLayer.appendChild(wrapper);

  for (const b of blocks) {
    const gb = document.createElement('div');
    gb.className = 'ghost-block';
    gb.style.left = (b.x * cellSize) + 'px';
    gb.style.top  = (b.y * cellSize) + 'px';
    wrapper.appendChild(gb);
  }
}

export function screenToBoardPos(x, y) {
  const rect = boardElement.getBoundingClientRect();
  const gx = Math.round((x - rect.left - cellSize / 2) / cellSize);
  const gy = Math.round((y - rect.top  - cellSize / 2) / cellSize);
  return { gx, gy };
}

export function getBoardRect() {
  return boardElement.getBoundingClientRect();
}
