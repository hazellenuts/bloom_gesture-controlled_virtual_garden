import { growFlower } from "./flowers.js";
import {
    growGrass,
    startRain,
    isRaining,
    triggerButterflies
} from "./garden-effects.js";
const seeds = [];
const garden = document.getElementById("garden");
const PINCH_THRESHOLD = 0.35;
const RELEASE_THRESHOLD = 0.50;
let isPinching = false;
let pinchArmed = false;
const cameraSelect = document.getElementById("camera-select");
let currentStream = null;
let trackingStarted = false;
const video = document.getElementById("webcam");
const cursor = document.getElementById("cursor");
const status = document.getElementById("status");
const startButton = document.getElementById("start");
let handLandmarker;
let lastVideoTime = -1;
const canvas = document.getElementById("hand-canvas");
const ctx = canvas.getContext("2d");
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];
function getDistance(a, b) {
    const dx = (a.x - b.x) * video.videoWidth;
    const dy = (a.y - b.y) * video.videoHeight;
    return Math.hypot(dx, dy);
}
// Gesture state and thresholds (tune for your camera).
const GRASS_RADIUS = 110;
const GRASS_HOLD_MS = 450;
const HEART_HOLD_MS = 350;

const PEACE_HOLD_MS = 100;
const PEACE_RELEASE_MS = 200;
const BUTTERFLY_COOLDOWN = 1800;

let peaceSince = null;
let peaceAbsentSince = null;
let peaceLocked = false;
let lastButterflyTime = -Infinity;

const SWAP_HANDS = false; // Change to true only if camera labels are reversed.
let grassTarget = null;
let grassSince = null;
let heartSince = null;
let heartLocked = false;
let heartAbsentSince = null;
let cameraSwitching = false;
function resetGrassGesture() {
    grassTarget = null;
    grassSince = null;
    cursor.classList.remove('blooming');
}
function resetGardenGestures() {
    resetGrassGesture();
    resetPeaceGesture();

    heartSince = null;
    heartLocked = false;
    heartAbsentSince = null;
}
function resetPinch() {
    isPinching = false;
    pinchArmed = false;
    cursor.classList.remove('pinching');
}
function isHeart(right, left) {
    if (!right || !left) return false;
    const size = (getDistance(right[0], right[9]) + getDistance(left[0], left[9])) / 2;
    if (size < 1) return false;
    const indexGap = getDistance(right[8], left[8]) / size;
    const thumbGap = getDistance(right[4], left[4]) / size;
    const indexY = (right[8].y + left[8].y) / 2;
    const thumbY = (right[4].y + left[4].y) / 2;
    const verticalGap = (thumbY - indexY) * video.videoHeight / size;
    return indexGap < 0.50 && thumbGap < 0.50 && verticalGap > 0.30 &&
        getDistance(right[4], right[8]) / size > 0.45 &&
        getDistance(left[4], left[8]) / size > 0.45 &&
        getDistance(right[9], left[9]) / size > 0.60;
}
function waterGarden() {
    const planted = seeds.splice(0);
    planted.forEach((seed, index) => {
        if (!seed.hasGrass) growGrass(seed.x, seed.y);
        growFlower(seed.x * window.innerWidth, seed.y * window.innerHeight,
            Math.min(index * 110, 850));
        seed.element.remove();
    });
}
// Heart takes precedence over pinch and grass.
function detectHeart(right, left, now) {
    if (!isHeart(right, left)) {
        heartSince = null;
        if (heartLocked) {
            if (heartAbsentSince === null) heartAbsentSince = now;
            if (now - heartAbsentSince >= 250) heartLocked = false;
        }
        return false;
    }
    heartAbsentSince = null;
    if (heartSince === null) heartSince = now;
    if (!heartLocked && now - heartSince >= HEART_HOLD_MS) {
        if (startRain(waterGarden)) heartLocked = true;
    }
    status.textContent = isRaining(now)
        ? 'A little rain for every flower.'
        : heartLocked ? 'Release your heart to call the rain again.' : 'Hold your heart a little longer...';
    return true;
}
function detectGrass(left, x, y, now) {
    if (!left || !isOpenPalm(left) || isPinching) {
        resetGrassGesture();
        return;
    }
    cursor.classList.add('blooming');
    let nearest = null, distance = GRASS_RADIUS;
    for (const seed of seeds) {
        if (seed.hasGrass) continue;
        const d = Math.hypot(x-seed.x*window.innerWidth, y-seed.y*window.innerHeight);
        if (d < distance) { nearest = seed; distance = d; }
    }
    if (!nearest) {
        grassTarget = null; grassSince = null;
        status.textContent = 'Point at a bare seed to grow grass.';
        return;
    }
    if (grassTarget !== nearest) { grassTarget = nearest; grassSince = now; }
    status.textContent = 'Let the little grass grow...';
    if (now - grassSince >= GRASS_HOLD_MS) {
        growGrass(nearest.x, nearest.y);
        nearest.hasGrass = true;

        nearest.element.classList.add("disappearing");

        nearest.element.addEventListener("animationend", () => {
            nearest.element.remove();
        }, { once: true });

        grassTarget = null;
        grassSince = null;
        status.textContent = 'A little patch of grass!';
    }
}
function isOpenPalm(hand) {
    const wrist = hand[0];
    const fingers = [
        [8, 6],   // Index
        [12, 10], // Middle
        [16, 14], // Ring
        [20, 18]  // Pinky
    ];
    return fingers.every(([tip, pip]) => {
        const tipDistance =
            getDistance(hand[tip], wrist);
        const pipDistance =
            getDistance(hand[pip], wrist);
        return tipDistance > pipDistance * 1.15;
    });
}
function plantSeed(x, y) {
    const seed = document.createElement("div");
    seed.className = "seed";
    const normalizedX = x / window.innerWidth;
    const normalizedY = y / window.innerHeight;
    seed.style.left = `${normalizedX * 100}%`;
    seed.style.top = `${normalizedY * 100}%`;
    garden.appendChild(seed);
    seeds.push({
        element: seed,
        hasGrass: false,
        x: normalizedX,
        y: normalizedY
    });
}

function isPeaceSign(hand) {

    if (!hand) return false;

    const wrist = hand[0];

    const palmSize = getDistance(
        wrist,
        hand[9]
    );

    if (palmSize < 1) return false;

    function fingerRatio(tip, pip) {

        const tipDistance = getDistance(
            hand[tip], wrist
        );

        const pipDistance = getDistance(
            hand[pip], wrist
        );

        return tipDistance /
            Math.max(pipDistance, 1);
    }

    const indexExtended =
        fingerRatio(8, 6) > 1.18;

    const middleExtended =
        fingerRatio(12, 10) > 1.18;

    const ringFolded =
        fingerRatio(16, 14) < 1.10;

    const pinkyFolded =
        fingerRatio(20, 18) < 1.10;

    const fingersSeparated =
        getDistance(hand[8], hand[12]) /
        palmSize > 0.35;

    return (
        indexExtended &&
        middleExtended &&
        ringFolded &&
        pinkyFolded &&
        fingersSeparated
    );
}

function resetPeaceGesture() {

    peaceSince = null;
    peaceAbsentSince = null;
    peaceLocked = false;
}


function detectPeace(right, x, y, now) {

    if (!isPeaceSign(right)) {

        peaceSince = null;

        if (peaceLocked) {

            if (peaceAbsentSince === null) {
                peaceAbsentSince = now;
            }

            if (
                now - peaceAbsentSince >=
                PEACE_RELEASE_MS
            ) {
                peaceLocked = false;
            }
        }

        return false;
    }

    peaceAbsentSince = null;

    if (peaceSince === null) {
        peaceSince = now;
    }

    if (
        !peaceLocked &&
        now - peaceSince >= PEACE_HOLD_MS &&
        now - lastButterflyTime >= BUTTERFLY_COOLDOWN
    ) {

        triggerButterflies();

        peaceLocked = true;
        lastButterflyTime = now;
    }

    status.textContent = peaceLocked
        ? "The garden welcomes its little visitors."
        : "Calling the little butterflies...";
    return true;
}

function detectPinch(hand, x, y) {
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const wrist = hand[0];
    const middleMCP = hand[9];
    const pinchDistance = getDistance(
        thumbTip,
        indexTip
    );
    const palmSize = getDistance(
        wrist,
        middleMCP
    );
    if (palmSize < 1) return;
    const ratio = pinchDistance / palmSize;
    // Release gesture
    if (ratio > RELEASE_THRESHOLD) {
        isPinching = false;
        pinchArmed = true;
    }
    // Pinch gesture
    if (
        ratio < PINCH_THRESHOLD &&
        !isPinching &&
        pinchArmed
    ) {
        isPinching = true;
        pinchArmed = false;
        plantSeed(x, y);
    }
    cursor.classList.toggle(
        "pinching",
        isPinching
    );
    status.textContent = isPinching
        ? "A little seed has been planted."
        : "Pinch your fingers to plant a seed.";
}
async function getAvailableCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(
        device => device.kind === "videoinput"
    );
    const activeCameraId = currentStream
        ?.getVideoTracks()[0]
        ?.getSettings().deviceId;
    cameraSelect.innerHTML = "";
    cameras.forEach((camera, index) => {
        const option = document.createElement("option");
        option.value = camera.deviceId;
        option.textContent = camera.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });
    if (activeCameraId) {
        cameraSelect.value = activeCameraId;
    }
    cameraSelect.hidden = cameras.length === 0;
}
async function switchCamera(deviceId = null) {
    cameraSwitching = true;
    try {
    // Stop the previous camera
    if (currentStream) {
        currentStream.getTracks().forEach(track => {
            track.stop();
        });
    }
    currentStream = null;
    video.srcObject = null;
    cursor.style.display = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Camera configuration
    const constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            ...(deviceId
                ? { deviceId: { exact: deviceId } }
                : {})
        },
        audio: false
    };
    // Activate selected camera
    currentStream =
        await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    await video.play();
    lastVideoTime = -1;
    isPinching = false;
    pinchArmed = false;
    cursor.classList.remove("pinching");
    resetGardenGestures();
    } finally { cameraSwitching = false; }
}
async function initializeMediaPipe() {
    status.textContent = "Preparing your little garden...";
    const { HandLandmarker, FilesetResolver } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs"
    );
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            runningMode: "VIDEO",
            numHands: 2
        }
    );
}
async function startCamera() {
    startButton.disabled = true;
    cameraSelect.disabled = true;
    try {
        if (!handLandmarker) {
            await initializeMediaPipe();
        }
        await switchCamera(cameraSelect.value || null);
        await getAvailableCameras();
        startButton.style.display = "none";
        status.textContent = "Show your hand to begin.";
        if (!trackingStarted) {
            trackingStarted = true;
            trackHands();
        }
    } catch (error) {
        status.textContent = "Unable to start the camera.";
        console.error(error);
    } finally {
        startButton.disabled = false;
        cameraSelect.disabled = false;
    }
}
function trackHands() {

    requestAnimationFrame(trackHands);

    if (
        cameraSwitching ||
        !currentStream ||
        video.readyState < 2 ||
        video.currentTime === lastVideoTime
    ) return;

    lastVideoTime = video.currentTime;

    const now = performance.now();

    const results =
        handLandmarker.detectForVideo(video, now);

    drawHands(results.landmarks);

    let right = null;
    let left = null;

    const handedness =
        results.handednesses ??
        results.handedness ??
        [];

    // Identify right and left hands
    for (let i = 0; i < results.landmarks.length; i++) {

        const label =
            handedness[i]?.[0]?.categoryName;

        if (
            label === (SWAP_HANDS ? "Left" : "Right")
        ) {
            right = results.landmarks[i];
        }

        if (
            label === (SWAP_HANDS ? "Right" : "Left")
        ) {
            left = results.landmarks[i];
        }
    }

    let x, y;

    // Right-hand cursor
    if (right) {

        x = (1 - right[8].x) * window.innerWidth;
        y = right[8].y * window.innerHeight;

        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.display = "block";

    } else {

        cursor.style.display = "none";

        resetPinch();
        resetPeaceGesture();
    }


    // PRIORITY 1: HEART SIGN

    const heart = detectHeart(right, left, now);

    if (heart || isRaining(now)) {

        resetPinch();
        resetGrassGesture();
        resetPeaceGesture();

        if (isRaining(now)) {

            status.textContent =
                "A little rain for every flower.";
        }

        return;
    }


    // PRIORITY 2: PEACE SIGN

    if (right) {

        const peaceActive =
            detectPeace(right, x, y, now);

        if (peaceActive) {

            resetPinch();

            // The left hand can still grow grass
            detectGrass(left, x, y, now);

            return;
        }


        // PRIORITY 3: PINCH

        detectPinch(right, x, y);


        // LEFT HAND: GROW GRASS

        detectGrass(left, x, y, now);

    } else {

        resetGrassGesture();

        status.textContent =
            "Show your right hand to plant a seed.";
    }
}
startButton.addEventListener("click", startCamera);
function drawHands(hands) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const hand of hands) {
        // Draw connections
        ctx.strokeStyle = "#a8e6b0";
        ctx.lineWidth = 3;
        for (const [start, end] of HAND_CONNECTIONS) {
            ctx.beginPath();
            ctx.moveTo(
                hand[start].x * canvas.width,
                hand[start].y * canvas.height
            );
            ctx.lineTo(
                hand[end].x * canvas.width,
                hand[end].y * canvas.height
            );
            ctx.stroke();
        }
        // Draw landmarks
        for (let i = 0; i < hand.length; i++) {
            const landmark = hand[i];
            ctx.beginPath();
            ctx.arc(
                landmark.x * canvas.width,
                landmark.y * canvas.height,
                4,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = i === 8
                ? "#f8c4d8"
                : "#ffffff";
            ctx.fill();
        }
    }
}
cameraSelect.addEventListener("change", async () => {
    cameraSelect.disabled = true;
    try {
        await switchCamera(cameraSelect.value);
        status.textContent = "Show your hand to begin.";
        startButton.style.display = "none";
    } catch (error) {
        status.textContent = "Unable to switch camera.";
        startButton.style.display = "";
        console.error(error);
    } finally {
        cameraSelect.disabled = false;
    }
});

// ========================================
// ENTRANCE FAIRY DUST
// ========================================

function createEntranceParticles() {

    const container =
        document.querySelector(".entrance-dust");

    if (!container) return;

    container.replaceChildren();

    const colors = [
        "#e8d7a6",
        "#e9cfa0",
        "#f4e5bf",
        "#c9d3a5",
        "#eedcc7"
    ];

    const particleCount = 45;

    for (let i = 0; i < particleCount; i++) {

        const particle =
            document.createElement("i");

        const angle =
            Math.random() * Math.PI * 2;

        const distance =
            70 + Math.random() * 250;

        const startDistance =
            Math.random() * 35;

        const startX =
            Math.cos(angle) * startDistance;

        const startY =
            Math.sin(angle) * startDistance;

        const endX =
            Math.cos(angle) * distance;

        const endY =
            Math.sin(angle) * distance;

        const size =
            2 + Math.random() * 3;

        const duration =
            6 + Math.random() * 7;

        const delay =
            -Math.random() * duration;

        const color = colors[
            Math.floor(Math.random() * colors.length)
        ];

        particle.style.setProperty(
            "--start-x", `${startX}px`
        );

        particle.style.setProperty(
            "--start-y", `${startY}px`
        );

        particle.style.setProperty(
            "--end-x", `${endX}px`
        );

        particle.style.setProperty(
            "--end-y", `${endY}px`
        );

        particle.style.setProperty(
            "--size", `${size}px`
        );

        particle.style.setProperty(
            "--duration", `${duration}s`
        );

        particle.style.setProperty(
            "--delay", `${delay}s`
        );

        particle.style.setProperty(
            "--color", color
        );

        container.appendChild(particle);
    }
}

createEntranceParticles();