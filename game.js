// game.js - Voxel Game Logic

// --- Configuration ---
const GRID_SIZE = 10;
const CHUNK_SIZE = 10; // Matches GRID_SIZE
const BLOCK_SIZE = 1;
const WORLD_OFFSET = 5; // Center the 10x10 grid at 0,0

// --- Three.js Setup (Global Variables) ---
let scene, camera, renderer;
let controls;
let raycaster;
let objects = []; // Array to store all voxel meshes for collision/raycasting
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isLocked = false; // Pointer lock status

// --- Colors for Blocks ---
const COLORS = [
    0x888888, // Grey
    0x222222, // Dark Grey
    0xFF5555, // Red
    0x55FF55, // Green
    0x5555FF, // Blue
    0xFFFF55, // Yellow
];

// --- Initialization ---
init();

function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    // Add some fog for depth
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 10;

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 5. Controls (PointerLock)
    controls = new THREE.PointerLockControls(camera, document.body);
    document.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        isLocked = true;
    });
    controls.addEventListener('unlock', function () {
        isLocked = false;
    });

    scene.add(controls.getObject());

    // 6. Input Listeners
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'Space':
                if (canJump === true) velocity.y += 12; // Jump speed
                canJump = false;
                break;
        }
    };

    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // 7. Build the World (10x10 grid, 5 blocks)
    buildVoxelWorld();

    // 8. Raycaster for Block Selection (Click to add/remove)
    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onMouseClick);

    // 9. Handle Resize
    window.addEventListener('resize', onWindowResize);

    // Start Animation Loop
    animate();
}

// --- World Building ---
function buildVoxelWorld() {
    const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    for (let x = -WORLD_OFFSET; x < WORLD_OFFSET; x++) {
        for (let z = -WORLD_OFFSET; z < WORLD_OFFSET; z++) {
            // Fill only the first 5 positions in the row
            if (x % 5 < 5 && z % 5 < 5) {
                const material = new THREE.MeshLambertMaterial({ color: COLORS[Math.floor(Math.random() * COLORS.length)] });
                const block = new THREE.Mesh(geometry, material);
                
                block.position.set(x, 0, z);
                scene.add(block);
                objects.push(block);
            }
        }
    }
}

// --- Interaction ---
function onMouseClick(event) {
    if (!isLocked) return;

    // Raycast from center of screen
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        
        // Distance check (only interact if close)
        if (intersect.distance > 15) return;

        if (event.button === 0) { // Left Click: Remove Block
            scene.remove(intersect.object);
            objects.splice(objects.indexOf(intersect.object), 1);
        } else if (event.button === 2) { // Right Click: Add Block (behind cursor)
            const voxel = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), new THREE.MeshLambertMaterial({ color: 0xffaa00 }));
            
            const point = intersect.point.clone().add(intersect.face.normal.multiplyScalar(0.5)); // Center of face
            voxel.position.copy(point);
            
            // Snap to grid
            voxel.position.x = Math.round(voxel.position.x);
            voxel.position.z = Math.round(voxel.position.z);
            voxel.position.y = Math.round(voxel.position.y);

            voxel.castShadow = true;
            voxel.receiveShadow = true;
            scene.add(voxel);
            objects.push(voxel);
        }
    }
}

// --- Movement Logic ---
function checkCollisions(position) {
    // Simple voxel collision: Check if any voxel center is inside the player's bounding box
    // Player box approx: x: 0.5-0.5, y: 1.5-2.5, z: 0.5-0.5 (standing on y=0)
    const playerX = position.x;
    const playerY = position.y;
    const playerZ = position.z;

    for (let obj of objects) {
        if (obj.position.distanceTo(position) < 0.8) { // Collision threshold
            // Check if player is above the block
            if (playerY < obj.position.y + 1 && playerY > obj.position.y) {
                velocity.y = Math.max(0, velocity.y);
                canJump = true;
            }
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 3.0 * delta; // Gravity

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 150.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 150.0 * delta;

        controls.move(-velocity.x * delta, -velocity.z * delta, velocity.y * delta);

        // Apply Collision Detection
        checkCollisions(controls.getObject().position);

        prevTime = time;
    } else {
        // While unlocked, move towards mouse cursor to look around
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0) {
            const target = intersects[0].object.position.clone().add(intersects[0].face.normal.multiplyScalar(0.5));
            target.y = 2.5; // Aim for block center height
            camera.lookAt(target);
        }
    }

    renderer.render(scene, camera);
}
