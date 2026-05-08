const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");
const storageKey = "madsenmill.constellation.v1";

let w = 0;
let h = 0;
let dpr = 1;
let nodes = [];
let frame = 0;
let pointer = {
  x: window.innerWidth * 0.62,
  y: window.innerHeight * 0.34,
  px: window.innerWidth * 0.62,
  py: window.innerHeight * 0.34,
  tx: window.innerWidth * 0.62,
  ty: window.innerHeight * 0.34
};

function setPointer(x, y) {
  pointer.px = pointer.tx;
  pointer.py = pointer.ty;
  pointer.tx = x;
  pointer.ty = y;

  const mx = x - pointer.px;
  const my = y - pointer.py;

  for (const node of nodes) {
    const dx = x - node.x;
    const dy = y - node.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);

    if (distance < 220) {
      const pull = Math.pow(1 - distance / 220, 2);
      node.vx += (dx / distance) * pull * 0.9 + mx * pull * 0.006;
      node.vy += (dy / distance) * pull * 0.9 + my * pull * 0.006;
    }
  }
}

function createNodes() {
  const count = Math.max(72, Math.floor((w * h) / 14500));

  nodes = Array.from({ length: count }, () => {
    const homeX = Math.random() * w;
    const homeY = Math.random() * h;

    return {
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      vx: 0,
      vy: 0,
      r: 1.1 + Math.random() * 2.1,
      drift: 5 + Math.random() * 13,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: 0.0036 + Math.random() * 0.0054,
      speedY: 0.003 + Math.random() * 0.0048
    };
  });
}

function restoreNodes() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");

    if (!saved || !Array.isArray(saved.nodes)) {
      return false;
    }

    const sameViewport = Math.abs(saved.w - w) < 4 && Math.abs(saved.h - h) < 4;
    const stillFresh = Date.now() - saved.savedAt < 1000 * 60 * 30;

    if (!sameViewport || !stillFresh) {
      return false;
    }

    nodes = saved.nodes;
    frame = saved.frame || 0;
    pointer = saved.pointer || pointer;
    return true;
  } catch {
    return false;
  }
}

function saveNodes() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({
      w,
      h,
      frame,
      pointer,
      nodes,
      savedAt: Date.now()
    }));
  } catch {
    // Storage can fail in private browsing or local-file edge cases.
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!restoreNodes()) {
    createNodes();
  }
}

function draw() {
  frame += 1;
  pointer.x += (pointer.tx - pointer.x) * 0.075;
  pointer.y += (pointer.ty - pointer.y) * 0.075;

  ctx.clearRect(0, 0, w, h);

  for (const node of nodes) {
    const dx = node.x - pointer.x;
    const dy = node.y - pointer.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const driftX = node.homeX + Math.sin(frame * node.speedX + node.phaseX) * node.drift;
    const driftY = node.homeY + Math.cos(frame * node.speedY + node.phaseY) * node.drift;

    node.vx += (driftX - node.x) * 0.035;
    node.vy += (driftY - node.y) * 0.035;

    if (distance < 260) {
      const force = Math.pow(1 - distance / 260, 2) * 0.55;
      node.vx -= (dx / distance) * force;
      node.vy -= (dy / distance) * force;
    }

    node.vx *= 0.84;
    node.vy *= 0.84;

    const speed = Math.hypot(node.vx, node.vy);
    if (speed > 5) {
      node.vx = (node.vx / speed) * 5;
      node.vy = (node.vy / speed) * 5;
    }

    node.x += node.vx;
    node.y += node.vy;
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < 138) {
        ctx.strokeStyle = `rgba(255,255,255,${(1 - distance / 138) * 0.24})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(255,255,255,.68)";
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

window.addEventListener("resize", () => {
  saveNodes();
  resize();
});
window.addEventListener("pointermove", (event) => setPointer(event.clientX, event.clientY), { passive: true });
window.addEventListener("pointerdown", (event) => setPointer(event.clientX, event.clientY), { passive: true });
window.addEventListener("pagehide", saveNodes);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveNodes();
  }
});

resize();
draw();
