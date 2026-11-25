// Canvas effects: grass and rain. No external dependencies.
const garden = document.getElementById('garden');
const canvas = document.createElement('canvas');
canvas.id = 'garden-effects';
garden.appendChild(canvas);
const ctx = canvas.getContext('2d');
let width, height;
let rainAt = -Infinity;
let rainCallback = null;
const grassPatches = [];
const drops = Array.from({length: 140}, () => ({
    x: Math.random(), y: Math.random(), speed: 0.55 + Math.random() * 0.7,
    length: 9 + Math.random() * 15, opacity: 0.2 + Math.random() * 0.45
}));

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener('resize', resize);

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

export function growGrass(x, y) {
    const colors = ['#557e48', '#759c60', '#9bb879', '#b3c68c'];
    grassPatches.push({x, y, birth: performance.now(), blades:
        Array.from({length: 23}, () => ({
            dx: (Math.random() - 0.5) * 82,
            dy: (Math.random() - 0.5) * 14,
            h: 12 + Math.random() * 32,
            bend: (Math.random() - 0.5) * 19,
            color: colors[Math.floor(Math.random() * colors.length)],
            phase: Math.random() * Math.PI * 2,
            delay: Math.random() * 260
        }))
    });
}

export function isRaining(now = performance.now()) {
    return now - rainAt < 5000;
}
export function startRain(onWatered) {
    if (isRaining()) return false;
    rainAt = performance.now();
    rainCallback = onWatered;
    return true;
}

function animate(now) {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);
    for (const patch of grassPatches) {
        for (const b of patch.blades) {
            const growth = smooth((now - patch.birth - b.delay) / 1100);
            if (!growth) continue;
            const x = patch.x * width + b.dx;
            const y = patch.y * height + b.dy;
            const h = b.h * growth;
            const bend = (b.bend + Math.sin(now * 0.003 + b.phase) * 2) * growth;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(x - 2, y);
            ctx.quadraticCurveTo(x + bend * 0.25, y - h * 0.6, x + bend, y - h);
            ctx.quadraticCurveTo(x + bend * 0.55, y - h * 0.35, x + 2, y);
            ctx.closePath();
            ctx.fill();
        }
    }
    if (isRaining(now)) {
        const age = now - rainAt;
        const fade = smooth(age / 400) * (1 - smooth((age - 4100) / 900));
        ctx.fillStyle = `rgba(91,128,151,${0.11 * fade})`;
        ctx.fillRect(0, 0, width, height);
        for (const d of drops) {
            const x = ((d.x * width - age * 0.08) % width + width) % width;
            const y = ((d.y * height + age * d.speed) % (height + 40)) - 20;
            ctx.strokeStyle = `rgba(165,209,230,${d.opacity * fade})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 4, y + d.length);
            ctx.stroke();
        }
    }
    if (rainCallback && now - rainAt >= 1200) {
        const callback = rainCallback;
        rainCallback = null;
        callback();
    }
}
requestAnimationFrame(animate);
