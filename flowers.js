
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ========================================
// SCENE SETUP
// ========================================

const garden = document.getElementById("garden");

const scene = new THREE.Scene();

const camera = new THREE.OrthographicCamera(
    0,
    window.innerWidth,
    window.innerHeight,
    0,
    0.1,
    2000
);

camera.position.z = 500;

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.domElement.id = "flower-canvas";

garden.appendChild(renderer.domElement);


// ========================================
// LIGHTING
// ========================================

const ambientLight = new THREE.AmbientLight(
    0xffffff, 1.5
);

scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(
    0xfff0df, 2
);

sunlight.position.set(-100, 300, 500);

scene.add(sunlight);


// ========================================
// FLOWER CONFIGURATION
// ========================================

const flowers = [];

const flowerPalettes = [
    {
        petalOuter: 0xf2b6c8,
        petalInner: 0xf8d5e2,
        center: 0xe8c66a
    },
    {
        petalOuter: 0xd8c4f1,
        petalInner: 0xeee3fb,
        center: 0xf1cf75
    },
    {
        petalOuter: 0xf4c7a1,
        petalInner: 0xf9e0c7,
        center: 0xe7be63
    },
    {
        petalOuter: 0xf3dce8,
        petalInner: 0xfcf1f7,
        center: 0xe4c880
    },
    {
        petalOuter: 0xbfd7f2,
        petalInner: 0xe2eefb,
        center: 0xf0cf7b
    },
    {
        petalOuter: 0xf0b7a8,
        petalInner: 0xf9ddd5,
        center: 0xe7bd72
    }
];

const sphereGeometry = new THREE.SphereGeometry(
    1, 24, 16
);

const greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x739c6a,
    roughness: 0.7
});

const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x86ad78,
    roughness: 0.72
});

const pollenMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7e7a6,
    roughness: 0.5
});


// ========================================
// PETAL GENERATOR
// ========================================

function createPetal({
    color,
    x,
    y,
    z,
    scaleX,
    scaleY,
    scaleZ,
    rotationZ,
    rotationX = 0
}) {

    const petal = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.38,
            metalness: 0.02,
            emissive: color,
            emissiveIntensity: 0.08
        })
    );

    petal.position.set(x, y, z);

    petal.scale.set(
        scaleX,
        scaleY,
        scaleZ
    );

    petal.rotation.z = rotationZ;
    petal.rotation.x = rotationX;

    return petal;
}


// ========================================
// FLOWER GENERATOR
// ========================================

export function growFlower(x, y, delay = 0) {

    const flower = new THREE.Group();

    const height = 70 + Math.random() * 50;

    const palette = flowerPalettes[
        Math.floor(
            Math.random() * flowerPalettes.length
        )
    ];

    // Stem

    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(
            1.4, 2.8, height, 14
        ),
        greenMaterial
    );

    stem.position.y = height / 2;

    flower.add(stem);


    // Leaves

    for (let i = 0; i < 2; i++) {

        const direction = i === 0 ? -1 : 1;

        const leaf = new THREE.Mesh(
            sphereGeometry,
            leafMaterial
        );

        leaf.scale.set(16, 5.2, 2.2);

        leaf.position.set(
            direction * 11,
            height * (0.34 + i * 0.18),
            i * 0.5
        );

        leaf.rotation.z =
            direction * Math.PI / 4.2;

        leaf.rotation.y = direction * 0.3;

        flower.add(leaf);
    }


    // Flower head

    const head = new THREE.Group();

    head.position.y = height;

    const outerPetalCount =
        8 + Math.floor(Math.random() * 4);

    const innerPetalCount = outerPetalCount;


    // Outer petals

    for (let i = 0; i < outerPetalCount; i++) {

        const angle =
            (i / outerPetalCount) * Math.PI * 2;

        const radius = 18;

        const petal = createPetal({
            color: palette.petalOuter,

            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: -1.5,

            scaleX: 20,
            scaleY: 8.5,
            scaleZ: 4.5,

            rotationZ: angle,
            rotationX: -0.15
        });

        head.add(petal);
    }


    // Inner petals

    for (let i = 0; i < innerPetalCount; i++) {

        const angle =
            (i / innerPetalCount) * Math.PI * 2
            + Math.PI / innerPetalCount;

        const radius = 11.5;

        const petal = createPetal({
            color: palette.petalInner,

            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: 2,

            scaleX: 14,
            scaleY: 6,
            scaleZ: 3.5,

            rotationZ: angle,
            rotationX: -0.08
        });

        head.add(petal);
    }


    // Flower center

    const center = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshStandardMaterial({
            color: palette.center,
            roughness: 0.58,
            emissive: palette.center,
            emissiveIntensity: 0.12
        })
    );

    center.scale.set(8.5, 8.5, 5.5);

    center.position.z = 5.5;

    head.add(center);


    // Pollen details — Golden angle spiral

    for (let i = 0; i < 25; i++) {

        const angle = i * 2.399963;

        const radius =
            6.5 * Math.sqrt(i / 24);

        const dot = new THREE.Mesh(
            sphereGeometry,
            pollenMaterial
        );

        const z = 5.5 + 5.5 * Math.sqrt(
            1 - Math.pow(radius / 8.5, 2)
        );

        dot.scale.setScalar(0.7);

        dot.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            z
        );

        head.add(dot);
    }

    flower.add(head);


    // Flower position

    flower.position.set(
        x,
        window.innerHeight - y,
        0
    );


    // Initial growth state

    flower.scale.setScalar(0.001);

    head.scale.setScalar(0.001);

    flower.visible = false;

    scene.add(flower);


    // Store flower data

    flowers.push({
        mesh: flower,
        head: head,

        x: x / window.innerWidth,
        y: y / window.innerHeight,

        birth: performance.now() + delay,

        phase: Math.random() * Math.PI * 2
    });
}


// ========================================
// GROWTH ANIMATION
// ========================================

function animate(time) {

    requestAnimationFrame(animate);

    for (const flower of flowers) {

        const age =
            (time - flower.birth) / 1000;

        // Wait until the growth delay is complete

        flower.mesh.visible = age >= 0;

        if (age < 0) continue;


        // Stem and leaf growth

        const growth = THREE.MathUtils.smoothstep(
            age, 0, 1.5
        );

        flower.mesh.scale.setScalar(
            Math.max(0.001, growth)
        );


        // Flower head growth

        const bloom = THREE.MathUtils.smoothstep(
            age, 0.8, 2.5
        );

        flower.head.scale.setScalar(
            Math.max(0.001, bloom)
        );


        // Gentle idle movement

        flower.mesh.rotation.z =
            Math.sin(time * 0.0012 + flower.phase)
            * 0.045 * growth;


        // Subtle flower head movement

        flower.head.rotation.z =
            Math.sin(time * 0.0015 + flower.phase)
            * 0.03 * bloom;
    }

    renderer.render(scene, camera);
}

requestAnimationFrame(animate);


// ========================================
// WINDOW RESIZE
// ========================================

window.addEventListener("resize", () => {

    camera.right = window.innerWidth;
    camera.top = window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    for (const flower of flowers) {

        flower.mesh.position.set(
            flower.x * window.innerWidth,
            (1 - flower.y) * window.innerHeight,
            0
        );
    }
});
