// solver.js
import { boardCells, holeIds, cellByGrid } from './board.js';

const BOARD_W = 7;
const BOARD_H = 8;

function rotatePoint(point, times) {
  let x = point.x;
  let y = point.y;
  for (let i = 0; i < times; i++) {
    const nextX = -y;
    const nextY = x;
    x = nextX;
    y = nextY;
  }
  return { x, y };
}

function normalizeBlocks(blocks) {
  let minX = Infinity;
  let minY = Infinity;
  for (const b of blocks) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
  }
  const normalized = blocks.map(b => ({ x: b.x - minX, y: b.y - minY }));
  normalized.sort((a, b) => (a.x - b.x) || (a.y - b.y));
  return normalized;
}

function getUniqueRotations(shape) {
  const seen = new Set();
  const layouts = [];

  for (let rot = 0; rot < 4; rot++) {
    const rotated = shape.map(p => rotatePoint(p, rot));
    const blocks = normalizeBlocks(rotated);
    const key = blocks.map(b => `${b.x},${b.y}`).join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    layouts.push({ rotation: rot, blocks });
  }

  return layouts;
}

function buildTargetCellIndex() {
  const blocked = new Set([holeIds.monthId, holeIds.dayId, holeIds.weekdayId]);
  const targetCells = boardCells.filter(cell => !blocked.has(cell.id));
  const byGrid = new Map();
  const indexById = new Map();
  targetCells.forEach((cell, index) => {
    byGrid.set(`${cell.gx},${cell.gy}`, index);
    indexById.set(cell.id, index);
  });
  return { targetCells, byGrid, indexById };
}

function buildPlacements(piece, cellIndexByGrid) {
  const placements = [];
  const rotations = getUniqueRotations(piece.shape);

  for (const layout of rotations) {
    for (let gy = 0; gy < BOARD_H; gy++) {
      for (let gx = 0; gx < BOARD_W; gx++) {
        let ok = true;
        let mask = 0n;
        const indices = [];

        for (const b of layout.blocks) {
          const tx = gx + b.x;
          const ty = gy + b.y;
          const boardCell = cellByGrid.get(`${tx},${ty}`);
          if (!boardCell) {
            ok = false;
            break;
          }
          if (
            boardCell.id === holeIds.monthId ||
            boardCell.id === holeIds.dayId ||
            boardCell.id === holeIds.weekdayId
          ) {
            ok = false;
            break;
          }
          const idx = cellIndexByGrid.get(`${tx},${ty}`);
          if (idx == null) {
            ok = false;
            break;
          }
          indices.push(idx);
          mask |= (1n << BigInt(idx));
        }

        if (!ok) continue;
        placements.push({
          pieceId: piece.id,
          rotation: layout.rotation,
          gx,
          gy,
          mask,
          indices
        });
      }
    }
  }

  return placements;
}

function getRemainingEmptyIndices(allMask, occupiedMask, totalCells) {
  const remaining = allMask & (~occupiedMask);
  const indices = [];
  for (let i = 0; i < totalCells; i++) {
    const bit = 1n << BigInt(i);
    if (remaining & bit) indices.push(i);
  }
  return indices;
}

function canComposeArea(size, pieceSizes) {
  const reachable = new Uint8Array(size + 1);
  reachable[0] = 1;
  for (const s of pieceSizes) {
    for (let v = size; v >= s; v--) {
      if (reachable[v - s]) reachable[v] = 1;
    }
  }
  return reachable[size] === 1;
}

function componentAreaPrune(targetCells, neighborsByIndex, allMask, occupiedMask, remainingPieceSizes) {
  const remainingMask = allMask & (~occupiedMask);
  const totalCells = targetCells.length;
  const visited = new Uint8Array(totalCells);
  const minPieceSize = remainingPieceSizes.length ? Math.min(...remainingPieceSizes) : Infinity;

  for (let i = 0; i < totalCells; i++) {
    const bit = 1n << BigInt(i);
    if ((remainingMask & bit) === 0n || visited[i]) continue;

    let area = 0;
    const queue = [i];
    visited[i] = 1;

    while (queue.length) {
      const cur = queue.pop();
      area++;
      for (const ni of neighborsByIndex[cur]) {
        if (visited[ni]) continue;
        const nBit = 1n << BigInt(ni);
        if ((remainingMask & nBit) === 0n) continue;
        visited[ni] = 1;
        queue.push(ni);
      }
    }

    if (area < minPieceSize) return true;
    if (!canComposeArea(area, remainingPieceSizes)) return true;
  }

  return false;
}

export function solvePuzzleDFS(pieces) {
  const { targetCells, byGrid, indexById } = buildTargetCellIndex();
  const totalCells = targetCells.length;
  const allMask = (1n << BigInt(totalCells)) - 1n;
  const neighborsByIndex = targetCells.map(cell => {
    const neighborCoords = [
      `${cell.gx + 1},${cell.gy}`,
      `${cell.gx - 1},${cell.gy}`,
      `${cell.gx},${cell.gy + 1}`,
      `${cell.gx},${cell.gy - 1}`
    ];
    const result = [];
    for (const key of neighborCoords) {
      const n = cellByGrid.get(key);
      if (!n) continue;
      const idx = indexById.get(n.id);
      if (idx == null) continue;
      result.push(idx);
    }
    return result;
  });

  const placementsByPiece = new Map();
  const pieceSizes = new Map();
  pieces.forEach(piece => {
    placementsByPiece.set(piece.id, buildPlacements(piece, byGrid));
    pieceSizes.set(piece.id, piece.shape.length);
  });

  const remainingPieceIds = pieces.map(p => p.id);
  const assignment = [];

  function dfs(occupiedMask, remainingIds) {
    if (occupiedMask === allMask && remainingIds.length === 0) return true;
    if (remainingIds.length === 0) return false;

    const remainingSizes = remainingIds.map(id => pieceSizes.get(id));
    if (componentAreaPrune(targetCells, neighborsByIndex, allMask, occupiedMask, remainingSizes)) return false;

    const remainingEmpty = getRemainingEmptyIndices(allMask, occupiedMask, totalCells);
    let pivotCell = -1;
    let pivotCandidates = null;

    for (const emptyIdx of remainingEmpty) {
      const bit = 1n << BigInt(emptyIdx);
      const candidates = [];
      for (const pid of remainingIds) {
        const list = placementsByPiece.get(pid) || [];
        for (const pl of list) {
          if ((pl.mask & occupiedMask) !== 0n) continue;
          if ((pl.mask & bit) === 0n) continue;
          candidates.push(pl);
        }
      }
      if (candidates.length === 0) return false;
      if (pivotCandidates == null || candidates.length < pivotCandidates.length) {
        pivotCell = emptyIdx;
        pivotCandidates = candidates;
        if (pivotCandidates.length === 1) break;
      }
    }

    if (pivotCell < 0 || !pivotCandidates) return false;

    for (const pl of pivotCandidates) {
      if ((pl.mask & occupiedMask) !== 0n) continue;

      const nextOccupied = occupiedMask | pl.mask;
      const nextRemaining = remainingIds.filter(id => id !== pl.pieceId);

      let forwardOk = true;
      for (const pid of nextRemaining) {
        const hasAny = (placementsByPiece.get(pid) || []).some(c => (c.mask & nextOccupied) === 0n);
        if (!hasAny) {
          forwardOk = false;
          break;
        }
      }
      if (!forwardOk) continue;

      assignment.push({
        id: pl.pieceId,
        gx: pl.gx,
        gy: pl.gy,
        rotation: pl.rotation
      });
      if (dfs(nextOccupied, nextRemaining)) return true;
      assignment.pop();
    }

    return false;
  }

  const ok = dfs(0n, remainingPieceIds);
  if (!ok) return null;

  return assignment;
}
