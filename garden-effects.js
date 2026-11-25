import { getFlowerTargets } from "./flowers.js";
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
const butterflies = [];
const sparkles = [];
const floatingPetals = [];

const butterflyPalettes = [
    ["#fff0f7", "#efa8ce"],
    ["#f0e5ff", "#b89cde"],
    ["#fff5d7", "#e8c777"],
    ["#e5f5ff", "#9ccde8"],
    ["#ffe4db", "#e9aa95"]
];

const sparkleColors = [
    "#fff3ce",
    "#ffd9ec",
    "#e5d5ff",
    "#cceaff",
    "#d9efbc"
];

const random = (min, max) =>
    min + Math.random() * (max - min);

const pick = array =>
    array[Math.floor(Math.random() * array.length)];

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

function getFlightPosition(b, progress) {

    const p = clamp(progress);

    const startX = b.fromLeft ? -90 : width + 90;
    const endX = b.fromLeft ? width + 90 : -90;

    const startY = b.startY * height;
    const endY = b.endY * height;

    const lerp = (a, b, t) =>
        a + (b - a) * t;

    // No flowers: fly freely across the garden
    if (!b.target) {

        return {
            x: lerp(startX, endX, p),

            y: lerp(startY, endY, p)
                + Math.sin(p * Math.PI * 2)
                * b.curve
                + Math.sin(p * Math.PI * 6)
                * 12
        };
    }

    // Flower destination
    const targetX = b.target.x * width;
    const targetY = b.target.y * height - 10;

    // Phase 1: Approach the flower
    if (p < 0.38) {

        const t = smooth(p / 0.38);

        return {
            x: lerp(startX, targetX, t),

            y: lerp(startY, targetY, t)
                - Math.sin(t * Math.PI)
                * b.curve
        };
    }

    // Phase 2: Flutter around the flower
    if (p < 0.72) {

        const t = (p - 0.38) / 0.34;

        const angle =
            t * Math.PI * 4 + b.phase;

        const orbit =
            Math.sin(t * Math.PI);

        return {
            x: targetX
                + Math.cos(angle)
                * b.orbitRadius * orbit,

            y: targetY
                + Math.sin(angle)
                * b.orbitRadius * 0.65 * orbit
        };
    }

    // Phase 3: Leave the garden
    const t = smooth((p - 0.72) / 0.28);

    return {
        x: lerp(targetX, endX, t),

        y: lerp(targetY, endY, t)
            - Math.sin(t * Math.PI)
            * b.curve
    };
}

export function triggerButterflies() {

    const now = performance.now();

    const targets = getFlowerTargets();

    for (let i = 0; i < 10; i++) {

        const target = targets.length
            ? pick(targets)
            : null;

        const butterfly = {

            fromLeft: Math.random() > 0.5,

            startY: random(0.2, 0.8),
            endY: random(0.15, 0.65),

            target,

            size: random(10, 18),

            phase: random(0, Math.PI * 2),
            speed: random(5, 9),

            curve: random(25, 75),
            orbitRadius: random(60, 100),

            colors: pick(butterflyPalettes),

            birth: now + i * 350,
            duration: random(8500, 12000)
        };

        butterflies.push(butterfly);


        // Scatter little sparkles along the flight path

        for (let j = 0; j < 8; j++) {

            const progress = random(0.15, 0.85);

            const position = getFlightPosition(
                butterfly,
                progress
            );

            sparkles.push({

                x: position.x / width,
                y: position.y / height,

                vx: random(-15, 15),
                vy: random(-25, 5),

                size: random(1, 3),

                color: pick(sparkleColors),

                phase: random(0, Math.PI * 2),

                type: Math.random() > 0.5
                    ? "star"
                    : "dot",

                birth: butterfly.birth
                    + butterfly.duration * progress,

                duration: random(1800, 3000)
            });
        }


        // Delicate floating petals

        for (let j = 0; j < 3; j++) {

            const progress = random(0.3, 0.75);

            const position = getFlightPosition(
                butterfly,
                progress
            );

            floatingPetals.push({

                x: position.x / width,
                y: position.y / height,

                vx: random(-15, 15),
                vy: random(-10, 20),

                size: random(2, 5),

                color: pick(sparkleColors),

                rotation: random(0, Math.PI * 2),
                spin: random(-1, 1),

                birth: butterfly.birth
                    + butterfly.duration * progress,

                duration: random(2500, 4500)
            });
        }
    }
}

function drawButterfly(b, x, y, age, alpha) {

    const flap =
        0.22 + 0.78 * Math.abs(
            Math.sin(age * b.speed + b.phase)
        );

    ctx.save();

    ctx.translate(x, y);

    ctx.rotate(
        Math.sin(age * 2 + b.phase) * 0.25
    );

    ctx.scale(b.size, b.size);
    ctx.globalAlpha = alpha;

    // Left and right wings
    for (const side of [-1, 1]) {

        ctx.save();

        ctx.scale(side * flap, 1);

        const gradient = ctx.createLinearGradient(
            0, 0, 1.9, -1.2
        );

        gradient.addColorStop(0, "#fffaf0");
        gradient.addColorStop(0.45, b.colors[0]);
        gradient.addColorStop(1, b.colors[1]);

        ctx.fillStyle = gradient;

        // Upper wing
        ctx.beginPath();
        ctx.moveTo(0, 0);

        ctx.bezierCurveTo(
            0.7, -1.65,
            2.2, -1.8,
            1.95, -0.65
        );

        ctx.bezierCurveTo(
            1.8, 0.15,
            0.8, 0.4,
            0, 0.15
        );

        ctx.closePath();
        ctx.fill();

        // Lower wing
        ctx.beginPath();
        ctx.moveTo(0, 0.15);

        ctx.bezierCurveTo(
            1.5, -0.15,
            1.8, 1.5,
            0.9, 1.4
        );

        ctx.bezierCurveTo(
            0.35, 1.3,
            0.15, 0.7,
            0, 0.15
        );

        ctx.closePath();
        ctx.fill();

        // Delicate wing veins
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 0.035;

        ctx.beginPath();
        ctx.moveTo(0.1, 0);
        ctx.quadraticCurveTo(0.8, -0.8, 1.7, -1.2);

        ctx.moveTo(0.1, 0.1);
        ctx.quadraticCurveTo(0.9, -0.1, 1.65, -0.3);

        ctx.moveTo(0.1, 0.2);
        ctx.quadraticCurveTo(0.6, 0.65, 0.95, 1.1);
        ctx.stroke();

        // Tiny wing decorations
        ctx.fillStyle = "#fff8df";

        for (const [dx, dy, radius] of [
            [1.45, -1.0, 0.09],
            [1.7, -0.65, 0.055],
            [0.95, 0.95, 0.07]
        ]) {

            ctx.beginPath();
            ctx.arc(dx, dy, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Butterfly body
    ctx.fillStyle = "#8d826c";

    ctx.beginPath();
    ctx.ellipse(0, 0, 0.09, 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = "#e1d6b7";
    ctx.lineWidth = 0.045;

    ctx.beginPath();

    ctx.moveTo(0, -0.5);
    ctx.quadraticCurveTo(-0.15, -0.95, -0.4, -1);

    ctx.moveTo(0, -0.5);
    ctx.quadraticCurveTo(0.15, -0.95, 0.4, -1);

    ctx.stroke();

    ctx.restore();
}

function drawMagic(now) {

    // ========================================
    // BUTTERFLIES
    // ========================================

    for (let i = butterflies.length - 1; i >= 0; i--) {

        const b = butterflies[i];

        const elapsed = now - b.birth;

        if (elapsed < 0) continue;

        if (elapsed >= b.duration) {

            butterflies.splice(i, 1);
            continue;
        }

        const age = elapsed / 1000;
        const progress = elapsed / b.duration;

        const position = getFlightPosition(
            b,
            progress
        );

        const fade =
            smooth(elapsed / 600)
            * (1 - smooth(
                (elapsed - b.duration + 600) / 600
            ));


        // Delicate glowing trail

        for (let j = 1; j <= 9; j++) {

            const trailElapsed =
                Math.max(0, elapsed - j * 90);

            const trail = getFlightPosition(
                b,
                trailElapsed / b.duration
            );

            ctx.save();

            ctx.globalAlpha =
                fade * (1 - j / 10) * 0.35;

            ctx.fillStyle = b.colors[0];

            ctx.shadowColor = b.colors[0];
            ctx.shadowBlur = 8;

            ctx.beginPath();

            ctx.arc(
                trail.x,
                trail.y,
                2 * (1 - j / 10),
                0,
                Math.PI * 2
            );

            ctx.fill();
            ctx.restore();
        }


        // Draw the flying butterfly

        drawButterfly(
            b,
            position.x,
            position.y,
            age,
            fade
        );
    }


    // ========================================
    // MAGICAL SPARKLES
    // ========================================

    for (let i = sparkles.length - 1; i >= 0; i--) {

        const s = sparkles[i];
        const elapsed = now - s.birth;
        if (elapsed < 0) continue;

        if (elapsed >= s.duration) {
            sparkles.splice(i, 1);
            continue;
        }

        const age = elapsed / 1000;
        const progress = elapsed / s.duration;

        const x = s.x * width + s.vx * age;
        const y = s.y * height + s.vy * age;

        const twinkle =
            0.5 + 0.5 *
            Math.sin(age * 7 + s.phase);

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(age * 0.8 + s.phase);

        ctx.globalAlpha =
            (1 - progress) * twinkle;

        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;

        const r = s.size;

        ctx.beginPath();

        if (s.type === "star") {

            // Four-pointed magical star
            ctx.moveTo(0, -r * 2);
            ctx.quadraticCurveTo(0, 0, r * 2, 0);

            ctx.quadraticCurveTo(0, 0, 0, r * 2);
            ctx.quadraticCurveTo(0, 0, -r * 2, 0);

            ctx.quadraticCurveTo(0, 0, 0, -r * 2);
            ctx.closePath();

        } else {

            ctx.arc(0, 0, r, 0, Math.PI * 2);
        }

        ctx.fill();
        ctx.restore();
    }


    // ========================================
    // FLOATING PETALS
    // ========================================

    for (let i = floatingPetals.length - 1; i >= 0; i--) {

        const p = floatingPetals[i];
        const elapsed = now - p.birth;

        if (elapsed < 0) continue;

        if (elapsed >= p.duration) {
            floatingPetals.splice(i, 1);
            continue;
        }

        const age = elapsed / 1000;
        const progress = elapsed / p.duration;

        const x =
            p.x * width +
            p.vx * age +
            Math.sin(age * 2) * 14;

        const y =
            p.y * height +
            p.vy * age +
            age * age * 5;

        ctx.save();

        ctx.translate(x, y);

        ctx.rotate(
            p.rotation + age * p.spin
        );

        ctx.globalAlpha =
            smooth(elapsed / 250) *
            (1 - progress) * 0.85;

        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.moveTo(0, p.size);

        ctx.quadraticCurveTo(
            -p.size, -p.size,
            0, -p.size
        );

        ctx.quadraticCurveTo(
            p.size, -p.size,
            0, p.size
        );

        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
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

    drawMagic(now);
}
requestAnimationFrame(animate);
