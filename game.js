// ─── Config ────────────────────────────────────────────────────────────────

const CELL = 56;    // px per grid cell
const COLS = 12;
const ROWS = 12;
const BASE_SPEED = 200;   // ms per tick (lower = faster)
const MIN_SPEED = 65;
const SPEED_STEP = 5;     // shave off per matcha collected

// ─── Canvas setup ──────────────────────────────────────────────────────────

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

// ─── Asset loading ─────────────────────────────────────────────────────────

const IMAGES = {};
const IMG_SRCS = {
  performativeMale: 'assets/performativeMale.png',
  matcha: 'assets/matcha.png',
  book: 'assets/book.png',
  nailPolish: 'assets/nailPolish.png',
  toteBag: 'assets/toteBag.png',
  vinyl: 'assets/vinyl.png',
};

const TAIL_ITEMS = ['book', 'nailPolish', 'toteBag', 'vinyl'];

let assetsLoaded = 0;
const TOTAL_ASSETS = Object.keys(IMG_SRCS).length;

function loadAssets(callback) {
  for (const [key, src] of Object.entries(IMG_SRCS)) {
    const img = new Image();
    img.onload = () => {
      assetsLoaded++;
      if (assetsLoaded === TOTAL_ASSETS) callback();
    };
    img.onerror = () => {
      // still count so we don't hang if an asset is missing
      assetsLoaded++;
      if (assetsLoaded === TOTAL_ASSETS) callback();
    };
    img.src = src;
    IMAGES[key] = img;
  }
}

// ─── Chessboard background ─────────────────────────────────────────────────

function drawBoard() {
  const LIGHT = '#d4b896';
  const DARK = '#8b6340';

  // wood-grain stripe texture via thin semi-transparent lines
  const GRAIN_LIGHT = 'rgba(255,240,210,0.07)';
  const GRAIN_DARK = 'rgba(0,0,0,0.08)';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? LIGHT : DARK;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);

      // subtle grain lines per square
      const grainColor = isLight ? GRAIN_LIGHT : GRAIN_DARK;
      ctx.strokeStyle = grainColor;
      ctx.lineWidth = 0.8;
      for (let g = 4; g < CELL; g += 9) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, r * CELL + g);
        ctx.lineTo(c * CELL + CELL, r * CELL + g + 2);
        ctx.stroke();
      }
    }
  }

  // thin grid lines for definition
  ctx.strokeStyle = 'rgba(60,30,10,0.18)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvas.width, r * CELL); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvas.height); ctx.stroke();
  }
}

// ─── Draw helpers ──────────────────────────────────────────────────────────

function drawImg(key, col, row, padding = 4) {
  const img = IMAGES[key];
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const x = col * CELL + padding;
  const y = row * CELL + padding;
  const size = CELL - padding * 2;
  ctx.drawImage(img, x, y, size, size);
}

function drawHead(col, row, dir) {
  const img = IMAGES['performativeMale'];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cx = col * CELL + CELL / 2;
  const cy = row * CELL + CELL / 2;
  const size = CELL - 2;

  ctx.save();
  ctx.translate(cx, cy);

  // rotate the head image based on direction so it always faces forward
  const angle = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[dir] ?? 0;
  ctx.rotate(angle);

  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// ─── Game state ────────────────────────────────────────────────────────────

let snake, dir, nextDir, matcha, tail, score, best, speed, ticker, alive;

function initState() {
  const startCol = Math.floor(COLS / 2);
  const startRow = Math.floor(ROWS / 2);

  snake = [{ c: startCol, r: startRow }];
  dir = 'right';
  nextDir = 'right';
  tail = [];           // array of { c, r, img }
  matcha = spawnMatcha();
  score = 0;
  speed = BASE_SPEED;
  alive = true;

  document.getElementById('score').textContent = '0';
}

function spawnMatcha() {
  const occupied = new Set(
    [...snake, ...tail].map(s => `${s.c},${s.r}`)
  );
  let pos;
  do {
    pos = {
      c: Math.floor(Math.random() * COLS),
      r: Math.floor(Math.random() * ROWS)
    };
  } while (occupied.has(`${pos.c},${pos.r}`));
  return pos;
}

function randomTailImg() {
  return TAIL_ITEMS[Math.floor(Math.random() * TAIL_ITEMS.length)];
}

// ─── Game loop ─────────────────────────────────────────────────────────────

function tick() {
  if (!alive) return;

  dir = nextDir;

  const head = snake[0];
  const moves = { right: { dc: 1, dr: 0 }, left: { dc: -1, dr: 0 }, up: { dc: 0, dr: -1 }, down: { dc: 0, dr: 1 } };
  const mv = moves[dir];
  const newHead = { c: head.c + mv.dc, r: head.r + mv.dr };

  // wall collision
  if (newHead.c < 0 || newHead.c >= COLS || newHead.r < 0 || newHead.r >= ROWS) {
    endGame(); return;
  }

  // self collision (check against tail segments)
  if (tail.some(s => s.c === newHead.c && s.r === newHead.r)) {
    endGame(); return;
  }

  // also check against snake body (all except last, which will be removed)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].c === newHead.c && snake[i].r === newHead.r) {
      endGame(); return;
    }
  }

  // move snake
  snake.unshift(newHead);
  const removed = snake.pop();  // save tail tip

  // ate matcha?
  if (newHead.c === matcha.c && newHead.r === matcha.r) {
    tail.push({ c: removed.c, r: removed.r, img: randomTailImg() });

    score += 1;
    document.getElementById('score').textContent = score;

    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    matcha = spawnMatcha();

    clearInterval(ticker);
    ticker = setInterval(tick, speed);
  }

  // move tail segments: each takes the position of the one in front
  if (tail.length > 0) {
    // shift tail positions to follow snake's last segment
    const snakeTail = snake[snake.length - 1];
    for (let i = tail.length - 1; i > 0; i--) {
      tail[i].c = tail[i - 1].c;
      tail[i].r = tail[i - 1].r;
    }
    tail[0].c = removed.c;
    tail[0].r = removed.r;
  }

  render();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();

  // draw tail items
  for (const seg of tail) {
    drawImg(seg.img, seg.c, seg.r, 2);
  }

  // draw head (last in draw order = on top)
  drawHead(snake[0].c, snake[0].r, dir);

  // draw matcha
  drawImg('matcha', matcha.c, matcha.r, 2);
}

// ─── Start / End ───────────────────────────────────────────────────────────

function startGame() {
  document.getElementById('overlay').classList.replace('visible', 'hidden');
  document.getElementById('gameover').classList.replace('visible', 'hidden');

  initState();
  render();

  clearInterval(ticker);
  ticker = setInterval(tick, speed);
}

function endGame() {
  alive = false;
  clearInterval(ticker);

  if (score > best) {
    best = score;
    document.getElementById('best').textContent = best;
  }

  document.getElementById('final-score').textContent =
    `score: ${score}  ·  items collected: ${tail.length}`;

  const go = document.getElementById('gameover');
  go.classList.remove('hidden');
  go.classList.add('visible');
}

// ─── Input ─────────────────────────────────────────────────────────────────

const KEY_MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

const OPPOSITES = { up: 'down', down: 'up', left: 'right', right: 'left' };

document.addEventListener('keydown', e => {
  const d = KEY_MAP[e.key];
  if (!d) return;
  if (d === OPPOSITES[dir]) return;  // can't reverse
  nextDir = d;
  e.preventDefault();
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// ─── Touch / Swipe ─────────────────────────────────────────────────────────

let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // tap, not swipe

  let swipeDir;
  if (Math.abs(dx) > Math.abs(dy)) {
    swipeDir = dx > 0 ? 'right' : 'left';
  } else {
    swipeDir = dy > 0 ? 'down' : 'up';
  }

  if (swipeDir === OPPOSITES[dir]) return;
  nextDir = swipeDir;
}, { passive: true });

document.addEventListener('touchmove', e => {
  e.preventDefault();
}, { passive: false });

// ─── D-pad buttons ─────────────────────────────────────────────────────────

['up','down','left','right'].forEach(d => {
  const btn = document.getElementById(`btn-${d}`);
  if (!btn) return;
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    if (d === OPPOSITES[dir]) return;
    nextDir = d;
  }, { passive: false });
});

// ─── Boot ──────────────────────────────────────────────────────────────────

best = 0;

loadAssets(() => {
  // draw the board behind the overlay while waiting to start
  drawBoard();
});

function scaleToFit() {
  const app = document.getElementById('app');
  const availH = window.innerHeight;
  const availW = window.innerWidth;
  const naturalH = app.scrollHeight;
  const naturalW = app.scrollWidth;
  const scale = Math.min(1, availW / naturalW, availH / naturalH) * 0.94;
  app.style.transform = `scale(${scale})`;
}

scaleToFit();
window.addEventListener('resize', scaleToFit);