// pieces.js
import {
    cellSize,
    cellByGrid,
    holeIds,
    showGhostCells,
    clearGhost,
    getBoardRect
  } from './board.js';
  
export const pieces = [];

const pieceColors = [
  '239 111 108',
  '243 156 77',
  '242 201 76',
  '141 204 107',
  '82 193 169',
  '90 165 255',
  '112 126 255',
  '158 120 235',
  '233 125 195',
  '205 145 108'
];
  
  // ========= 1. 形状与旋转 =========
  
  // 原始形状，坐标单位 = cell
  const shapeDefs = [
    // 1) 0 1 1 / 1 1 0
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    // 2) 1 1 1 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
    // 3) 1 1 1 / 0 0 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }],
    // 4) 1 / 1 1 / 1 1
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    // 5) 1 1 0 0 / 0 1 1 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    // 6) 1 1 0 / 0 1 0 / 0 1 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    // 7) 1 0 1 / 1 1 1
    [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    // 8) 1 1 1 / 0 0 1 / 0 0 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    // 9) 1 1 1 / 0 1 0 / 0 1 0
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    // 10) 1 1 1 1 / 0 0 0 1
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }]
  ];
  
  function rotatePoint(p, times) {
    let x = p.x;
    let y = p.y;
    for (let i = 0; i < times; i++) {
      const nx = -y;
      const ny =  x;
      x = nx;
      y = ny;
    }
    return { x, y };
  }
  
  /**
   * 给定 shape + rotation，返回：
   *  - blocks: 所有块旋转后再平移，使最小 x,y = 0
   *  - width, height: 包围盒尺寸（单位：cell）
   */
  function getRotatedLayout(shape, rotation) {
    const rotated = shape.map(p => rotatePoint(p, rotation));
  
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of rotated) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  
    const normalized = rotated.map(p => ({
      x: p.x - minX,
      y: p.y - minY
    }));
  
    const width  = maxX - minX + 1;
    const height = maxY - minY + 1;
  
    return { blocks: normalized, width, height };
  }
  
  // ========= 2. DOM 构建 =========
  
  export function buildPieces(piecesContainer) {
    piecesContainer.innerHTML = '';
    pieces.length = 0;
  
    shapeDefs.forEach((shape, index) => {
      const pieceEl = document.createElement('div');
      pieceEl.className = 'piece';
      pieceEl.dataset.id = String(index);
      pieceEl.style.setProperty('--piece-rgb', pieceColors[index % pieceColors.length]);
      pieceEl.style.position = 'absolute';
      pieceEl.style.left = '0px';
      pieceEl.style.top  = '0px';
  
      const blockEls = [];
      shape.forEach(() => {
        const b = document.createElement('div');
        b.className = 'piece-block';
        pieceEl.appendChild(b);
        blockEls.push(b);
      });
  
      const rotateBtn = document.createElement('div');
      rotateBtn.className = 'rotate-btn';
      rotateBtn.textContent = '⟳';
      pieceEl.appendChild(rotateBtn);
  
      piecesContainer.appendChild(pieceEl);
  
      const piece = {
        id: index,
        shape,
        rotation: 0,
        element: pieceEl,
        blockEls,
        rotateBtn,
        left: 0,
        top: 0,
        gx: null,
        gy: null,
        isOnBoard: false,
        lastValid: null,
        rotatedBlocks: [],
        widthCells: 0,
        heightCells: 0
      };
  
      layoutPieceBlocks(piece);
      pieces.push(piece);
    });
  }
  
  /**
   * 根据 piece.rotation 对内部 block 重排：
   * - 计算旋转后的 normalized 坐标
   * - 更新 piece.element 的 width/height
   * - 更新块的 left/top
   */
  function layoutPieceBlocks(piece) {
    const { blocks, width, height } = getRotatedLayout(piece.shape, piece.rotation);
    piece.rotatedBlocks = blocks;
    piece.widthCells = width;
    piece.heightCells = height;
  
    const el = piece.element;
    el.style.width  = (width * cellSize) + 'px';
    el.style.height = (height * cellSize) + 'px';
  
    blocks.forEach((b, i) => {
      const blockEl = piece.blockEls[i];
      blockEl.style.left = (b.x * cellSize) + 'px';
      blockEl.style.top  = (b.y * cellSize) + 'px';
    });
  
    // 旋转只通过 block 重排体现，不再用 transform: rotate
    el.style.transform = 'none';
  }
  
  // ========= 3. 对外：初始排布 & cell 列表 =========
  
export function layoutPiecesInitial(piecesContainer) {
  const rect = piecesContainer.getBoundingClientRect();
  const maxWidth = rect.width || 420;
  
    let cursorX = 10;
    let cursorY = 10;
    let rowHeight = 0;
    const gapX = 10;
    const gapY = 10;
  
  pieces.forEach(piece => {
      piece.rotation = 0;
      piece.gx = null;
      piece.gy = null;
      piece.isOnBoard = false;
      piece.lastValid = null;
      piece.element.classList.remove('selected', 'on-board');
  
      layoutPieceBlocks(piece);
  
      const widthPx  = piece.widthCells  * cellSize;
      const heightPx = piece.heightCells * cellSize;
  
      if (cursorX + widthPx > maxWidth - 10) {
        cursorX = 10;
        cursorY += rowHeight + gapY;
        rowHeight = 0;
      }
  
      piece.left = cursorX;
      piece.top  = cursorY;
      piece.element.style.left = piece.left + 'px';
      piece.element.style.top  = piece.top  + 'px';
  
      cursorX += widthPx + gapX;
    rowHeight = Math.max(rowHeight, heightPx);
  });

  const neededHeight = cursorY + rowHeight + 10;
  const finalHeight = Math.max(340, neededHeight);
  piecesContainer.style.height = finalHeight + 'px';
  piecesContainer.style.minHeight = finalHeight + 'px';

  clearGhost();
  lastGhostTarget = null;
}
  
  /**
   * 返回 piece 当前覆盖的 board cell 列表（逻辑坐标）
   */
  export function getPieceCells(piece) {
    if (piece.gx == null || piece.gy == null) return [];
    return piece.rotatedBlocks.map(b => ({
      gx: piece.gx + b.x,
      gy: piece.gy + b.y
    }));
  }
  
  // ========= 4. 合法性检查 =========
  
  function isPlacementValid(piece, gx, gy, rotation) {
    const { blocks } = getRotatedLayout(piece.shape, rotation);
  
    // 收集其他 piece 已占用的格子
    const occupied = new Map();
    for (const p of pieces) {
      if (p === piece) continue;
      if (!p.isOnBoard || p.gx == null || p.gy == null) continue;
      const cells = getPieceCells(p);
      for (const c of cells) {
        occupied.set(`${c.gx},${c.gy}`, p.id);
      }
    }
  
    // 检查当前 piece 的每个块
    for (const b of blocks) {
      const cx = gx + b.x;
      const cy = gy + b.y;
      const key = `${cx},${cy}`;
      const cell = cellByGrid.get(key);
      if (!cell) return false; // 出界
      if (occupied.has(key)) return false; // 和别人重叠
      if (
        cell.id === holeIds.monthId ||
        cell.id === holeIds.dayId ||
        cell.id === holeIds.weekdayId
      ) {
        return false;
      }
    }
  
    return true;
  }
  
  // ========= 5. grid 吸附（基于 left/top）=========
  
let lastGhostTarget = null; // kept for preview lifecycle reset
  
  // 从 piece 的 left/top 推出当前对齐棋盘的格子
function computeSnapGrid(piece) {
  const el = piece.element;
  const parentOrigin = getOffsetParentOrigin(el);
  const boardRect = getBoardRect();

  const boardBaseX = boardRect.left - parentOrigin.x;
  const boardBaseY = boardRect.top  - parentOrigin.y;

  const localX = piece.left - boardBaseX;
  const localY = piece.top  - boardBaseY;
  
    const gx = Math.round(localX / cellSize);
    const gy = Math.round(localY / cellSize);
  
  const anchorScreenX = parentOrigin.x + piece.left;
  const anchorScreenY = parentOrigin.y + piece.top;
    const margin = cellSize;
  
    const inside =
      anchorScreenX >= boardRect.left - margin &&
      anchorScreenX <= boardRect.right + margin &&
      anchorScreenY >= boardRect.top  - margin &&
      anchorScreenY <= boardRect.bottom + margin;
  
    return { gx, gy, inside };
  }
  
  // 拖动时 ghost 预览
  function updateGhostFromPiece(piece) {
    if (!piece) {
      clearGhost();
      lastGhostTarget = null;
      return;
    }
  
    const { gx, gy, inside } = computeSnapGrid(piece);
    if (!inside) {
      clearGhost();
      lastGhostTarget = null;
      return;
    }
  
    if (isPlacementValid(piece, gx, gy, piece.rotation)) {
      const { blocks } = getRotatedLayout(piece.shape, piece.rotation);
      // ghost 以 (gx,gy) 为 anchor，blocks 为局部坐标
      showGhostCells(blocks, { gx, gy });
      lastGhostTarget = null;
    } else {
      clearGhost();
      lastGhostTarget = null;
    }
  }
  
  // 真正吸附
  function snapPieceToBoard(piece) {
    const { gx, gy, inside } = computeSnapGrid(piece);
  
    if (!inside) {
      piece.gx = null;
      piece.gy = null;
      piece.isOnBoard = false;
      piece.element.classList.remove('on-board');
      clearGhost();
      lastGhostTarget = null;
      return;
    }
  
    if (isPlacementValid(piece, gx, gy, piece.rotation)) {
      piece.gx = gx;
      piece.gy = gy;
      piece.isOnBoard = true;
      piece.lastValid = { gx, gy, rotation: piece.rotation };
      piece.element.classList.add('on-board');
      applyPieceTransform(piece);
    } else {
      // 不合法：如果有 lastValid，则回到上一次合法位置
      if (piece.lastValid) {
        const lv = piece.lastValid;
        piece.gx = lv.gx;
        piece.gy = lv.gy;
        piece.rotation = lv.rotation;
        piece.isOnBoard = true;
        piece.element.classList.add('on-board');
        layoutPieceBlocks(piece);
        applyPieceTransform(piece);
      } else {
        piece.gx = null;
        piece.gy = null;
        piece.isOnBoard = false;
        piece.element.classList.remove('on-board');
      }
    }
  
    clearGhost();
    lastGhostTarget = null;
  }
  
  /**
   * 把逻辑 grid 坐标 (gx,gy) 映射为 left/top
   */
function applyPieceTransform(piece) {
  if (piece.gx == null || piece.gy == null) return;
  const el = piece.element;
  const parentOrigin = getOffsetParentOrigin(el);
  const boardRect = getBoardRect();

  const boardBaseX = boardRect.left - parentOrigin.x;
  const boardBaseY = boardRect.top  - parentOrigin.y;
  
  const left = boardBaseX + piece.gx * cellSize;
  const top  = boardBaseY + piece.gy * cellSize;

  const alignedLeft = Math.round(left);
  const alignedTop  = Math.round(top);

  piece.left = alignedLeft;
  piece.top  = alignedTop;
  el.style.left = alignedLeft + 'px';
  el.style.top  = alignedTop  + 'px';
}
  
  // ========= 6. 拖拽 =========
  
let activePiece = null;
let dragOffset  = { x: 0, y: 0 };

function getOffsetParentOrigin(el) {
  const parent = el.offsetParent;
  const rect = parent.getBoundingClientRect();
  // Absolute positioned left/top are resolved from the containing block padding box.
  return {
    x: rect.left + parent.clientLeft,
    y: rect.top + parent.clientTop
  };
}

function onPointerDownPiece(ev, piece) {
    const isTouch = ev.type.startsWith('touch');
    const point = isTouch ? ev.touches[0] : ev;
  
    // 点击旋转按钮
    if (point.target.classList.contains('rotate-btn')) {
      rotatePiece(piece);
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
  
    activePiece = piece;
    pieces.forEach(p => p.element.classList.remove('selected'));
    piece.element.classList.add('selected');
  
    const el = piece.element;
    const parentOrigin = getOffsetParentOrigin(el);
    const originX = parentOrigin.x + piece.left;
    const originY = parentOrigin.y + piece.top;
  
    dragOffset.x = point.clientX - originX;
    dragOffset.y = point.clientY - originY;
  
    window.addEventListener(isTouch ? 'touchmove' : 'mousemove', onPointerMove, { passive: false });
    window.addEventListener(isTouch ? 'touchend'  : 'mouseup',   onPointerUp);
  
    ev.preventDefault();
    updateGhostFromPiece(piece);
  }
  
function onPointerMove(ev) {
    if (!activePiece) return;
    const isTouch = ev.type.startsWith('touch');
    const point = isTouch ? ev.touches[0] : ev;
  
    const el = activePiece.element;
    const parentOrigin = getOffsetParentOrigin(el);
    const left = point.clientX - parentOrigin.x - dragOffset.x;
    const top  = point.clientY - parentOrigin.y - dragOffset.y;
  
    activePiece.left = left;
    activePiece.top  = top;
    el.style.left = left + 'px';
    el.style.top  = top  + 'px';
  
    updateGhostFromPiece(activePiece);
    ev.preventDefault();
  }
  
  function onPointerUp(ev) {
    if (!activePiece) return;
    snapPieceToBoard(activePiece);
  
    const isTouch = ev.type.startsWith('touch');
    window.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onPointerMove);
    window.removeEventListener(isTouch ? 'touchend'  : 'mouseup',   onPointerUp);
    activePiece = null;
  }
  
  // ========= 7. 旋转 =========
  
  function rotatePiece(piece) {
    const newRot = (piece.rotation + 1) % 4;
  
    if (piece.isOnBoard && piece.gx != null && piece.gy != null) {
      if (isPlacementValid(piece, piece.gx, piece.gy, newRot)) {
        piece.rotation = newRot;
        layoutPieceBlocks(piece);
        piece.lastValid = { gx: piece.gx, gy: piece.gy, rotation: newRot };
        applyPieceTransform(piece);
      } else {
        // 不合法就不转（未来可以做“绕中心微调”）
        return;
      }
    } else {
      // 不在 board 上，仅修改内部布局，不动 left/top
      piece.rotation = newRot;
      layoutPieceBlocks(piece);
    }
  
    clearGhost();
    lastGhostTarget = null;
  }
  
  // ========= 8. 事件绑定入口 =========
  
  export function attachPieceEvents() {
    pieces.forEach(piece => {
      const el = piece.element;
      el.addEventListener('mousedown', ev => onPointerDownPiece(ev, piece));
      el.addEventListener('touchstart', ev => onPointerDownPiece(ev, piece), { passive: false });
    });
  
    window.addEventListener('keydown', ev => {
      if (ev.key === 'r' || ev.key === 'R') {
        if (activePiece) {
          rotatePiece(activePiece);
          ev.preventDefault();
        }
      }
    });
  }
  
