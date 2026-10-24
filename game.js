// game.js - Voxel Game Logic (Mobile Optimized)

// --- Configuration ---
const GRID_SIZE = 10;
const WORLD_OFFSET = 5; 

// --- Three.js Setup ---
let scene, camera, renderer;
let controls;
let raycaster;
let objects = []; 
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let isLocked = false; 

// --- Colors ---
const COLORS = [0x888888, 0x222222, 0xFF5555, 0x55FF55, 0x5555FF, 0xFFFF55];

// --- Initialization ---
init();

function init() {
    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.5; // Start at block height

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

    // 6. Input Listeners (Keyboard & Touch)
    const onKeyDown = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = true; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = true; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = true; break;
            case 'Space':
                if (canJump === true) velocity.y += 12; 
                canJump = false;
                break;
        }
    };
    
    const onKeyUp = function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = false; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = false; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // 7. Touch Controls (D-Pad style)
    setupTouchControls();

    // 8. Build the World
    buildVoxelWorld();

    // 9. Interaction (Raycaster)
    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onMouseClick);

    // 10. Handle Resize
    window.addEventListener('resize', onWindowResize);

    // Start Animation Loop
    animate();
}

// --- World Building ---
function buildVoxelWorld() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Create a 10x10 grid centered at 0,0
    // Only fill the first 5 blocks in each row/column to keep it simple but visible
    for (let x = -WORLD_OFFSET; x < WORLD_OFFSET; x++) {
        for (let z = -WORLD_OFFSET; z < WORLD_OFFSET; z++) {
            // Fill blocks: x from -5 to 4, z from -5 to 4
            // This creates a 10x10 area where we place 50 blocks (10 rows of 5)
            // Or specifically: x in [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4] and z in [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4]
            // But we only want 5 blocks per row/col as per request "filled with 5 blocks".
            // Let's do a sparse pattern: x and z must both be < 5 in magnitude? 
            // Actually, let's just fill a specific 5x5 area to be safe and clear.
            if (x >= -5 && x < 5 && z >= -5 && z < 5) {
                // Add a random variation so it's not a solid wall, but keep density high enough to see
                // The user said "filled with 5 blocks". I will make a 5x5 grid of blocks.
                // 5 blocks wide, 5 blocks deep.
                const isEven = (x + z) % 2 === 0;
                const material = new THREE.MeshLambertMaterial({ color: isEven ? COLORS[Math.floor(Math.random() * COLORS.length)] : 0x222222 });
                const block = new THREE.Mesh(geometry, material);
                
                block.position.set(x, 0, z);
                scene.add(block);
                objects.push(block);
            }
        }
    }
}

// --- Touch Controls Logic ---
function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;

    const onTouchStart = function(event) {
        touchStartX = event.touches[0].pageX;
        touchStartY = event.touches[0].pageY;
    };

    const onTouchMove = function(event) {
        if (!isLocked) {
            const touch = event.touches[0];
            const deltaX = touch.pageX - touchStartX;
            const deltaY = touch.pageY - touchStartY;

            // Look around
            const targetRotationX = -deltaY * 0.005;
            const targetRotationY = deltaX * 0.005;
            
            // Simple pitch/roll look
            camera.rotation.x += deltaX * 0.005;
            camera.rotation.y += deltaY * 0.005;
            
            // Prevent rotating too far
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
            camera.rotation.y = Math.max(-Math.PI, Math.min(Math.PI, camera.rotation.y));
            
            // Update camera target for PointerLockControls
            controls.getObject().position.copy(camera.position);
            controls.getObject().rotation.set(0, 0, 0);
            camera.updateMatrixWorld();
            controls.getObject().quaternion.setFromRotationMatrix(camera.matrixWorld);
        }
    };

    const onTouchEnd = function(event) {
        touchStartX = 0;
        touchStartY = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
}

// --- Interaction ---
function onMouseClick(event) {
    if (!isLocked) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(objects);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (event.button === 0) { // Left Click: Remove Block
            scene.remove(intersect.object);
            objects.splice(objects.indexOf(intersect.object), 1);
        } else if (event.button === 2) { // Right Click: Add Block
            const voxel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffaa00 }));
            const point = intersect.point.clone().add(intersect.face.normal.multiplyScalar(0.5));
            voxel.position.copy(point);
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
    const playerX = position.x;
    const playerY = position.y;
    const playerZ = position.z;

    for (let obj of objects) {
        if (obj.position.distanceTo(position) < 0.8) {
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
        velocity.y -= 9.8 * 3.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 150.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 150.0 * delta;

        controls.move(-velocity.x * delta, -velocity.z * delta, velocity.y * delta);
        checkCollisions(controls.getObject().position);

        prevTime = time;
    } else {
        // While unlocked, look at nearest block
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0) {
            const target = intersects[0].object.position.clone().add(intersects[0].face.normal.multiplyScalar(0.5));
            target.y = 2.5;
            camera.lookAt(target);
        }
    }

    renderer.render(scene, camera);
}
