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
let zCounter = 30;

const STYLE_PRESETS = {
  blue:   { rgb: '150 210 255', alpha: 0.72 },
  green:  { rgb: '154 226 190', alpha: 0.72 },
  pink:   { rgb: '247 167 210', alpha: 0.72 },
  orange: { rgb: '247 188 132', alpha: 0.72 },
  purple: { rgb: '206 178 238', alpha: 0.72 },
  coffee: { rgb: '188 132 92', alpha: 0.72 },
  clear:  { rgb: '220 235 255', alpha: 0.45 }
};
let currentStyle = STYLE_PRESETS.blue;

  
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
      pieceEl.style.position = 'absolute';
      pieceEl.style.left = '0px';
      pieceEl.style.top  = '0px';

      const outlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      outlineSvg.classList.add('piece-outline');
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      const clipId = `piece-clip-${index}`;
      clipPath.setAttribute('id', clipId);
      const clipPathShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      clipPathShape.classList.add('piece-clip-path');
      clipPath.appendChild(clipPathShape);
      defs.appendChild(clipPath);

      outlineSvg.appendChild(defs);
      const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fillPath.classList.add('piece-fill-path');
      const strokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      strokePath.classList.add('piece-stroke-path');
      strokePath.setAttribute('clip-path', `url(#${clipId})`);
      outlineSvg.appendChild(fillPath);
      outlineSvg.appendChild(strokePath);
      pieceEl.appendChild(outlineSvg);

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
        outlineSvg,
        fillPath,
        strokePath,
        clipPathShape,
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
      updatePieceGradient(piece);
      piece.element.style.zIndex = String(zCounter++);
      pieces.push(piece);
    });
  }

export function setPieceStyle(styleName) {
  const preset = STYLE_PRESETS[styleName] || STYLE_PRESETS.blue;
  currentStyle = preset;
  pieces.forEach(piece => {
    piece.element.dataset.rgb = preset.rgb;
    piece.element.dataset.alpha = String(preset.alpha);
    updatePieceGradient(piece);
  });
}

export function captureSolution() {
  return pieces.map(p => ({
    id: p.id,
    gx: p.gx,
    gy: p.gy,
    rotation: p.rotation
  }));
}

export function applySolution(solution) {
  if (!Array.isArray(solution)) return false;
  const byId = new Map(solution.map(s => [s.id, s]));
  pieces.forEach(p => {
    const s = byId.get(p.id);
    if (!s) return;
    p.rotation = s.rotation;
    p.gx = s.gx;
    p.gy = s.gy;
    p.isOnBoard = p.gx != null && p.gy != null;
    p.element.classList.toggle('on-board', p.isOnBoard);
    layoutPieceBlocks(p);
    if (p.isOnBoard) applyPieceTransform(p);
    updatePieceGradient(p);
  });
  return true;
}

export function onBoardStateChanged() {
  if (typeof window !== 'undefined' && window.onBoardStateChanged) {
    window.onBoardStateChanged();
  }
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

    updatePieceOutline(piece);
    updatePieceGradient(piece);

    blocks.forEach((b, i) => {
      const blockEl = piece.blockEls[i];
      blockEl.style.left = (b.x * cellSize) + 'px';
      blockEl.style.top  = (b.y * cellSize) + 'px';
      blockEl.classList.remove('corner-tl', 'corner-tr', 'corner-bl', 'corner-br');
    });

    const blockSet = new Set(blocks.map(b => `${b.x},${b.y}`));
    blocks.forEach((b, i) => {
      const blockEl = piece.blockEls[i];
      const up = blockSet.has(`${b.x},${b.y - 1}`);
      const down = blockSet.has(`${b.x},${b.y + 1}`);
      const left = blockSet.has(`${b.x - 1},${b.y}`);
      const right = blockSet.has(`${b.x + 1},${b.y}`);

      if (!up && !left) blockEl.classList.add('corner-tl');
      if (!up && !right) blockEl.classList.add('corner-tr');
      if (!down && !left) blockEl.classList.add('corner-bl');
      if (!down && !right) blockEl.classList.add('corner-br');
    });
  
    // 旋转只通过 block 重排体现，不再用 transform: rotate
    el.style.transform = 'none';
  }

function updatePieceGradient(piece) {
  const rgbRaw = piece.element.dataset.rgb || currentStyle.rgb;
  const alphaRaw = piece.element.dataset.alpha || String(currentStyle.alpha);
  const [r, g, b] = rgbRaw.split(' ').map(n => parseInt(n, 10));
  if ([r, g, b].some(n => Number.isNaN(n))) return;
  const alpha = parseFloat(alphaRaw) || 0.86;

  function darken(f) {
    return `rgb(${Math.max(0, Math.round(r * f))} ${Math.max(0, Math.round(g * f))} ${Math.max(0, Math.round(b * f))})`;
  }

  const isDragging = piece.element.classList.contains('dragging');
  const isHover = piece.element.classList.contains('hovering');
  let fillAlpha = Math.max(0, alpha - 0.08);
  if (isHover) fillAlpha = Math.min(1, alpha + 0.02);
  if (isDragging) fillAlpha = Math.min(1, alpha + 0.12);

  const fillRgb = `rgb(${r} ${g} ${b})`;
  piece.fillPath.setAttribute('fill', fillRgb);
  piece.fillPath.setAttribute('fill-opacity', String(fillAlpha));
  piece.strokePath.setAttribute('stroke', darken(0.9));
  piece.strokePath.setAttribute('stroke-opacity', '0.6');
}

function updatePieceOutline(piece) {
  const outline = piece.outlineSvg;
  const fillPath = piece.fillPath;
  const strokePath = piece.strokePath;
  const clipPathShape = piece.clipPathShape;
  const widthPx = piece.widthCells * cellSize;
  const heightPx = piece.heightCells * cellSize;

  outline.setAttribute('width', String(widthPx));
  outline.setAttribute('height', String(heightPx));
  outline.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);

  const blocks = piece.rotatedBlocks;
  if (!blocks || !blocks.length) {
    fillPath.setAttribute('d', '');
    strokePath.setAttribute('d', '');
    clipPathShape.setAttribute('d', '');
    return;
  }

  const blockSet = new Set(blocks.map(b => `${b.x},${b.y}`));
  const edges = new Map();

  function addEdge(x1, y1, x2, y2) {
    const k = `${x1},${y1}`;
    const list = edges.get(k) || [];
    list.push({ x1, y1, x2, y2 });
    edges.set(k, list);
  }

  for (const b of blocks) {
    const x = b.x;
    const y = b.y;
    if (!blockSet.has(`${x},${y - 1}`)) {
      addEdge(x, y, x + 1, y);
    }
    if (!blockSet.has(`${x + 1},${y}`)) {
      addEdge(x + 1, y, x + 1, y + 1);
    }
    if (!blockSet.has(`${x},${y + 1}`)) {
      addEdge(x + 1, y + 1, x, y + 1);
    }
    if (!blockSet.has(`${x - 1},${y}`)) {
      addEdge(x, y + 1, x, y);
    }
  }

  const startKey = edges.keys().next().value;
  if (!startKey) {
    path.setAttribute('d', '');
    return;
  }

  const [sx, sy] = startKey.split(',').map(Number);
  let cx = sx;
  let cy = sy;
  const points = [{ x: cx, y: cy }];
  let guard = 0;

  while (guard++ < 5000) {
    const list = edges.get(`${cx},${cy}`);
    if (!list || list.length === 0) break;
    const edge = list.shift();
    cx = edge.x2;
    cy = edge.y2;
    points.push({ x: cx, y: cy });
    if (cx === sx && cy === sy) break;
  }

  if (points.length < 3) {
    path.setAttribute('d', '');
    return;
  }

  const d = points
    .map(p => ({ x: p.x * cellSize, y: p.y * cellSize }));

  const rBase = Math.min(12, Math.max(6, Math.round(cellSize * 0.24)));
  const n = d.length - 1; // last point == first
  let pathD = '';

  function normDir(a, b) {
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    return { x: dx, y: dy };
  }

  for (let i = 0; i < n; i++) {
    const prev = d[(i - 1 + n) % n];
    const curr = d[i];
    const next = d[(i + 1) % n];
    const v1 = normDir(prev, curr);
    const v2 = normDir(curr, next);

    const isCorner = v1.x !== v2.x || v1.y !== v2.y;
    if (!isCorner) {
      if (!pathD) {
        pathD = `M${curr.x} ${curr.y}`;
      } else {
        pathD += ` L${curr.x} ${curr.y}`;
      }
      continue;
    }

    const r = rBase;
    const p1 = { x: curr.x - v1.x * r, y: curr.y - v1.y * r };
    const p2 = { x: curr.x + v2.x * r, y: curr.y + v2.y * r };

    if (!pathD) {
      pathD = `M${p1.x} ${p1.y}`;
    } else {
      pathD += ` L${p1.x} ${p1.y}`;
    }

    const cross = v1.x * v2.y - v1.y * v2.x;
    const sweep = cross < 0 ? 0 : 1;
    pathD += ` A${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`;
  }

  pathD += ' Z';

  fillPath.setAttribute('d', pathD);
  strokePath.setAttribute('d', pathD);
  clipPathShape.setAttribute('d', pathD);
}
  
  // ========= 3. 对外：初始排布 & cell 列表 =========
  
export function layoutPiecesInitial(container) {
  const rect = container.getBoundingClientRect();
  const maxWidth = rect.width || 520;

  let cursorX = 10;
  let cursorY = 10;
  let rowHeight = 0;
  const gapX = 10;
  const gapY = 10;

  pieces.forEach(piece => {
    if (piece.element.parentElement !== container) {
      container.appendChild(piece.element);
    }
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
  const finalHeight = Math.max(360, neededHeight);
  container.style.height = finalHeight + 'px';
  container.style.minHeight = finalHeight + 'px';

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
      updatePieceGradient(piece);
      onBoardStateChanged();
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
      updatePieceGradient(piece);
      onBoardStateChanged();
    } else {
      // 不合法：保持当前位置，不回弹
      piece.gx = null;
      piece.gy = null;
      piece.isOnBoard = false;
      piece.element.classList.remove('on-board');
      updatePieceGradient(piece);
      onBoardStateChanged();
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
    piece.element.style.zIndex = String(zCounter++);
    pieces.forEach(p => p.element.classList.remove('selected'));
    piece.element.classList.add('selected');
    piece.isOnBoard = false;
    piece.element.classList.remove('on-board');
    piece.element.classList.add('dragging');
    updatePieceGradient(piece);
  
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
    activePiece.element.classList.remove('dragging');
    snapPieceToBoard(activePiece);
  
    const isTouch = ev.type.startsWith('touch');
    window.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onPointerMove);
    window.removeEventListener(isTouch ? 'touchend'  : 'mouseup',   onPointerUp);
    activePiece = null;
}
  
  // ========= 7. 旋转 =========
  
  function rotatePiece(piece) {
    const newRot = (piece.rotation + 1) % 4;

    const wasOnBoard = piece.isOnBoard && piece.gx != null && piece.gy != null;
    piece.rotation = newRot;
    layoutPieceBlocks(piece);

    if (wasOnBoard) {
      if (isPlacementValid(piece, piece.gx, piece.gy, newRot)) {
        piece.lastValid = { gx: piece.gx, gy: piece.gy, rotation: newRot };
        applyPieceTransform(piece);
      } else {
        piece.gx = null;
        piece.gy = null;
        piece.isOnBoard = false;
        piece.element.classList.remove('on-board');
      }
    }
    updatePieceGradient(piece);

    clearGhost();
    lastGhostTarget = null;
  }
  
  // ========= 8. 事件绑定入口 =========
  
export function attachPieceEvents() {
  pieces.forEach(piece => {
    const el = piece.element;
    el.addEventListener('mousedown', ev => onPointerDownPiece(ev, piece));
    el.addEventListener('touchstart', ev => onPointerDownPiece(ev, piece), { passive: false });
    el.addEventListener('mouseenter', () => {
      piece.element.classList.add('hovering');
      updatePieceGradient(piece);
    });
    el.addEventListener('mouseleave', () => {
      piece.element.classList.remove('hovering');
      updatePieceGradient(piece);
    });
    el.addEventListener('dblclick', ev => {
      if (ev.target.classList.contains('rotate-btn')) return;
      rotatePiece(piece);
      ev.preventDefault();
    });
  });

  window.addEventListener('keydown', ev => {
    if (ev.key === 'r' || ev.key === 'R' || ev.key === ' ') {
      if (activePiece) {
        rotatePiece(activePiece);
        ev.preventDefault();
      }
    }
  });
}
  
