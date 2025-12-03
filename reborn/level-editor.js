import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ==================== COLLABORATIVE EDITING SETUP ====================
// Connect to backend server (configured in config.js)
const socket = io(window.CONFIG.BACKEND_URL);
let isReceivingUpdate = false; // Flag to prevent infinite loops
let myEditorColor = '#ffffff'; // My assigned editor color
const otherEditorPreviews = {}; // Store other editors' preview objects

// Join the editor session
socket.on('connect', () => {
    console.log('[Collaboration] Connected to server');
    const editorName = prompt('Enter your name:', 'Anonymous') || 'Anonymous';
    socket.emit('joinEditor', { name: editorName });
});

// Receive list of active editors
socket.on('activeEditors', (editors) => {
    console.log('[Collaboration] Active editors:', editors);

    // Find and store my own editor color
    const myEditor = editors.find(e => e.id === socket.id);
    if (myEditor) {
        myEditorColor = myEditor.color;
        console.log('[Collaboration] My editor color:', myEditorColor);
    }

    updateActiveEditorsList(editors);
});

// Receive sync data when joining
socket.on('syncLevel', (levelState) => {
    console.log('[Collaboration] Syncing level state');
    // TODO: Load the current level state
});

// ===== Receive updates from other editors =====

socket.on('editor:objectPlaced', (data) => {
    console.log('[Collaboration] Object placed by another editor:', data);
    isReceivingUpdate = true;
    // Load and place the object
    const path = data.type === 'building' ? `assets/buildings/${data.file}` : `assets/props/${data.file}`;
    loader.load(path, (gltf) => {
        const object = gltf.scene;
        object.position.set(data.position.x, data.position.y, data.position.z);
        object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        object.scale.set(data.scale.x, data.scale.y, data.scale.z);
        object.userData = data.userData;
        object.uuid = data.uuid;

        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(object);
        editorState.placedObjects.push(object);
        isReceivingUpdate = false;
    });
});

socket.on('editor:objectMoved', (data) => {
    isReceivingUpdate = true;
    const object = editorState.placedObjects.find(obj => obj.uuid === data.uuid);
    if (object) {
        object.position.set(data.position.x, data.position.y, data.position.z);
    }
    isReceivingUpdate = false;
});

socket.on('editor:objectRotated', (data) => {
    isReceivingUpdate = true;
    const object = editorState.placedObjects.find(obj => obj.uuid === data.uuid);
    if (object) {
        object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    }
    isReceivingUpdate = false;
});

socket.on('editor:objectScaled', (data) => {
    isReceivingUpdate = true;
    const object = editorState.placedObjects.find(obj => obj.uuid === data.uuid);
    if (object) {
        object.scale.set(data.scale.x, data.scale.y, data.scale.z);
    }
    isReceivingUpdate = false;
});

socket.on('editor:objectDeleted', (data) => {
    isReceivingUpdate = true;
    const object = editorState.placedObjects.find(obj => obj.uuid === data.uuid);
    if (object) {
        scene.remove(object);
        const index = editorState.placedObjects.indexOf(object);
        if (index > -1) {
            editorState.placedObjects.splice(index, 1);
        }
    }
    isReceivingUpdate = false;
});

socket.on('editor:terrainPainted', (data) => {
    // Sync terrain painting
    console.log('[Collaboration] Terrain painted by another editor');
});

socket.on('editor:groundTextureChanged', (data) => {
    console.log('[Collaboration] Ground texture changed:', data.texture);
    currentGroundTexture = data.texture;
    loadGroundTextureToMaterial(data.texture);
});

socket.on('editor:skyColorChanged', (data) => {
    console.log('[Collaboration] Sky color changed:', data.color);
    const color = new THREE.Color(data.color);
    scene.background = color;
    scene.fog = new THREE.Fog(data.color, 50, 500);
});

socket.on('editor:previewUpdate', (data) => {
    console.log('[Collaboration] Preview update from:', data.editorId);
    updateOtherEditorPreview(data);
});

socket.on('editor:previewClear', (data) => {
    console.log('[Collaboration] Preview cleared from:', data.editorId);
    clearOtherEditorPreview(data.editorId);
});

socket.on('editor:levelSaved', (data) => {
    showNotification(`Level saved by ${data.savedBy}`, 'info');
});

// ===== Broadcast functions =====
function broadcastObjectPlaced(object) {
    if (isReceivingUpdate) return;
    socket.emit('editor:objectPlaced', {
        uuid: object.uuid,
        type: object.userData.type,
        file: object.userData.file,
        position: { x: object.position.x, y: object.position.y, z: object.position.z },
        rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
        scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
        userData: object.userData
    });
}

function broadcastObjectMoved(object) {
    if (isReceivingUpdate) return;
    socket.emit('editor:objectMoved', {
        uuid: object.uuid,
        position: { x: object.position.x, y: object.position.y, z: object.position.z }
    });
}

function broadcastObjectRotated(object) {
    if (isReceivingUpdate) return;
    socket.emit('editor:objectRotated', {
        uuid: object.uuid,
        rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z }
    });
}

function broadcastObjectScaled(object) {
    if (isReceivingUpdate) return;
    socket.emit('editor:objectScaled', {
        uuid: object.uuid,
        scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z }
    });
}

function broadcastObjectDeleted(object) {
    if (isReceivingUpdate) return;
    socket.emit('editor:objectDeleted', {
        uuid: object.uuid
    });
}

function broadcastGroundTextureChange(texture) {
    socket.emit('editor:groundTextureChanged', { texture });
}

function broadcastSkyColorChange(color) {
    socket.emit('editor:skyColorChanged', { color });
}

function broadcastPreviewUpdate(modelPath, position, rotation, scale) {
    socket.emit('editor:previewUpdate', {
        modelPath,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z }
    });
}

function broadcastPreviewClear() {
    socket.emit('editor:previewClear');
}

// Update/create preview object for another editor
function updateOtherEditorPreview(data) {
    const { editorId, color, modelPath, position, rotation, scale } = data;

    // Remove existing preview for this editor
    clearOtherEditorPreview(editorId);

    // Load the model
    loader.load(modelPath, (gltf) => {
        const preview = gltf.scene.clone();
        preview.position.set(position.x, position.y, position.z);
        preview.rotation.set(rotation.x, rotation.y, rotation.z);
        preview.scale.set(scale.x, scale.y, scale.z);

        // Apply the editor's color to all meshes
        preview.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color.set(color);
                child.material.transparent = true;
                child.material.opacity = 0.5;
                child.material.emissive = new THREE.Color(color);
                child.material.emissiveIntensity = 0.3;
            }
        });

        scene.add(preview);
        otherEditorPreviews[editorId] = preview;
    });
}

// Clear preview object for another editor
function clearOtherEditorPreview(editorId) {
    if (otherEditorPreviews[editorId]) {
        scene.remove(otherEditorPreviews[editorId]);
        delete otherEditorPreviews[editorId];
    }
}

// Helper function to display active editors
function updateActiveEditorsList(editors) {
    // You can add UI to show this list
    console.log('Active editors:', editors);
    // TODO: Add UI element to show active editors
}

// ==================== SCENE SETUP ====================
const canvas = document.getElementById('canvas');
if (!canvas) {
    throw new Error('Canvas element not found! Make sure HTML is loaded correctly.');
}

const scene = new THREE.Scene();

// ==================== SKYBOX SYSTEM WITH GRADIENT ====================
// Create gradient skybox using shader
const skyGeo = new THREE.SphereGeometry(500, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
    `,
    uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 400 },
        exponent: { value: 0.6 }
    },
    side: THREE.BackSide
});

const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Also set scene background color as fallback
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

const skyboxes = {
    default: {
        name: 'Daytime',
        topColor: 0x0077ff,    // Sky blue
        bottomColor: 0xe0f6ff, // Light blue/white horizon
        fogColor: 0x87CEEB,
        ambientIntensity: 0.5,
        dirIntensity: 1.5,
        dirColor: 0xffefd5 // Warm sunlight
    },
    sunset: {
        name: 'Sunset',
        topColor: 0xff6b35,    // Orange top
        bottomColor: 0xffb347, // Yellow/orange horizon
        fogColor: 0xff8c61,
        ambientIntensity: 0.4,
        dirIntensity: 1.2,
        dirColor: 0xff6b35 // Orange sunlight
    },
    dusk: {
        name: 'Dusk',
        topColor: 0x1a2a4e,    // Dark blue
        bottomColor: 0x6b4e71, // Purple horizon
        fogColor: 0x3a3a5e,
        ambientIntensity: 0.25,
        dirIntensity: 0.5,
        dirColor: 0x9b7fa8 // Purple light
    },
    'night-moon': {
        name: 'Night (Moon)',
        topColor: 0x0a1128,    // Very dark blue
        bottomColor: 0x1a2a4e, // Slightly lighter blue
        fogColor: 0x0f1a2e,
        ambientIntensity: 0.15,
        dirIntensity: 0.4,
        dirColor: 0x6b8cff // Cool moonlight
    },
    'night-dark': {
        name: 'Night (No Moon)',
        topColor: 0x000000,    // Pitch black
        bottomColor: 0x0a0a0a, // Nearly black
        fogColor: 0x000000,
        ambientIntensity: 0.0, // NO ambient light = pitch black
        dirIntensity: 0.0,     // NO directional light
        dirColor: 0x000000
    },
    overcast: {
        name: 'Overcast',
        topColor: 0x9ca3af,    // Gray
        bottomColor: 0xd1d5db, // Light gray
        fogColor: 0xb0b5ba,
        ambientIntensity: 0.7,
        dirIntensity: 0.5,
        dirColor: 0xffffff // Diffuse white light
    }
};

let currentSkybox = 'default';
let sunAltitude = 45;  // degrees (0=horizon, 90=overhead)
let sunAzimuth = 135;  // degrees (0=north, 90=east, 180=south, 270=west)
let fogDistance = 150;

// ==================== CLOUD SYSTEM ====================
const cloudModels = [
    'SM_Generic_Cloud_01.glb',
    'SM_Generic_Cloud_02.glb',
    'SM_Generic_Cloud_03.glb',
    'SM_Generic_Cloud_04.glb',
    'SM_Generic_Cloud_05.glb'
];

let clouds = [];
let cloudSettings = {
    enabled: false,
    density: 0,
    height: 30,
    scale: 1.5,
    spread: 100,
    opacity: 0.85
};

function changeSkybox(skyboxId) {
    const skybox = skyboxes[skyboxId];
    if (!skybox) return;

    // Update gradient sky colors
    skyMat.uniforms.topColor.value.setHex(skybox.topColor);
    skyMat.uniforms.bottomColor.value.setHex(skybox.bottomColor);

    // Update fog
    scene.fog.color.setHex(skybox.fogColor);
    scene.fog.near = 50;
    scene.fog.far = fogDistance;

    // Update lighting
    ambientLight.intensity = skybox.ambientIntensity;
    dirLight.intensity = skybox.dirIntensity;
    dirLight.color.setHex(skybox.dirColor);

    // Update sun/moon position
    updateSunPosition();

    currentSkybox = skyboxId;
    showNotification(`Sky: ${skybox.name}`, 'success');

    // Broadcast sky color change to other editors
    broadcastSkyColorChange('#' + skybox.fogColor.toString(16).padStart(6, '0'));
}

function updateSunPosition() {
    // Convert spherical coordinates to Cartesian
    const altRad = (sunAltitude * Math.PI) / 180;
    const aziRad = (sunAzimuth * Math.PI) / 180;

    const distance = 100;
    const x = distance * Math.cos(altRad) * Math.sin(aziRad);
    const y = distance * Math.sin(altRad);
    const z = distance * Math.cos(altRad) * Math.cos(aziRad);

    dirLight.position.set(x, y, z);

    // Update target to point at origin
    dirLight.target.position.set(0, 0, 0);
}

function generateClouds() {
    // Remove existing clouds
    clearClouds();

    if (!cloudSettings.enabled) return;

    const density = cloudSettings.density;
    if (density === 0) return;

    for (let i = 0; i < density; i++) {
        // Randomly select a cloud model
        const modelName = cloudModels[Math.floor(Math.random() * cloudModels.length)];
        const path = `assets/props/${modelName}`;

        loader.load(path, (gltf) => {
            const cloud = gltf.scene;

            // Random position in a circle around the scene
            const angle = (Math.random() * Math.PI * 2);
            const radius = cloudSettings.spread * (0.5 + Math.random() * 0.5);
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = cloudSettings.height + (Math.random() - 0.5) * 10; // +/- 5 units variation

            cloud.position.set(x, y, z);

            // Random rotation
            cloud.rotation.y = Math.random() * Math.PI * 2;

            // Random scale variation
            const scaleVariation = cloudSettings.scale * (0.8 + Math.random() * 0.4);
            cloud.scale.set(scaleVariation, scaleVariation, scaleVariation);

            // Make clouds slightly transparent
            cloud.traverse((child) => {
                if (child.isMesh) {
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(mat => {
                            const clonedMat = mat.clone();
                            clonedMat.transparent = true;
                            clonedMat.opacity = cloudSettings.opacity;
                            clonedMat.depthWrite = false;
                            return clonedMat;
                        });
                    } else if (child.material) {
                        const clonedMat = child.material.clone();
                        clonedMat.transparent = true;
                        clonedMat.opacity = cloudSettings.opacity;
                        clonedMat.depthWrite = false;
                        child.material = clonedMat;
                    }
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });

            cloud.userData.isCloud = true;
            scene.add(cloud);
            clouds.push(cloud);
        }, undefined, (error) => {
            console.warn(`Failed to load cloud ${modelName}:`, error);
        });
    }
}

function clearClouds() {
    clouds.forEach(cloud => {
        scene.remove(cloud);
        disposeObject(cloud);
    });
    clouds = [];
}

function toggleClouds(enabled) {
    cloudSettings.enabled = enabled;
    clouds.forEach(cloud => {
        cloud.visible = enabled;
    });
}

function updateCloudOpacity(opacity) {
    cloudSettings.opacity = opacity;
    // Update existing clouds without regenerating
    clouds.forEach(cloud => {
        cloud.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.transparent) {
                            mat.opacity = opacity;
                        }
                    });
                } else if (child.material.transparent) {
                    child.material.opacity = opacity;
                }
            }
        });
    });
}

function updateCloudSettings(settings) {
    Object.assign(cloudSettings, settings);

    // If changing opacity only, update without regenerating
    if (settings.opacity !== undefined && Object.keys(settings).length === 1) {
        updateCloudOpacity(settings.opacity);
        return;
    }

    // If changing density, height, scale, or spread - regenerate
    if (settings.density !== undefined ||
        settings.height !== undefined ||
        settings.scale !== undefined ||
        settings.spread !== undefined) {
        generateClouds();
    }
}

// Camera
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(20, 15, 20);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ==================== PARTICLE SYSTEM ====================
class ParticleSystem {
    constructor(config) {
        this.particleType = config.particleType || 'fire';
        this.particles = [];
        this.particleCount = config.count || 50;
        this.lifetime = config.lifetime || 2.0;
        this.size = config.size || 0.2;
        this.color = config.color || 0xff6600;
        this.velocity = config.velocity || new THREE.Vector3(0, 2, 0);
        this.spread = config.spread || 1.0;
        this.gravity = config.gravity !== undefined ? config.gravity : -2.0;
        this.loop = config.loop !== undefined ? config.loop : true;
        this.emitTimer = 0;
        this.emitInterval = config.emitInterval || 0.1; // Emit particles every N seconds

        // Create particle geometry
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];

        for (let i = 0; i < this.particleCount; i++) {
            positions.push(0, 0, 0);
            colors.push(1, 1, 1);
            sizes.push(this.size);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        // Create particle material
        const material = new THREE.PointsMaterial({
            size: this.size,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.system = new THREE.Points(geometry, material);
        this.system.visible = true;
        this.system.userData.isParticleEmitter = true;
        this.system.userData.particleType = this.particleType;
        this.system.userData.config = config;
        scene.add(this.system);

        // Add helper to show emitter position
        const helperGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const helperMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5,
            wireframe: true
        });
        this.helper = new THREE.Mesh(helperGeometry, helperMaterial);
        this.system.add(this.helper);

        this.emitterPosition = new THREE.Vector3();
    }

    setPosition(x, y, z) {
        this.system.position.set(x, y, z);
        this.emitterPosition.set(x, y, z);
    }

    emit(position) {
        const positions = this.system.geometry.attributes.position.array;
        const colors = this.system.geometry.attributes.color.array;

        // Find dead particle slot or use oldest
        let slotIndex = -1;
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].age >= this.particles[i].life) {
                slotIndex = i;
                break;
            }
        }

        // If no dead particle, check if we can add more
        if (slotIndex === -1 && this.particles.length < this.particleCount) {
            slotIndex = this.particles.length;
        } else if (slotIndex === -1) {
            slotIndex = 0; // Reuse oldest
        }

        const idx = slotIndex * 3;
        const col = new THREE.Color(this.color);

        // Set initial position
        positions[idx] = position.x;
        positions[idx + 1] = position.y;
        positions[idx + 2] = position.z;

        // Set color
        colors[idx] = col.r;
        colors[idx + 1] = col.g;
        colors[idx + 2] = col.b;

        // Create or update particle data
        if (this.particles[slotIndex]) {
            this.particles[slotIndex].velocity.set(
                (Math.random() - 0.5) * this.spread + this.velocity.x,
                (Math.random() - 0.5) * this.spread + this.velocity.y,
                (Math.random() - 0.5) * this.spread + this.velocity.z
            );
            this.particles[slotIndex].life = this.lifetime;
            this.particles[slotIndex].age = 0;
        } else {
            this.particles[slotIndex] = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * this.spread + this.velocity.x,
                    (Math.random() - 0.5) * this.spread + this.velocity.y,
                    (Math.random() - 0.5) * this.spread + this.velocity.z
                ),
                life: this.lifetime,
                age: 0
            };
        }

        this.system.geometry.attributes.position.needsUpdate = true;
        this.system.geometry.attributes.color.needsUpdate = true;
    }

    update(delta) {
        if (!this.loop && this.particles.length === 0) return;

        // Auto-emit particles if looping
        if (this.loop) {
            this.emitTimer += delta;
            while (this.emitTimer >= this.emitInterval) {
                this.emitTimer -= this.emitInterval;
                this.emit(this.emitterPosition);
            }
        }

        const positions = this.system.geometry.attributes.position.array;
        const colors = this.system.geometry.attributes.color.array;
        const col = new THREE.Color(this.color);

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            if (!particle) continue;

            particle.age += delta;

            if (particle.age < particle.life) {
                const idx = i * 3;

                // Apply velocity
                particle.velocity.y += this.gravity * delta;
                positions[idx] += particle.velocity.x * delta;
                positions[idx + 1] += particle.velocity.y * delta;
                positions[idx + 2] += particle.velocity.z * delta;

                // Fade out
                const alpha = 1 - (particle.age / particle.life);
                colors[idx] = col.r * alpha;
                colors[idx + 1] = col.g * alpha;
                colors[idx + 2] = col.b * alpha;
            }
        }

        this.system.geometry.attributes.position.needsUpdate = true;
        this.system.geometry.attributes.color.needsUpdate = true;
    }

    dispose() {
        if (this.system) {
            scene.remove(this.system);
            this.system.geometry.dispose();
            this.system.material.dispose();
        }
        if (this.helper) {
            this.helper.geometry.dispose();
            this.helper.material.dispose();
        }
    }
}

// Particle presets for different types
const particlePresets = {
    fire: {
        color: 0xff6600,
        count: 50,
        lifetime: 2.0,
        size: 0.2,
        velocity: new THREE.Vector3(0, 3, 0),
        spread: 1.5,
        gravity: -1.0,
        emitInterval: 0.05
    },
    smoke: {
        color: 0x666666,
        count: 40,
        lifetime: 3.0,
        size: 0.5,
        velocity: new THREE.Vector3(0, 1.5, 0),
        spread: 1.0,
        gravity: -0.2,
        emitInterval: 0.1
    },
    sparks: {
        color: 0xffcc00,
        count: 80,
        lifetime: 1.0,
        size: 0.1,
        velocity: new THREE.Vector3(0, 4, 0),
        spread: 3.0,
        gravity: -9.8,
        emitInterval: 0.05
    },
    dust: {
        color: 0x8b7355,
        count: 30,
        lifetime: 2.5,
        size: 0.15,
        velocity: new THREE.Vector3(0, 0.5, 0),
        spread: 0.8,
        gravity: -0.5,
        emitInterval: 0.15
    },
    rain: {
        color: 0x88ccff,
        count: 200,
        lifetime: 2.0,
        size: 0.05,
        velocity: new THREE.Vector3(0, -10, 0),
        spread: 0.2,
        gravity: -5.0,
        emitInterval: 0.01
    },
    snow: {
        color: 0xffffff,
        count: 100,
        lifetime: 4.0,
        size: 0.15,
        velocity: new THREE.Vector3(0, -1, 0),
        spread: 0.5,
        gravity: -0.3,
        emitInterval: 0.05
    },
    magic: {
        color: 0xcc66ff,
        count: 60,
        lifetime: 1.5,
        size: 0.12,
        velocity: new THREE.Vector3(0, 2, 0),
        spread: 2.0,
        gravity: 0,
        emitInterval: 0.05
    },
    steam: {
        color: 0xccddee,
        count: 35,
        lifetime: 2.5,
        size: 0.35,
        velocity: new THREE.Vector3(0, 2, 0),
        spread: 0.8,
        gravity: -0.4,
        emitInterval: 0.12
    }
};

// ==================== POST-PROCESSING ====================
const composer = new EffectComposer(renderer);

// Render pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// SSAO Pass (Screen Space Ambient Occlusion)
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16;
ssaoPass.minDistance = 0.001;
ssaoPass.maxDistance = 0.1;
composer.addPass(ssaoPass);

// Bloom Pass
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,   // strength
    0.4,   // radius
    0.85   // threshold
);
composer.addPass(bloomPass);

// Output pass (required for proper color output)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Post-processing settings
const postProcessing = {
    enabled: true,
    bloom: {
        enabled: true,
        strength: 0.3,
        radius: 0.4,
        threshold: 0.85
    },
    ssao: {
        enabled: true,
        kernelRadius: 16
    }
};

function togglePostProcessing(enabled) {
    postProcessing.enabled = enabled;
    showNotification(`Post-processing ${enabled ? 'enabled' : 'disabled'}`, 'info');
}

function updateBloomSettings() {
    bloomPass.strength = postProcessing.bloom.strength;
    bloomPass.radius = postProcessing.bloom.radius;
    bloomPass.threshold = postProcessing.bloom.threshold;
}

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2 - 0.1;

// Transform Controls
const transformControls = new TransformControls(camera, canvas);
transformControls.setSize(1.0);

let transformStartState = null;
let isTransformDragging = false;

transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
    isTransformDragging = event.value;

    // Capture transform state when starting to drag
    if (event.value === true && editorState.selectedObject) {
        transformStartState = {
            position: editorState.selectedObject.position.clone(),
            rotation: editorState.selectedObject.rotation.clone(),
            scale: editorState.selectedObject.scale.clone()
        };
    }

    // Add to history when drag ends
    if (event.value === false && editorState.selectedObject && transformStartState) {
        addToHistory({
            type: 'transform',
            object: editorState.selectedObject,
            oldPosition: transformStartState.position,
            oldRotation: transformStartState.rotation,
            oldScale: transformStartState.scale,
            newPosition: editorState.selectedObject.position.clone(),
            newRotation: editorState.selectedObject.rotation.clone(),
            newScale: editorState.selectedObject.scale.clone()
        });

        // Broadcast transform changes to other editors
        if (transformControls.mode === 'translate') {
            broadcastObjectMoved(editorState.selectedObject);
        } else if (transformControls.mode === 'rotate') {
            broadcastObjectRotated(editorState.selectedObject);
        } else if (transformControls.mode === 'scale') {
            broadcastObjectScaled(editorState.selectedObject);
        }

        transformStartState = null;
    }
});

// Rotation snapping
transformControls.addEventListener('change', () => {
    if (editorState.rotationSnap && transformControls.mode === 'rotate' && editorState.selectedObject) {
        const obj = editorState.selectedObject;
        const snapRad = THREE.MathUtils.degToRad(editorState.rotationSnapAngle);
        obj.rotation.x = Math.round(obj.rotation.x / snapRad) * snapRad;
        obj.rotation.y = Math.round(obj.rotation.y / snapRad) * snapRad;
        obj.rotation.z = Math.round(obj.rotation.z / snapRad) * snapRad;
    }

    // Update light helper when moving lights
    if (editorState.selectedObject && editorState.selectedObject.userData.type === 'light') {
        updateLightHelper(editorState.selectedObject);
    }
});

scene.add(transformControls);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffefd5, 1.5);
dirLight.position.set(50, 50, 30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// Hemisphere light for better ambient
const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f3a, 0.5);
scene.add(hemiLight);

// Ground
const groundSize = 200;
const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a5f3a,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.name = 'ground';
scene.add(ground);

// ==================== GROUND TEXTURE SYSTEM ====================
const groundTextures = {
    default: {
        name: 'Default Grass',
        color: 0x3a5f3a
    }
};

let currentGroundTexture = 'default';

// Function to load PBR texture set from Unreal Fab
async function loadGroundTexture(textureId, textureName, texturePath) {
    try {
        showNotification(`Loading ${textureName}...`, 'info');

        // Get list of files that actually exist in this texture folder
        const folderName = texturePath.split('/').pop();
        let availableFiles = [];
        try {
            const response = await fetch(`/api/list-textures/${folderName}`);
            availableFiles = await response.json();
        } catch (error) {
            console.warn('Could not fetch texture list, using fallback method');
        }

        // Dispose old ground textures first
        if (window.terrainGroundMaterial.map) {
            window.terrainGroundMaterial.map.dispose();
            window.terrainGroundMaterial.map = null;
        }
        if (window.terrainGroundMaterial.normalMap) {
            window.terrainGroundMaterial.normalMap.dispose();
            window.terrainGroundMaterial.normalMap = null;
        }
        if (window.terrainGroundMaterial.roughnessMap) {
            window.terrainGroundMaterial.roughnessMap.dispose();
            window.terrainGroundMaterial.roughnessMap = null;
        }
        if (window.terrainGroundMaterial.aoMap) {
            window.terrainGroundMaterial.aoMap.dispose();
            window.terrainGroundMaterial.aoMap = null;
        }
        if (window.terrainGroundMaterial.displacementMap) {
            window.terrainGroundMaterial.displacementMap.dispose();
            window.terrainGroundMaterial.displacementMap = null;
        }

        // Create texture repeat values for proper tiling
        const repeat = 20; // Adjust for ground size

        // Load PBR maps with error handling
        const maps = {};
        const loadedTextures = [];

        // Helper function to load texture with error callback
        const loadTexture = (path, onSuccess, onError) => {
            textureLoader.load(
                path,
                (texture) => {
                    loadedTextures.push(texture);
                    onSuccess(texture);
                },
                undefined,
                (error) => {
                    if (onError) onError(error);
                }
            );
        };

        // Try multiple naming conventions for textures
        const tryLoadTexture = async (possibleNames, onSuccess) => {
            // If we have the file list, only try files that exist
            if (availableFiles.length > 0) {
                for (const name of possibleNames) {
                    const filename = name.split('/').pop();
                    if (availableFiles.includes(filename)) {
                        let loaded = false;
                        await new Promise(resolve => {
                            loadTexture(name, (texture) => {
                                if (!loaded) {
                                    loaded = true;
                                    onSuccess(texture);
                                }
                                resolve();
                            }, () => {
                                resolve();
                            });
                        });
                        if (loaded) return;
                    }
                }
            } else {
                // Fallback: try all names (old behavior)
                for (const name of possibleNames) {
                    let loaded = false;
                    await new Promise(resolve => {
                        loadTexture(name, (texture) => {
                            if (!loaded) {
                                loaded = true;
                                onSuccess(texture);
                            }
                            resolve();
                        }, () => {
                            resolve();
                        });
                    });
                    if (loaded) break;
                }
            }
        };

        // Try to load albedo/diffuse/base color map (required)
        await tryLoadTexture([
            `${texturePath}/T_uhrkaisdy_1K_B.PNG`,
            `${texturePath}/Grass005_1K-JPG_Color.jpg`,
            `${texturePath}/Grass005_1K-JPG_Color.PNG`,
            `${texturePath}/Ground048_1K-JPG_Color.jpg`,
            `${texturePath}/Ground055L_1K-JPG_Color.jpg`,
            `${texturePath}/Rock020_1K-JPG_Color.jpg`,
            `${texturePath}/brown_mud_03_diff_1k.jpg`,
            `${texturePath}/brown_mud_03_diff_1k.PNG`,
            `${texturePath}/albedo.jpg`,
            `${texturePath}/albedo.png`,
            `${texturePath}/diffuse.jpg`,
            `${texturePath}/diffuse.png`,
            `${texturePath}/basecolor.jpg`,
            `${texturePath}/basecolor.png`,
            `${texturePath}/color.jpg`,
            `${texturePath}/color.png`
        ], (texture) => {
            maps.map = texture;
            maps.map.wrapS = maps.map.wrapT = THREE.RepeatWrapping;
            maps.map.repeat.set(repeat, repeat);
            maps.map.colorSpace = THREE.SRGBColorSpace;
        });

        // Load normal map
        await tryLoadTexture([
            `${texturePath}/T_uhrkaisdy_1K_N.PNG`,
            `${texturePath}/Grass005_1K-JPG_NormalGL.jpg`,
            `${texturePath}/Grass005_1K-JPG_NormalGL.PNG`,
            `${texturePath}/Ground048_1K-JPG_NormalGL.jpg`,
            `${texturePath}/Ground055L_1K-JPG_NormalGL.jpg`,
            `${texturePath}/Rock020_1K-JPG_NormalGL.jpg`,
            `${texturePath}/brown_mud_03_nor_gl_1k.png`,
            `${texturePath}/normal.jpg`,
            `${texturePath}/normal.png`,
            `${texturePath}/normalgl.jpg`,
            `${texturePath}/normalgl.png`,
            `${texturePath}/nor_gl.jpg`,
            `${texturePath}/nor_gl.png`
        ], (texture) => {
            maps.normalMap = texture;
            maps.normalMap.wrapS = maps.normalMap.wrapT = THREE.RepeatWrapping;
            maps.normalMap.repeat.set(repeat, repeat);
        });

        // Load ORM (Occlusion/Roughness/Metallic) packed texture or separate maps
        await tryLoadTexture([
            `${texturePath}/T_uhrkaisdy_1K_ORM.PNG`,
            `${texturePath}/orm.jpg`,
            `${texturePath}/orm.png`
        ], (texture) => {
            // ORM packed texture: R=AO, G=Roughness, B=Metallic
            maps.aoMap = texture;
            maps.roughnessMap = texture;
            maps.metalnessMap = texture;
            maps.aoMap.wrapS = maps.aoMap.wrapT = THREE.RepeatWrapping;
            maps.aoMap.repeat.set(repeat, repeat);
            maps.roughnessMap.wrapS = maps.roughnessMap.wrapT = THREE.RepeatWrapping;
            maps.roughnessMap.repeat.set(repeat, repeat);
            maps.metalnessMap.wrapS = maps.metalnessMap.wrapT = THREE.RepeatWrapping;
            maps.metalnessMap.repeat.set(repeat, repeat);
            maps.aoMapIntensity = 1.0;
        });

        // If ORM not found, try loading separate roughness map
        if (!maps.roughnessMap) {
            await tryLoadTexture([
                `${texturePath}/Grass005_1K-JPG_Roughness.jpg`,
                `${texturePath}/Grass005_1K-JPG_Roughness.PNG`,
                `${texturePath}/Ground048_1K-JPG_Roughness.jpg`,
                `${texturePath}/Ground055L_1K-JPG_Roughness.jpg`,
                `${texturePath}/Rock020_1K-JPG_Roughness.jpg`,
                `${texturePath}/brown_mud_03_spec_1k.png`,
                `${texturePath}/roughness.jpg`,
                `${texturePath}/roughness.png`,
                `${texturePath}/spec.jpg`,
                `${texturePath}/spec.png`
            ], (texture) => {
                maps.roughnessMap = texture;
                maps.roughnessMap.wrapS = maps.roughnessMap.wrapT = THREE.RepeatWrapping;
                maps.roughnessMap.repeat.set(repeat, repeat);
            });
        }

        // If ORM not found, try loading separate AO map
        if (!maps.aoMap) {
            await tryLoadTexture([
                `${texturePath}/Grass005_1K-JPG_AmbientOcclusion.jpg`,
                `${texturePath}/Grass005_1K-JPG_AmbientOcclusion.PNG`,
                `${texturePath}/Ground048_1K-JPG_AmbientOcclusion.jpg`,
                `${texturePath}/Ground055L_1K-JPG_AmbientOcclusion.jpg`,
                `${texturePath}/Rock020_1K-JPG_AmbientOcclusion.jpg`,
                `${texturePath}/ao.jpg`,
                `${texturePath}/ao.png`,
                `${texturePath}/ambient.jpg`,
                `${texturePath}/ambient.png`,
                `${texturePath}/ambientocclusion.jpg`,
                `${texturePath}/ambientocclusion.png`
            ], (texture) => {
                maps.aoMap = texture;
                maps.aoMap.wrapS = maps.aoMap.wrapT = THREE.RepeatWrapping;
                maps.aoMap.repeat.set(repeat, repeat);
                maps.aoMapIntensity = 1.0;
            });
        }

        // Load displacement/height map
        await tryLoadTexture([
            `${texturePath}/Grass005_1K-JPG_Displacement.jpg`,
            `${texturePath}/Grass005_1K-JPG_Displacement.PNG`,
            `${texturePath}/Ground048_1K-JPG_Displacement.jpg`,
            `${texturePath}/Ground055L_1K-JPG_Displacement.jpg`,
            `${texturePath}/Rock020_1K-JPG_Displacement.jpg`,
            `${texturePath}/brown_mud_03_disp_1k.png`,
            `${texturePath}/displacement.jpg`,
            `${texturePath}/displacement.png`,
            `${texturePath}/height.jpg`,
            `${texturePath}/height.png`,
            `${texturePath}/disp.jpg`,
            `${texturePath}/disp.png`
        ], (texture) => {
            maps.displacementMap = texture;
            maps.displacementMap.wrapS = maps.displacementMap.wrapT = THREE.RepeatWrapping;
            maps.displacementMap.repeat.set(repeat, repeat);
            maps.displacementScale = 0.5;
        });

        // Update ground material with new PBR textures
        // Set color to white so texture shows true colors (not tinted)
        window.terrainGroundMaterial.color.setHex(0xffffff);

        // Set default roughness and metalness for natural materials
        window.terrainGroundMaterial.roughness = 0.9;  // Less shiny (0 = mirror, 1 = matte)
        window.terrainGroundMaterial.metalness = 0.0;  // Not metallic

        Object.assign(window.terrainGroundMaterial, maps);
        window.terrainGroundMaterial.needsUpdate = true;

        // Track loaded textures for cleanup
        editorState.loadedTextures.push(...loadedTextures);

        currentGroundTexture = textureId; // Save the ID (folder name), not the display name
        showNotification(`${textureName} applied!`, 'success');

    } catch (error) {
        showNotification('Error loading texture', 'error');
        console.error('Texture load error:', error);
    }
}

// Function to reset to default ground
function resetGroundTexture() {
    window.terrainGroundMaterial.map = null;
    window.terrainGroundMaterial.normalMap = null;
    window.terrainGroundMaterial.roughnessMap = null;
    window.terrainGroundMaterial.aoMap = null;
    window.terrainGroundMaterial.displacementMap = null;
    window.terrainGroundMaterial.color.setHex(0x3a5f3a);
    window.terrainGroundMaterial.roughness = 0.8;
    window.terrainGroundMaterial.metalness = 0.2;
    window.terrainGroundMaterial.needsUpdate = true;
    currentGroundTexture = 'default';
    showNotification('Reset to default ground', 'success');
}

// Register available ground textures
function registerGroundTexture(id, name, path) {
    groundTextures[id] = { name, path };
}

// Example: Register some common ground types
// Users can download these from Unreal Fab (fab.com) - formerly Quixel Megascans
registerGroundTexture('dirt', 'Dry Dirt', 'assets/textures/ground/dirt');
registerGroundTexture('grass', 'Lush Grass', 'assets/textures/ground/grass');
registerGroundTexture('mud', 'Wet Mud', 'assets/textures/ground/mud');
registerGroundTexture('sand', 'Desert Sand', 'assets/textures/ground/sand');
registerGroundTexture('rock', 'Rocky Terrain', 'assets/textures/ground/rock');
registerGroundTexture('snow', 'Snow Ground', 'assets/textures/ground/snow');

// ==================== TERRAIN PAINTING SYSTEM ====================

// Splatmap textures for blending 6 textures (2 RGBA textures = 8 channels, using 6)
const splatmapSize = 512; // Resolution of splatmap

// Create canvas-based splatmaps for reliable updates
const splatmapCanvas1 = document.createElement('canvas');
splatmapCanvas1.width = splatmapSize;
splatmapCanvas1.height = splatmapSize;
const splatmapCtx1 = splatmapCanvas1.getContext('2d');
const splatmapImageData1 = splatmapCtx1.createImageData(splatmapSize, splatmapSize);

const splatmapCanvas2 = document.createElement('canvas');
splatmapCanvas2.width = splatmapSize;
splatmapCanvas2.height = splatmapSize;
const splatmapCtx2 = splatmapCanvas2.getContext('2d');
const splatmapImageData2 = splatmapCtx2.createImageData(splatmapSize, splatmapSize);

// Initialize splatmap1 with grass (channel R = 255)
for (let i = 0; i < splatmapImageData1.data.length; i += 4) {
    splatmapImageData1.data[i] = 255;     // R = grass (100%)
    splatmapImageData1.data[i + 1] = 0;   // G = dirt
    splatmapImageData1.data[i + 2] = 0;   // B = mud
    splatmapImageData1.data[i + 3] = 0;   // A = sand (not alpha!)
}

// Initialize splatmap2 all zeros
for (let i = 0; i < splatmapImageData2.data.length; i += 4) {
    splatmapImageData2.data[i] = 0;       // R = rock
    splatmapImageData2.data[i + 1] = 0;   // G = snow
    splatmapImageData2.data[i + 2] = 0;   // B = unused
    splatmapImageData2.data[i + 3] = 255; // A = actual alpha for canvas
}

// Put initial data on canvases
splatmapCtx1.putImageData(splatmapImageData1, 0, 0);
splatmapCtx2.putImageData(splatmapImageData2, 0, 0);

// Create textures from canvases
const splatmap1 = new THREE.CanvasTexture(splatmapCanvas1);
splatmap1.wrapS = THREE.ClampToEdgeWrapping;
splatmap1.wrapT = THREE.ClampToEdgeWrapping;
splatmap1.minFilter = THREE.LinearFilter;
splatmap1.magFilter = THREE.LinearFilter;
splatmap1.needsUpdate = true;

const splatmap2 = new THREE.CanvasTexture(splatmapCanvas2);
splatmap2.wrapS = THREE.ClampToEdgeWrapping;
splatmap2.wrapT = THREE.ClampToEdgeWrapping;
splatmap2.minFilter = THREE.LinearFilter;
splatmap2.magFilter = THREE.LinearFilter;
splatmap2.needsUpdate = true;

console.log('Splatmaps initialized');

// Store texture sets for painting (will be populated as textures load)
const paintTextureData = {
    grass: { color: null, normal: null, roughness: null, ao: null },
    dirt: { color: null, normal: null, roughness: null, ao: null },
    mud: { color: null, normal: null, roughness: null, ao: null },
    sand: { color: null, normal: null, roughness: null, ao: null },
    rock: { color: null, normal: null, roughness: null, ao: null },
    snow: { color: null, normal: null, roughness: null, ao: null }
};

// Brush cursor mesh
const brushCursorGeometry = new THREE.RingGeometry(0.5, 0.6, 32);
const brushCursorMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthTest: false
});
const brushCursor = new THREE.Mesh(brushCursorGeometry, brushCursorMaterial);
brushCursor.rotation.x = -Math.PI / 2;
brushCursor.visible = false;
scene.add(brushCursor);

// Function to update brush cursor size
function updateBrushCursorSize() {
    const size = editorState.paintBrushSize;
    brushCursor.scale.set(size, size, 1);
}

// Helper function to create default fallback textures
function createFallbackTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create initial fallback textures so shader always has valid textures
const fallbackGrass = createFallbackTexture('#3a5f3a');
const fallbackDirt = createFallbackTexture('#8b7355');
const fallbackMud = createFallbackTexture('#654321');
const fallbackSand = createFallbackTexture('#f4a460');
const fallbackRock = createFallbackTexture('#808080');
const fallbackSnow = createFallbackTexture('#ffffff');
const fallbackNormal = createFallbackTexture('#8080ff');
const fallbackRoughness = createFallbackTexture('#808080');
const fallbackAO = createFallbackTexture('#ffffff');

// Simple ground material with shadow support
// Will be updated with textures once they load
const terrainGroundMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White so texture shows true colors
    roughness: 0.8,
    metalness: 0.2
});

// Store reference so we can update it later with textures
window.terrainGroundMaterial = terrainGroundMaterial;

// Replace ground material
ground.material.dispose();
ground.material = terrainGroundMaterial;

// Ensure ground receives shadows (critical for seeing object shadows!)
ground.receiveShadow = true;
ground.castShadow = false; // Ground doesn't cast shadows

console.log('=== SHADOW SYSTEM STATUS ===');
console.log('✓ Renderer shadowMap enabled:', renderer.shadowMap.enabled);
console.log('✓ Directional light castShadow:', dirLight.castShadow);
console.log('✓ Ground receiveShadow:', ground.receiveShadow);
console.log('✓ Shadow map size:', dirLight.shadow.mapSize.width, 'x', dirLight.shadow.mapSize.height);
console.log('✓ Shadows should now be visible on the ground!');
console.log('Note: Terrain painting disabled to ensure shadows work');
console.log('============================');

// Log if there are shader errors
if (renderer.info.programs) {
    renderer.info.programs.forEach(program => {
        if (program.diagnostics) {
            console.log('Shader diagnostics:', program.diagnostics);
        }
    });
}

// Function to paint on terrain
function paintOnTerrain(uv, brushSize, opacity, textureIndex) {
    if (!uv) {
        console.log('No UV coordinates!');
        return;
    }

    console.log('paintOnTerrain called:', { uv, brushSize, opacity, textureIndex });

    // Convert UV to splatmap pixel coordinates
    // Note: UV.y might need flipping for rotated plane
    const x = Math.floor(uv.x * splatmapSize);
    const y = Math.floor((1.0 - uv.y) * splatmapSize); // Flip Y coordinate

    // Convert brush size from world units to splatmap pixels
    const brushRadius = brushSize * (splatmapSize / groundSize);

    console.log('Brush size:', brushSize, 'Brush radius in pixels:', brushRadius.toFixed(1), 'at splatmap position:', { x, y }, 'UV:', { x: uv.x.toFixed(3), y: uv.y.toFixed(3) });

    // Ensure brush radius is at least 1 pixel
    if (brushRadius < 1) {
        console.warn('Brush radius too small:', brushRadius);
        return;
    }

    // Get direct reference to ImageData
    const data1 = splatmapImageData1.data;
    const data2 = splatmapImageData2.data;

    let pixelsPainted = 0;

    // Paint in circular area
    for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > brushRadius) continue;

            const px = Math.floor(x + dx);
            const py = Math.floor(y + dy);

            if (px < 0 || px >= splatmapSize || py < 0 || py >= splatmapSize) continue;

            pixelsPainted++;

            // Falloff based on distance (smooth from center to edge)
            const falloff = 1.0 - (dist / brushRadius);
            // Calculate strength - multiply by 3 for good visibility
            const strength = falloff * opacity * 255 * 3;

            const index = (py * splatmapSize + px) * 4;

            // Determine which splatmap and channel
            const targetChannel = textureIndex;

            if (targetChannel <= 3) {
                // Splatmap 1 (grass, dirt, mud, sand)
                const channelOffset = targetChannel;

                // Get current values of all channels in splatmap1
                const currentValues = [
                    data1[index + 0],
                    data1[index + 1],
                    data1[index + 2],
                    data1[index + 3]
                ];

                // Calculate total weight of other channels
                let totalOthers = 0;
                for (let i = 0; i < 4; i++) {
                    if (i !== channelOffset) {
                        totalOthers += currentValues[i];
                    }
                }

                // Increase target channel
                const targetValue = currentValues[channelOffset];
                const newTargetValue = Math.min(255, targetValue + strength);
                data1[index + channelOffset] = newTargetValue;

                // Decrease other channels proportionally to their current values
                if (totalOthers > 0) {
                    for (let i = 0; i < 4; i++) {
                        if (i !== channelOffset) {
                            const proportion = currentValues[i] / totalOthers;
                            const decrease = strength * proportion;
                            data1[index + i] = Math.max(0, currentValues[i] - decrease);
                        }
                    }
                }

                // Clear splatmap2 channels
                data2[index + 0] = Math.max(0, data2[index + 0] - strength * 0.5);
                data2[index + 1] = Math.max(0, data2[index + 1] - strength * 0.5);
            } else {
                // Splatmap 2 (rock, snow)
                const channelOffset = targetChannel - 4;

                // Get current values
                const currentValues = [
                    data2[index + 0],
                    data2[index + 1]
                ];

                // Calculate total weight of other channel
                const otherChannel = channelOffset === 0 ? 1 : 0;
                const otherValue = currentValues[otherChannel];

                // Increase target channel
                const targetValue = currentValues[channelOffset];
                const newTargetValue = Math.min(255, targetValue + strength);
                data2[index + channelOffset] = newTargetValue;

                // Decrease other channel in splatmap2
                data2[index + otherChannel] = Math.max(0, otherValue - strength);

                // Decrease all splatmap1 channels proportionally
                const total1 = data1[index + 0] + data1[index + 1] + data1[index + 2] + data1[index + 3];
                if (total1 > 0) {
                    for (let i = 0; i < 4; i++) {
                        const proportion = data1[index + i] / total1;
                        const decrease = strength * proportion;
                        data1[index + i] = Math.max(0, data1[index + i] - decrease);
                    }
                }
            }
        }
    }

    // Update canvases with modified data
    splatmapCtx1.putImageData(splatmapImageData1, 0, 0);
    splatmapCtx2.putImageData(splatmapImageData2, 0, 0);

    // Force texture update - CanvasTextures need needsUpdate flag
    splatmap1.needsUpdate = true;
    splatmap2.needsUpdate = true;

    // Terrain painting is currently disabled for shadow support
    // Splatmaps are still updated but not used by the shader
    console.log('Painted', pixelsPainted, 'pixels (terrain painting disabled)');
}

// Load all textures for painting system
async function initializePaintingSystem() {
    const texturePromises = [];
    const textures = ['grass', 'dirt', 'mud', 'sand', 'rock', 'snow'];

    for (const texName of textures) {
        const path = `assets/textures/ground/${texName}`;

        texturePromises.push(
            (async () => {
                try {
                    // Get available files
                    let availableFiles = [];
                    try {
                        const response = await fetch(`/api/list-textures/${texName}`);
                        availableFiles = await response.json();
                    } catch (error) {
                        console.warn(`Could not fetch texture list for ${texName}`);
                    }

                    // Load color texture - match specific files per texture type
                    let colorNames = [];
                    if (texName === 'grass') {
                        colorNames = [`${path}/Grass005_1K-JPG_Color.jpg`];
                    } else if (texName === 'dirt') {
                        colorNames = [`${path}/Ground048_1K-JPG_Color.jpg`];
                    } else if (texName === 'mud') {
                        colorNames = [`${path}/brown_mud_03_diff_1k.jpg`];
                    } else if (texName === 'sand') {
                        colorNames = [`${path}/Ground055L_1K-JPG_Color.jpg`];
                    } else if (texName === 'rock') {
                        colorNames = [`${path}/Rock020_1K-JPG_Color.jpg`];
                    } else if (texName === 'snow') {
                        colorNames = [`${path}/T_uhrkaisdy_1K_B.PNG`];
                    }

                    // Fallback to generic names if specific not found
                    colorNames.push(
                        `${path}/albedo.jpg`, `${path}/albedo.png`,
                        `${path}/color.jpg`, `${path}/color.png`,
                        `${path}/basecolor.jpg`, `${path}/basecolor.png`
                    );

                    for (const name of colorNames) {
                        const filename = name.split('/').pop();
                        if (availableFiles.length === 0 || availableFiles.includes(filename)) {
                            try {
                                const texture = await new Promise((resolve, reject) => {
                                    textureLoader.load(name, resolve, undefined, reject);
                                });
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                paintTextureData[texName].color = texture;
                                console.log(`✅ Loaded color texture for ${texName}: ${name}`);
                                break;
                            } catch (e) {
                                console.warn(`❌ Failed to load ${name}:`, e.message);
                                continue;
                            }
                        }
                    }

                    // Load normal texture - match specific files per texture type
                    let normalNames = [];
                    if (texName === 'grass') {
                        normalNames = [`${path}/Grass005_1K-JPG_NormalGL.jpg`];
                    } else if (texName === 'dirt') {
                        normalNames = [`${path}/Ground048_1K-JPG_NormalGL.jpg`];
                    } else if (texName === 'mud') {
                        normalNames = [`${path}/brown_mud_03_nor_gl_1k.png`];
                    } else if (texName === 'sand') {
                        normalNames = [`${path}/Ground055L_1K-JPG_NormalGL.jpg`];
                    } else if (texName === 'rock') {
                        normalNames = [`${path}/Rock020_1K-JPG_NormalGL.jpg`];
                    } else if (texName === 'snow') {
                        normalNames = [`${path}/T_uhrkaisdy_1K_N.PNG`];
                    }

                    // Fallback to generic names
                    normalNames.push(
                        `${path}/normal.jpg`, `${path}/normal.png`,
                        `${path}/NormalGL.png`, `${path}/normalgl.png`
                    );

                    for (const name of normalNames) {
                        const filename = name.split('/').pop();
                        if (availableFiles.length === 0 || availableFiles.includes(filename)) {
                            try {
                                const texture = await new Promise((resolve, reject) => {
                                    textureLoader.load(name, resolve, undefined, reject);
                                });
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                paintTextureData[texName].normal = texture;
                                break;
                            } catch (e) {
                                continue;
                            }
                        }
                    }

                    // Load roughness texture - match specific files per texture type
                    let roughnessNames = [];
                    if (texName === 'grass') {
                        roughnessNames = [`${path}/Grass005_1K-JPG_Roughness.jpg`];
                    } else if (texName === 'dirt') {
                        roughnessNames = [`${path}/Ground048_1K-JPG_Roughness.jpg`];
                    } else if (texName === 'mud') {
                        roughnessNames = [`${path}/brown_mud_03_spec_1k.png`];
                    } else if (texName === 'sand') {
                        roughnessNames = [`${path}/Ground055L_1K-JPG_Roughness.jpg`];
                    } else if (texName === 'rock') {
                        roughnessNames = [`${path}/Rock020_1K-JPG_Roughness.jpg`];
                    } else if (texName === 'snow') {
                        roughnessNames = [`${path}/T_uhrkaisdy_1K_ORM.PNG`];
                    }

                    // Fallback to generic names
                    roughnessNames.push(
                        `${path}/roughness.jpg`, `${path}/roughness.png`,
                        `${path}/Roughness.png`
                    );

                    for (const name of roughnessNames) {
                        const filename = name.split('/').pop();
                        if (availableFiles.length === 0 || availableFiles.includes(filename)) {
                            try {
                                const texture = await new Promise((resolve, reject) => {
                                    textureLoader.load(name, resolve, undefined, reject);
                                });
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                paintTextureData[texName].roughness = texture;
                                break;
                            } catch (e) {
                                continue;
                            }
                        }
                    }

                    // Load AO texture - match specific files per texture type
                    let aoNames = [];
                    if (texName === 'grass') {
                        aoNames = [`${path}/Grass005_1K-JPG_AmbientOcclusion.jpg`];
                    } else if (texName === 'dirt') {
                        aoNames = [`${path}/Ground048_1K-JPG_AmbientOcclusion.jpg`];
                    } else if (texName === 'mud') {
                        aoNames = []; // No AO for mud, will use fallback
                    } else if (texName === 'sand') {
                        aoNames = [`${path}/Ground055L_1K-JPG_AmbientOcclusion.jpg`];
                    } else if (texName === 'rock') {
                        aoNames = [`${path}/Rock020_1K-JPG_AmbientOcclusion.jpg`];
                    } else if (texName === 'snow') {
                        aoNames = [`${path}/T_uhrkaisdy_1K_ORM.PNG`];
                    }

                    // Fallback to generic names
                    aoNames.push(
                        `${path}/ao.jpg`, `${path}/ao.png`,
                        `${path}/AmbientOcclusion.png`, `${path}/ambientocclusion.png`
                    );

                    for (const name of aoNames) {
                        const filename = name.split('/').pop();
                        if (availableFiles.length === 0 || availableFiles.includes(filename)) {
                            try {
                                const texture = await new Promise((resolve, reject) => {
                                    textureLoader.load(name, resolve, undefined, reject);
                                });
                                texture.wrapS = THREE.RepeatWrapping;
                                texture.wrapT = THREE.RepeatWrapping;
                                paintTextureData[texName].ao = texture;
                                break;
                            } catch (e) {
                                continue;
                            }
                        }
                    }

                    // If missing textures, use fallbacks
                    if (!paintTextureData[texName].color) {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = 1;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = texName === 'grass' ? '#3a5f3a' :
                                       texName === 'dirt' ? '#8b7355' :
                                       texName === 'mud' ? '#654321' :
                                       texName === 'sand' ? '#f4a460' :
                                       texName === 'rock' ? '#808080' :
                                       '#ffffff';
                        ctx.fillRect(0, 0, 1, 1);
                        const texture = new THREE.CanvasTexture(canvas);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        paintTextureData[texName].color = texture;
                    }

                    if (!paintTextureData[texName].normal) {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = 1;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#8080ff'; // Flat normal
                        ctx.fillRect(0, 0, 1, 1);
                        const texture = new THREE.CanvasTexture(canvas);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        paintTextureData[texName].normal = texture;
                    }

                    if (!paintTextureData[texName].roughness) {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = 1;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#808080'; // 0.5 roughness
                        ctx.fillRect(0, 0, 1, 1);
                        const texture = new THREE.CanvasTexture(canvas);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        paintTextureData[texName].roughness = texture;
                    }

                    if (!paintTextureData[texName].ao) {
                        const canvas = document.createElement('canvas');
                        canvas.width = canvas.height = 1;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff'; // No AO
                        ctx.fillRect(0, 0, 1, 1);
                        const texture = new THREE.CanvasTexture(canvas);
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        paintTextureData[texName].ao = texture;
                    }
                } catch (error) {
                    console.error(`Failed to load paint textures for ${texName}:`, error);
                }
            })()
        );
    }

    await Promise.all(texturePromises);

    // Apply grass texture to ground material
    if (window.terrainGroundMaterial && paintTextureData.grass.color) {
        // Clone textures so we can set different UV repeat
        const grassColor = paintTextureData.grass.color.clone();
        const grassNormal = paintTextureData.grass.normal.clone();
        const grassRoughness = paintTextureData.grass.roughness.clone();
        const grassAO = paintTextureData.grass.ao.clone();

        // Set texture repeat for tiling (50x50 repeats across the 200x200 ground)
        const repeatValue = 50;
        grassColor.wrapS = grassColor.wrapT = THREE.RepeatWrapping;
        grassColor.repeat.set(repeatValue, repeatValue);

        grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping;
        grassNormal.repeat.set(repeatValue, repeatValue);

        grassRoughness.wrapS = grassRoughness.wrapT = THREE.RepeatWrapping;
        grassRoughness.repeat.set(repeatValue, repeatValue);

        grassAO.wrapS = grassAO.wrapT = THREE.RepeatWrapping;
        grassAO.repeat.set(repeatValue, repeatValue);

        // Apply textures to material
        window.terrainGroundMaterial.map = grassColor;
        window.terrainGroundMaterial.normalMap = grassNormal;
        window.terrainGroundMaterial.roughnessMap = grassRoughness;
        window.terrainGroundMaterial.aoMap = grassAO;
        window.terrainGroundMaterial.aoMapIntensity = 1.0;

        // Important: mark material for update
        window.terrainGroundMaterial.needsUpdate = true;

        console.log('✓ Applied grass texture to ground with PBR maps (color, normal, roughness, AO)');
    }

    // Log texture loading status
    console.log('=== TERRAIN TEXTURES LOADED ===');
    console.log('Loaded textures:', {
        grass: paintTextureData.grass.color ? 'YES' : 'NO',
        dirt: paintTextureData.dirt.color ? 'YES' : 'NO',
        mud: paintTextureData.mud.color ? 'YES' : 'NO',
        sand: paintTextureData.sand.color ? 'YES' : 'NO',
        rock: paintTextureData.rock.color ? 'YES' : 'NO',
        snow: paintTextureData.snow.color ? 'YES' : 'NO'
    });
    console.log('Ground material: Grass texture with shadows enabled');
    console.log('===============================');
}

// Grid
const gridHelper = new THREE.GridHelper(groundSize, 100, 0x888888, 0x444444);
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Axes helper
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// GLTF Loader
const loader = new GLTFLoader();

// Model cache for level editor to avoid reloading same models
const modelCache = new Map();

// Enhanced model loader with caching
async function loadModelWithCache(path) {
    if (modelCache.has(path)) {
        console.log(`[Editor] Using cached model: ${path}`);
        return modelCache.get(path).clone();
    }

    try {
        const gltf = await new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, reject);
        });
        modelCache.set(path, gltf.scene);
        console.log(`[Editor] Loaded and cached: ${path}`);
        return gltf.scene.clone();
    } catch (error) {
        console.error(`[Editor] Failed to load ${path}:`, error.message);
        throw error;
    }
}

// Texture Loader for PBR materials
const textureLoader = new THREE.TextureLoader();

// Initialize painting system on load (after textureLoader is defined)
initializePaintingSystem();

// ==================== EDITOR STATE ====================
const editorState = {
    mode: 'select',
    transformMode: 'translate',
    selectedObject: null,
    selectedObjects: [],  // Multi-select support
    selectedType: null,
    selectedFile: null,
    placedObjects: [],
    gridSnap: true,
    gridSize: 1,
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    loadedTextures: [], // Track loaded textures for cleanup
    loadedModels: [],   // Track loaded models for cleanup
    clipboard: [],      // Copy/paste clipboard
    cameraBookmarks: [null, null, null, null], // F1-F4 bookmarks
    lastAutoSave: Date.now(),
    statsVisible: false,
    wireframeMode: false,
    randomPlacement: false, // Random rotation/scale on placement
    isolationMode: false,
    rotationSnap: false,    // Snap rotation to 15/45/90
    rotationSnapAngle: 15,  // Default snap angle
    hotbar: [null, null, null, null, null], // 5-9 keys
    recentItems: [],        // Recently placed items
    maxRecent: 10,
    groups: [],             // Object groups
    gizmoSize: 1.0,         // Transform controls size
    previewObject: null,    // Ghost preview for placement
    previewRotation: 0,     // Current preview rotation (Y-axis in radians)
    lastMousePosition: null, // Last mouse intersection for preview
    paintMode: false,       // Terrain painting mode
    paintBrushSize: 15,     // Brush size in world units
    paintBrushOpacity: 0.5, // Brush opacity/strength
    paintTexture: 'grass',  // Current texture to paint (grass, dirt, mud, sand, rock, snow)
    isPainting: false,      // Currently painting
    placedLights: [],       // Track placed lights separately
    selectedLightType: null, // Current light type to place (point, spot, directional)
    selectedLight: null,    // Currently selected light for editing
    playerSpawn: null,      // Player spawn point object
    placedParticles: [],    // Track placed particle emitters
    selectedParticleType: null, // Current particle type to place
    selectedParticle: null,  // Currently selected particle emitter
    team1Spawns: [],        // Team 1 spawn points
    team2Spawns: [],        // Team 2 spawn points
    selectedSpawnType: null // Current spawn type to place (team1, team2)
};

// ==================== MEMORY MANAGEMENT ====================
function disposeObject(object) {
    if (!object) return;

    object.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => disposeMaterial(material));
            } else {
                disposeMaterial(child.material);
            }
        }
    });
}

function disposeMaterial(material) {
    if (!material) return;

    // Dispose all texture maps
    const textureMaps = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap',
        'aoMap', 'displacementMap', 'emissiveMap', 'alphaMap'
    ];

    textureMaps.forEach(mapName => {
        if (material[mapName]) {
            material[mapName].dispose();
        }
    });

    material.dispose();
}

function cleanupScene() {
    // Dispose all placed objects
    editorState.placedObjects.forEach(obj => {
        disposeObject(obj);
        scene.remove(obj);
    });
    editorState.placedObjects = [];

    // Dispose all lights
    editorState.placedLights.forEach(light => {
        if (light.userData.helper) {
            scene.remove(light.userData.helper);
            light.userData.helper.dispose();
        }
        if (light.target && light.target.parent) {
            scene.remove(light.target);
        }
        scene.remove(light);
    });
    editorState.placedLights = [];

    // Dispose all particle systems
    editorState.placedParticles.forEach(particleSystem => {
        particleSystem.dispose();
    });
    editorState.placedParticles = [];

    // Reset player spawn reference
    editorState.playerSpawn = null;

    // Dispose loaded textures
    editorState.loadedTextures.forEach(texture => texture.dispose());
    editorState.loadedTextures = [];

    updateInfo();
}

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    container.appendChild(notif);

    setTimeout(() => {
        notif.remove();
    }, 3000);
}

function updateInfo() {
    const modeEl = document.getElementById('info-mode');
    const objectsEl = document.getElementById('info-objects');
    const selectedEl = document.getElementById('info-selected');
    const cameraEl = document.getElementById('info-camera');
    const rotationRowEl = document.getElementById('info-rotation-row');
    const rotationEl = document.getElementById('info-rotation');

    if (modeEl) modeEl.textContent = editorState.mode;
    if (objectsEl) objectsEl.textContent = editorState.placedObjects.length;
    if (selectedEl) {
        if (editorState.selectedObjects.length === 0) {
            selectedEl.textContent = 'None';
        } else if (editorState.selectedObjects.length === 1) {
            selectedEl.textContent = editorState.selectedObject.userData?.file || 'Unknown';
        } else {
            selectedEl.textContent = `${editorState.selectedObjects.length} objects`;
        }
    }
    if (cameraEl) {
        const camPos = camera.position;
        cameraEl.textContent = `${camPos.x.toFixed(1)}, ${camPos.y.toFixed(1)}, ${camPos.z.toFixed(1)}`;
    }

    // Show/hide rotation indicator based on mode
    if (rotationRowEl && rotationEl) {
        if (editorState.mode === 'place' && editorState.previewObject) {
            rotationRowEl.style.display = '';
            const currentDegrees = Math.round((editorState.previewRotation * 180 / Math.PI) % 360);
            rotationEl.textContent = `${currentDegrees}°`;
        } else {
            rotationRowEl.style.display = 'none';
        }
    }
}

function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

// ==================== HISTORY (UNDO/REDO) ====================
function addToHistory(action) {
    // Remove any history after current index (dispose objects that will be lost)
    const removedHistory = editorState.history.slice(editorState.historyIndex + 1);
    removedHistory.forEach(historyAction => {
        // If this was a delete action that's being overwritten, dispose the object
        if (historyAction.type === 'delete' && historyAction.object) {
            disposeObject(historyAction.object);
        }
    });

    editorState.history = editorState.history.slice(0, editorState.historyIndex + 1);
    editorState.history.push(action);
    editorState.historyIndex++;

    // Limit history size (dispose oldest)
    if (editorState.history.length > editorState.maxHistory) {
        const oldestAction = editorState.history.shift();
        editorState.historyIndex--;

        // If oldest was a delete, dispose the object
        if (oldestAction.type === 'delete' && oldestAction.object) {
            disposeObject(oldestAction.object);
        }
    }
}

function undo() {
    if (editorState.historyIndex < 0) {
        showNotification('Nothing to undo', 'info');
        return;
    }

    const action = editorState.history[editorState.historyIndex];
    editorState.historyIndex--;

    switch (action.type) {
        case 'add':
            scene.remove(action.object);
            editorState.placedObjects = editorState.placedObjects.filter(obj => obj !== action.object);
            break;
        case 'delete':
            scene.add(action.object);
            editorState.placedObjects.push(action.object);
            break;
        case 'transform':
            action.object.position.copy(action.oldPosition);
            action.object.rotation.copy(action.oldRotation);
            action.object.scale.copy(action.oldScale);
            break;
    }

    updateInfo();
    showNotification('Undo', 'info');
}

function redo() {
    if (editorState.historyIndex >= editorState.history.length - 1) {
        showNotification('Nothing to redo', 'info');
        return;
    }

    editorState.historyIndex++;
    const action = editorState.history[editorState.historyIndex];

    switch (action.type) {
        case 'add':
            scene.add(action.object);
            editorState.placedObjects.push(action.object);
            break;
        case 'delete':
            scene.remove(action.object);
            editorState.placedObjects = editorState.placedObjects.filter(obj => obj !== action.object);
            break;
        case 'transform':
            action.object.position.copy(action.newPosition);
            action.object.rotation.copy(action.newRotation);
            action.object.scale.copy(action.newScale);
            break;
    }

    updateInfo();
    showNotification('Redo', 'info');
}

// ==================== TRANSFORM MODES ====================
function setTransformMode(mode) {
    editorState.transformMode = mode;
    transformControls.setMode(mode);

    // For spotlights and directional lights in rotate mode, attach to target instead
    if (mode === 'rotate' && editorState.selectedObject && editorState.selectedObject.userData.type === 'light') {
        const light = editorState.selectedObject;
        if ((light.userData.lightType === 'spot' || light.userData.lightType === 'directional') && light.target) {
            transformControls.detach();
            transformControls.attach(light.target);
            showNotification('Moving light target (where it points)', 'info');
            return;
        }
    } else if (editorState.selectedObject) {
        // Re-attach to the selected object if switching from rotate mode
        transformControls.detach();
        transformControls.attach(editorState.selectedObject);
    }

    // Update toolbar buttons
    document.querySelectorAll('#top-toolbar .toolbar-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const modeMap = {
        'translate': 'btn-move',
        'rotate': 'btn-rotate',
        'scale': 'btn-scale'
    };

    if (modeMap[mode]) {
        document.getElementById(modeMap[mode]).classList.add('active');
    }
}

// ==================== OBJECT SELECTION ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Selection outline helper
const selectionOutline = new THREE.BoxHelper();
selectionOutline.material.color.set(0x60a5fa);
selectionOutline.material.linewidth = 2;
selectionOutline.visible = false;
scene.add(selectionOutline);

function selectObject(object, addToSelection = false) {
    if (!object) return;

    // Multi-select mode
    if (addToSelection && editorState.selectedObjects.length > 0) {
        // Toggle selection
        const index = editorState.selectedObjects.indexOf(object);
        if (index > -1) {
            editorState.selectedObjects.splice(index, 1);
            removeSelectionOutline(object);
        } else {
            editorState.selectedObjects.push(object);
            addSelectionOutline(object);
        }
    } else {
        // Clear previous selection outlines
        clearAllSelectionOutlines();

        // Single select
        editorState.selectedObjects = [object];
        editorState.selectedObject = object;
        addSelectionOutline(object);
        transformControls.attach(object);
    }

    // Update primary selected object (for transform controls)
    if (editorState.selectedObjects.length > 0) {
        editorState.selectedObject = editorState.selectedObjects[0];
    }

    const panel = document.getElementById('properties-panel');
    if (panel) {
        if (editorState.selectedObjects.length === 1) {
            panel.classList.add('visible');
        } else if (editorState.selectedObjects.length > 1) {
            panel.classList.remove('visible'); // Hide for multi-select for now
        }
    }

    // Show light properties if a light is selected
    if (editorState.selectedObjects.length === 1 && object.userData.type === 'light') {
        showLightProperties(object);
    } else {
        // Hide light properties if not a light
        const lightProps = document.getElementById('light-properties');
        if (lightProps) lightProps.style.display = 'none';
        editorState.selectedLight = null;
    }

    updatePropertiesPanel();
    updateInfo();
}

function deselectObject() {
    clearAllSelectionOutlines();
    editorState.selectedObject = null;
    editorState.selectedObjects = [];
    transformControls.detach();

    const panel = document.getElementById('properties-panel');
    if (panel) panel.classList.remove('visible');

    updateInfo();
}

function addSelectionOutline(object) {
    // Visual feedback for selection
    if (object.userData.outlineHelper) return; // Already has outline

    // Lights already have visible helpers, so don't add box outline
    if (object.userData.type === 'light') return;

    const outline = new THREE.BoxHelper(object, 0x60a5fa);
    outline.material.linewidth = 2;
    scene.add(outline);
    object.userData.outlineHelper = outline;
}

function removeSelectionOutline(object) {
    if (object.userData.outlineHelper) {
        scene.remove(object.userData.outlineHelper);
        object.userData.outlineHelper.dispose();
        delete object.userData.outlineHelper;
    }
}

function clearAllSelectionOutlines() {
    editorState.placedObjects.forEach(obj => {
        removeSelectionOutline(obj);
    });
}

function updateSelectionOutlines() {
    // Update outline positions each frame
    editorState.selectedObjects.forEach(obj => {
        if (obj.userData.outlineHelper) {
            obj.userData.outlineHelper.update();
        }
    });
}

function updatePropertiesPanel() {
    if (!editorState.selectedObject) return;

    const obj = editorState.selectedObject;

    // Null checks for all property inputs
    const setPropValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    setPropValue('prop-pos-x', obj.position.x.toFixed(2));
    setPropValue('prop-pos-y', obj.position.y.toFixed(2));
    setPropValue('prop-pos-z', obj.position.z.toFixed(2));

    setPropValue('prop-rot-x', THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(0));
    setPropValue('prop-rot-y', THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(0));
    setPropValue('prop-rot-z', THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(0));

    setPropValue('prop-scale-x', obj.scale.x.toFixed(2));
    setPropValue('prop-scale-y', obj.scale.y.toFixed(2));
    setPropValue('prop-scale-z', obj.scale.z.toFixed(2));
}

// ==================== OBJECT PLACEMENT ====================
function placeObject(position) {
    if (!editorState.selectedFile || !editorState.selectedType) {
        showNotification('No object selected', 'error');
        return;
    }

    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('Invalid position:', position);
        return;
    }

    const path = editorState.selectedType === 'building'
        ? `assets/buildings/${editorState.selectedFile}`
        : `assets/props/${editorState.selectedFile}`;

    loader.load(
        path,
        (gltf) => {
            if (!gltf || !gltf.scene) {
                showNotification('Invalid model data', 'error');
                return;
            }

            const object = gltf.scene;

            // Snap to grid
            if (editorState.gridSnap) {
                position.x = snapToGrid(position.x, editorState.gridSize);
                position.z = snapToGrid(position.z, editorState.gridSize);
            }

            object.position.copy(position);

            // Random placement variations
            if (editorState.randomPlacement) {
                // Random Y rotation (0-360 degrees)
                object.rotation.y = Math.random() * Math.PI * 2;

                // Random scale variation (0.8 - 1.2)
                const scaleVariation = 0.8 + Math.random() * 0.4;
                object.scale.set(scaleVariation, scaleVariation, scaleVariation);
            } else {
                // Apply manual preview rotation (only when random placement is off)
                object.rotation.y = editorState.previewRotation;
            }

            object.castShadow = true;
            object.receiveShadow = true;
            object.userData = {
                type: editorState.selectedType,
                file: editorState.selectedFile
            };

            // Enable shadows for all meshes
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Apply wireframe if in wireframe mode
                    if (editorState.wireframeMode) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.wireframe = true);
                        } else {
                            child.material.wireframe = true;
                        }
                    }
                }
            });

            scene.add(object);
            editorState.placedObjects.push(object);

            // Broadcast to other editors
            broadcastObjectPlaced(object);

            // Add to recent items
            addToRecentItems(editorState.selectedType, editorState.selectedFile);

            // Add to history
            addToHistory({ type: 'add', object });

            showNotification(`Placed ${editorState.selectedFile}`, 'success');
            updateInfo();
        },
        undefined,
        (error) => {
            showNotification(`Error loading ${editorState.selectedFile}`, 'error');
            console.error('Model load error:', error);
        }
    );
}

// ==================== LIGHT PLACEMENT SYSTEM ====================
function placeLight(position) {
    console.log('[placeLight] Called - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);

    if (!editorState.selectedLightType) {
        showNotification('No light type selected', 'error');
        return;
    }

    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('Invalid position:', position);
        return;
    }

    let light, helper;
    const lightType = editorState.selectedLightType;

    // Create the appropriate light type
    if (lightType === 'point') {
        light = new THREE.PointLight(0xffffff, 1.0, 50);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.bias = 0;
        light.shadow.radius = 1;
        helper = new THREE.PointLightHelper(light, 1);
    } else if (lightType === 'spot') {
        light = new THREE.SpotLight(0xffffff, 1.0, 50, Math.PI / 4, 0.1);
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.bias = 0;
        light.shadow.radius = 1;
        // Point spotlight down by default
        light.target.position.set(position.x, position.y - 5, position.z);
        scene.add(light.target);
        helper = new THREE.SpotLightHelper(light);
    } else if (lightType === 'directional') {
        light = new THREE.DirectionalLight(0xffffff, 1.0);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.bias = 0;
        light.shadow.radius = 1;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 100;
        light.shadow.camera.left = -20;
        light.shadow.camera.right = 20;
        light.shadow.camera.top = 20;
        light.shadow.camera.bottom = -20;
        // Point directional light down by default
        light.target.position.set(position.x, position.y - 10, position.z);
        scene.add(light.target);
        helper = new THREE.DirectionalLightHelper(light, 2);
    }

    // Snap to grid if enabled
    if (editorState.gridSnap) {
        position.x = snapToGrid(position.x, editorState.gridSize);
        position.z = snapToGrid(position.z, editorState.gridSize);
    }

    light.position.copy(position);

    // Create a clickable sphere mesh for easier selection
    const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8,
        wireframe: false
    });
    const clickableSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    clickableSphere.userData.isLightHandle = true;
    clickableSphere.renderOrder = 999; // Render on top
    light.add(clickableSphere);

    light.userData = {
        type: 'light',
        lightType: lightType,
        helper: helper,
        clickableSphere: clickableSphere
    };

    scene.add(light);
    if (helper) {
        scene.add(helper);
    }

    editorState.placedLights.push(light);
    editorState.placedObjects.push(light); // Also add to placedObjects for selection

    // Add to history
    addToHistory({ type: 'add', object: light });

    showNotification(`Placed ${lightType} light`, 'success');
    updateInfo();

    console.log('[placeLight] Before clear - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);

    // Clear light selection and return to select mode
    editorState.selectedLightType = null;
    editorState.mode = 'select';

    console.log('[placeLight] After clear - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);

    // Clear selected light cards in UI
    const lightCards = document.querySelectorAll('[data-lighttype]');
    console.log('[placeLight] Clearing', lightCards.length, 'light cards');
    lightCards.forEach(card => {
        card.classList.remove('selected');
    });

    // Clear all item card selections
    document.querySelectorAll('.item-card').forEach(card => {
        card.classList.remove('selected');
    });

    console.log('[placeLight] Finished clearing selection');
}

function updateLightHelper(light) {
    if (!light || !light.userData.helper) return;

    const helper = light.userData.helper;

    // Update the helper (most helpers have an update method)
    if (helper.update) {
        helper.update();
    }

    // For color or property changes, we need to recreate the helper
    // This is only called when properties change from the UI, not during transform
    if (!isTransformDragging) {
        // Remove old helper
        scene.remove(helper);
        if (helper.dispose) helper.dispose();

        // Create new helper with updated light
        let newHelper;
        if (light.userData.lightType === 'point') {
            newHelper = new THREE.PointLightHelper(light, 1);
        } else if (light.userData.lightType === 'spot') {
            newHelper = new THREE.SpotLightHelper(light);
        } else if (light.userData.lightType === 'directional') {
            newHelper = new THREE.DirectionalLightHelper(light, 2);
        }

        if (newHelper) {
            light.userData.helper = newHelper;
            scene.add(newHelper);
        }
    }
}

// ==================== PARTICLE EMITTER PLACEMENT ====================
function placeParticleEmitter(position) {
    console.log('[placeParticleEmitter] Called - particleType:', editorState.selectedParticleType);

    if (!editorState.selectedParticleType) {
        showNotification('No particle type selected', 'error');
        return;
    }

    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('Invalid position:', position);
        return;
    }

    // Snap to grid if enabled
    if (editorState.gridSnap) {
        position.x = snapToGrid(position.x, editorState.gridSize);
        position.z = snapToGrid(position.z, editorState.gridSize);
    }

    // Get preset configuration for particle type
    const preset = particlePresets[editorState.selectedParticleType];
    if (!preset) {
        console.error('Unknown particle type:', editorState.selectedParticleType);
        return;
    }

    // Get custom properties from UI
    const color = parseInt(document.getElementById('particle-color').value.replace('#', '0x'));
    const count = parseInt(document.getElementById('particle-count').value);
    const size = parseFloat(document.getElementById('particle-size').value);
    const lifetime = parseFloat(document.getElementById('particle-lifetime').value);
    const velocity = parseFloat(document.getElementById('particle-velocity').value);
    const spread = parseFloat(document.getElementById('particle-spread').value);
    const loop = document.getElementById('particle-loop').checked;

    // Create particle system with mixed preset and custom properties
    const config = {
        particleType: editorState.selectedParticleType,
        color: color || preset.color,
        count: count || preset.count,
        size: size || preset.size,
        lifetime: lifetime || preset.lifetime,
        velocity: new THREE.Vector3(0, velocity || preset.velocity.y, 0),
        spread: spread || preset.spread,
        gravity: preset.gravity,
        emitInterval: preset.emitInterval,
        loop: loop
    };

    const particleSystem = new ParticleSystem(config);
    particleSystem.setPosition(position.x, position.y, position.z);

    // Store reference
    editorState.placedParticles.push(particleSystem);
    editorState.placedObjects.push(particleSystem.system); // Add system mesh to placedObjects for selection

    // Add to history
    addToHistory({ type: 'add', object: particleSystem.system });

    showNotification(`Placed ${editorState.selectedParticleType} particle emitter`, 'success');
    updateInfo();

    console.log('[placeParticleEmitter] Particle emitter placed at', position);
}

// ==================== PLAYER SPAWN POINT ====================
function createPlayerSpawn(position) {
    // Remove existing spawn point if it exists
    if (editorState.playerSpawn) {
        scene.remove(editorState.playerSpawn);
        disposeObject(editorState.playerSpawn);
        // Remove from placedObjects array
        const index = editorState.placedObjects.indexOf(editorState.playerSpawn);
        if (index > -1) {
            editorState.placedObjects.splice(index, 1);
        }
    }

    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('Invalid spawn position:', position);
        return;
    }

    // Snap to grid if enabled
    if (editorState.gridSnap) {
        position.x = snapToGrid(position.x, editorState.gridSize);
        position.z = snapToGrid(position.z, editorState.gridSize);
    }

    // Create spawn point visual group (compact size for indoor placement)
    const spawnGroup = new THREE.Group();

    // Base cylinder (platform)
    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.4,
        metalness: 0.5,
        roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    spawnGroup.add(base);

    // Center pole (cylinder showing height)
    const poleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.5
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 0.7;
    spawnGroup.add(pole);

    // Arrow/cone on top (shows forward direction)
    const arrowGeometry = new THREE.ConeGeometry(0.25, 0.6, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.3
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.y = 1.6; // Top of pole + half cone height
    arrow.rotation.x = Math.PI; // Point down initially, will point forward when group rotates
    spawnGroup.add(arrow);

    // Add a circular outline for better visibility
    const ringGeometry = new THREE.TorusGeometry(0.6, 0.04, 8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    spawnGroup.add(ring);

    // Position the spawn point
    spawnGroup.position.copy(position);

    // Store metadata
    spawnGroup.userData = {
        type: 'spawn',
        isSpawnPoint: true,
        name: 'Player Spawn'
    };

    // Add to scene
    scene.add(spawnGroup);

    // Store reference
    editorState.playerSpawn = spawnGroup;
    editorState.placedObjects.push(spawnGroup);

    // Add to history
    addToHistory({ type: 'add', object: spawnGroup });

    showNotification('Player spawn point placed', 'success');
    updateInfo();

    return spawnGroup;
}

// ==================== TEAM SPAWN POINTS ====================
function createTeamSpawn(position, team) {
    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('Invalid spawn position:', position);
        return;
    }

    // Snap to grid if enabled
    if (editorState.snapToGrid) {
        position.x = snapToGrid(position.x, editorState.gridSize);
        position.z = snapToGrid(position.z, editorState.gridSize);
    }

    // Create spawn point visual
    const spawnGroup = new THREE.Group();

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
    const teamColor = team === 'team1' ? 0xff4444 : 0x4444ff; // Red for team 1, Blue for team 2
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: teamColor,
        emissive: teamColor,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.5
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    spawnGroup.add(base);

    // Arrow pointing up
    const arrowGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({
        color: teamColor,
        emissive: teamColor,
        emissiveIntensity: 0.5
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.y = 0.6;
    spawnGroup.add(arrow);

    // Team number text helper
    const ringGeometry = new THREE.TorusGeometry(0.6, 0.04, 8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: teamColor,
        emissive: teamColor,
        emissiveIntensity: 0.7
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    spawnGroup.add(ring);

    // Position the spawn point
    spawnGroup.position.copy(position);

    // Store metadata
    spawnGroup.userData = {
        type: 'teamspawn',
        team: team,
        isTeamSpawn: true,
        name: team === 'team1' ? 'Team 1 Spawn' : 'Team 2 Spawn'
    };

    // Add to scene
    scene.add(spawnGroup);

    // Store reference
    if (team === 'team1') {
        editorState.team1Spawns.push(spawnGroup);
    } else {
        editorState.team2Spawns.push(spawnGroup);
    }
    editorState.placedObjects.push(spawnGroup);

    // Add to history
    addToHistory({ type: 'add', object: spawnGroup });

    showNotification(`${team === 'team1' ? 'Team 1' : 'Team 2'} spawn point placed`, 'success');
    updateInfo();

    return spawnGroup;
}

// ==================== GHOST PREVIEW SYSTEM ====================
function createPreviewObject() {
    // Remove existing preview first
    removePreviewObject();

    if (!editorState.selectedFile || !editorState.selectedType) {
        return;
    }

    const path = editorState.selectedType === 'building'
        ? `assets/buildings/${editorState.selectedFile}`
        : `assets/props/${editorState.selectedFile}`;

    loader.load(
        path,
        (gltf) => {
            if (!gltf || !gltf.scene) return;

            // Use the scene directly (not cloned) for preview
            // Cloning breaks SkinnedMesh/skeleton references
            const preview = gltf.scene;

            // Make it semi-transparent with a green tint
            let meshCount = 0;
            preview.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) {
                    meshCount++;
                    // Clone material to avoid affecting original
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(mat => {
                            const clonedMat = mat.clone();
                            clonedMat.transparent = true;
                            clonedMat.opacity = 0.6;
                            clonedMat.depthWrite = false;
                            clonedMat.emissive = new THREE.Color(0x00ff00);
                            clonedMat.emissiveIntensity = 0.3;
                            return clonedMat;
                        });
                    } else if (child.material) {
                        const clonedMat = child.material.clone();
                        clonedMat.transparent = true;
                        clonedMat.opacity = 0.6;
                        clonedMat.depthWrite = false;
                        clonedMat.emissive = new THREE.Color(0x00ff00);
                        clonedMat.emissiveIntensity = 0.3;
                        child.material = clonedMat;
                    }
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.visible = true;
                }
            });

            preview.userData.isPreview = true;
            preview.userData.modelPath = path; // Store path for broadcasting

            // Calculate Y offset ONCE when preview is created
            const bbox = new THREE.Box3().setFromObject(preview);
            preview.userData.yOffset = -bbox.min.y; // Store for reuse

            editorState.previewObject = preview;
            scene.add(preview);

            // Position at last known mouse position if available
            if (editorState.lastMousePosition) {
                updatePreviewPosition(editorState.lastMousePosition);
            } else {
                // Start at camera position with Y offset
                const yOffset = preview.userData.yOffset || 0;
                preview.position.set(camera.position.x, yOffset, camera.position.z);
            }

            // Update info to show rotation indicator
            updateInfo();
        },
        undefined,
        (error) => {
            console.error('Preview load error:', error);
        }
    );
}

function removePreviewObject() {
    if (editorState.previewObject) {
        scene.remove(editorState.previewObject);
        disposeObject(editorState.previewObject);
        editorState.previewObject = null;
        // Broadcast preview clear to other editors
        broadcastPreviewClear();
    }
    // Reset preview rotation when removing preview
    editorState.previewRotation = 0;
}

function rotatePreview(degrees) {
    if (!editorState.previewObject) return;

    // Convert degrees to radians and add to current rotation
    const radians = degrees * (Math.PI / 180);
    editorState.previewRotation += radians;

    // Apply rotation to preview object
    editorState.previewObject.rotation.y = editorState.previewRotation;

    // Update info display
    updateInfo();

    // Show notification with current rotation in degrees
    const currentDegrees = Math.round((editorState.previewRotation * 180 / Math.PI) % 360);
    showNotification(`Preview rotation: ${currentDegrees}°`, 'info');
}

function updatePreviewPosition(intersectionPoint) {
    if (!editorState.previewObject || !intersectionPoint) return;

    let position = intersectionPoint.clone();

    // Snap to grid
    if (editorState.gridSnap) {
        position.x = snapToGrid(position.x, editorState.gridSize);
        position.z = snapToGrid(position.z, editorState.gridSize);
    }

    // Use stored Y offset (calculated once when preview was created)
    // This ensures the bottom of the object sits on the ground
    const yOffset = editorState.previewObject.userData.yOffset || 0;
    position.y += yOffset;

    editorState.previewObject.position.copy(position);
    editorState.previewObject.updateMatrixWorld(true); // Force matrix update
    editorState.previewObject.visible = true;

    // Apply random placement preview if enabled
    if (editorState.randomPlacement && !editorState.previewObject.userData.randomApplied) {
        editorState.previewObject.rotation.y = Math.random() * Math.PI * 2;
        const scaleVariation = 0.8 + Math.random() * 0.4;
        editorState.previewObject.scale.set(scaleVariation, scaleVariation, scaleVariation);
        editorState.previewObject.userData.randomApplied = true;
    } else if (!editorState.randomPlacement) {
        // Apply manual preview rotation (only when random placement is off)
        editorState.previewObject.rotation.y = editorState.previewRotation;
    }

    // Broadcast preview update to other editors
    if (editorState.previewObject.userData.modelPath) {
        broadcastPreviewUpdate(
            editorState.previewObject.userData.modelPath,
            editorState.previewObject.position,
            editorState.previewObject.rotation,
            editorState.previewObject.scale
        );
    }
}

function deleteSelectedObject() {
    if (editorState.selectedObjects.length === 0) return;

    const objectsToDelete = [...editorState.selectedObjects];

    // Save state for undo BEFORE deleting
    objectsToDelete.forEach(obj => {
        addToHistory({ type: 'delete', object: obj });
        scene.remove(obj);
        removeSelectionOutline(obj);
        editorState.placedObjects = editorState.placedObjects.filter(o => o !== obj);

        // Broadcast deletion to other editors
        broadcastObjectDeleted(obj);
    });

    deselectObject();

    // Note: Don't dispose here - undo might need to restore it
    // Only dispose when history is cleared or overwritten

    const count = objectsToDelete.length;
    showNotification(`Deleted ${count} object${count > 1 ? 's' : ''}`, 'success');
    updateInfo();
}

// ==================== MOUSE EVENTS ====================
// Mouse move for preview
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Raycast against both ground and all placed objects for collision detection
    const objectsToCheck = [ground, ...editorState.placedObjects];
    const intersects = raycaster.intersectObjects(objectsToCheck, true);

    if (intersects.length > 0) {
        // Use the first intersection (closest to camera)
        const intersectionPoint = intersects[0].point;

        // Store last mouse position for preview
        editorState.lastMousePosition = intersectionPoint;

        // Update preview if in place mode and preview exists
        if (editorState.mode === 'place' && editorState.previewObject) {
            updatePreviewPosition(intersectionPoint);
        }
    }
});

// Track mouse down position to detect drags vs clicks
let mouseDownPos = null;
let mouseUpPos = null;

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseDownPos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
});

canvas.addEventListener('mouseup', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseUpPos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
});

// Right-click anywhere to deselect content browser selection
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    // Check if this was a drag (camera pan) or a click (deselect)
    if (mouseDownPos && mouseUpPos) {
        const dx = mouseUpPos.x - mouseDownPos.x;
        const dy = mouseUpPos.y - mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If mouse moved more than 5 pixels, it was a drag, don't deselect
        if (distance > 5) {
            return;
        }
    }

    // If in place mode, deselect the content browser item
    if (editorState.mode === 'place') {
        editorState.mode = 'select';
        editorState.selectedType = null;
        editorState.selectedFile = null;
        removePreviewObject();
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
        showNotification('Deselected', 'info');
        updateInfo();
    }
});

canvas.addEventListener('click', (event) => {
    console.log('[Canvas Click] mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType, 'selectedFile:', editorState.selectedFile);

    // Skip if in paint mode
    if (editorState.paintMode) return;

    // Check if this was a drag (camera rotate) or a click (place object)
    if (mouseDownPos && mouseUpPos) {
        const dx = mouseUpPos.x - mouseDownPos.x;
        const dy = mouseUpPos.y - mouseDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If mouse moved more than 5 pixels, it was a drag, not a click
        if (distance > 5) {
            return; // Don't place object
        }
    }
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    if (editorState.mode === 'spawn') {
        // Place player spawn - raycast against ground AND all placed objects (buildings, props, etc.)
        const objectsToCheck = [ground, ...editorState.placedObjects];
        const intersects = raycaster.intersectObjects(objectsToCheck, true);
        if (intersects.length > 0) {
            createPlayerSpawn(intersects[0].point);
            editorState.mode = 'select'; // Return to select mode after placing
        }
    } else if (editorState.mode === 'place' && editorState.selectedLightType) {
        // Place light - raycast against both ground and all placed objects
        console.log('[Click Handler] In light placement block - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);
        const objectsToCheck = [ground, ...editorState.placedObjects];
        const intersects = raycaster.intersectObjects(objectsToCheck, true);
        if (intersects.length > 0) {
            placeLight(intersects[0].point);
        }
        console.log('[Click Handler] After placeLight - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);
    } else if (editorState.mode === 'place-particle' && editorState.selectedParticleType) {
        // Place particle emitter - raycast against both ground and all placed objects
        console.log('[Click Handler] In particle placement block - particleType:', editorState.selectedParticleType);
        const objectsToCheck = [ground, ...editorState.placedObjects];
        const intersects = raycaster.intersectObjects(objectsToCheck, true);
        if (intersects.length > 0) {
            placeParticleEmitter(intersects[0].point);
        }
        console.log('[Click Handler] After placeParticleEmitter');
    } else if (editorState.mode === 'place' && editorState.selectedSpawnType) {
        // Place team spawn - raycast against both ground and all placed objects
        console.log('[Click Handler] In spawn placement block - spawnType:', editorState.selectedSpawnType);
        const objectsToCheck = [ground, ...editorState.placedObjects];
        const intersects = raycaster.intersectObjects(objectsToCheck, true);
        if (intersects.length > 0) {
            createTeamSpawn(intersects[0].point, editorState.selectedSpawnType);
            // Clear selection and return to select mode
            editorState.selectedSpawnType = null;
            editorState.mode = 'select';
            document.querySelectorAll('.item-card').forEach(card => card.classList.remove('selected'));
        }
        console.log('[Click Handler] After createTeamSpawn');
    } else if (editorState.mode === 'place' && editorState.selectedFile) {
        // Place object - raycast against both ground and all placed objects
        const objectsToCheck = [ground, ...editorState.placedObjects];
        const intersects = raycaster.intersectObjects(objectsToCheck, true);
        if (intersects.length > 0) {
            placeObject(intersects[0].point);

            // Reset preview random flag for next placement
            if (editorState.previewObject) {
                editorState.previewObject.userData.randomApplied = false;
            }
        }
    } else if (editorState.mode === 'select') {
        // Check for multi-select modifiers
        const isMultiSelect = event.shiftKey || event.ctrlKey;

        // Select object - raycast against all scene children (includes helpers)
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            // Find the first valid intersection (skip light handles if clicking on actual objects)
            let targetObject = null;
            let foundLight = null;

            for (const intersection of intersects) {
                const obj = intersection.object;

                // Check if we hit a light handle/sphere
                if (obj.userData.isLightHandle) {
                    // Find the light that owns this sphere
                    let parentLight = obj.parent;
                    while (parentLight && !editorState.placedLights.includes(parentLight)) {
                        parentLight = parentLight.parent;
                    }
                    if (parentLight) {
                        foundLight = parentLight;
                    }
                    // Continue checking other intersections to see if there's an object behind the sphere
                    continue;
                }

                // Check if we hit a light helper
                for (const light of editorState.placedLights) {
                    if (light.userData.helper &&
                        (obj === light.userData.helper ||
                         light.userData.helper.children.includes(obj) ||
                         obj.parent === light.userData.helper)) {
                        foundLight = light;
                        break;
                    }
                }
                if (foundLight) continue;

                // Find the top-level object from placedObjects
                targetObject = obj;
                while (targetObject.parent && !editorState.placedObjects.includes(targetObject)) {
                    targetObject = targetObject.parent;
                }

                // Check if this is a valid selectable object
                if (editorState.placedObjects.includes(targetObject)) {
                    break; // Found a valid object, use this
                }
                targetObject = null;
            }

            // Select the found object or light
            if (targetObject && editorState.placedObjects.includes(targetObject)) {
                selectObject(targetObject, isMultiSelect);
            } else if (foundLight) {
                selectObject(foundLight, isMultiSelect);
            } else if (!isMultiSelect) {
                deselectObject();
            }
        } else {
            if (!isMultiSelect) {
                deselectObject();
            }
        }
    }
});

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (event) => {
    // Ignore if typing in input
    if (event.target.tagName === 'INPUT') return;

    // Transform modes
    if (event.key === 'w' || event.key === 'W') {
        setTransformMode('translate');
    } else if (event.key === 'e' || event.key === 'E') {
        setTransformMode('rotate');
    } else if (event.key === 'r' || event.key === 'R') {
        setTransformMode('scale');
    } else if (event.key === 'v' || event.key === 'V') {
        editorState.mode = 'select';
        removePreviewObject();
        document.getElementById('btn-select').classList.add('active');
    } else if (event.key === 'y' || event.key === 'Y') {
        if (!event.ctrlKey) {
            // Y key for spawn placement (Ctrl+Y is redo)
            editorState.mode = 'spawn';
            editorState.selectedType = null;
            editorState.selectedFile = null;
            showNotification('Click on ground to place player spawn point', 'info');
        }
    }

    // Delete
    if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedObject();
    }

    // Undo/Redo
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
    }
    if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
    }

    // Save
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        exportLevel(); // Use exportLevel for full save with all settings
    }

    // Copy/Paste/Duplicate
    if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        copySelectedObjects();
    }
    if (event.ctrlKey && event.key === 'v') {
        event.preventDefault();
        pasteObjects();
    }
    if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        duplicateSelectedObjects();
    }

    // Camera Bookmarks - Save (F1-F4)
    if (event.key === 'F1') {
        event.preventDefault();
        saveCameraBookmark(0);
    }
    if (event.key === 'F2') {
        event.preventDefault();
        saveCameraBookmark(1);
    }
    if (event.key === 'F3') {
        event.preventDefault();
        saveCameraBookmark(2);
    }
    if (event.key === 'F4') {
        event.preventDefault();
        saveCameraBookmark(3);
    }

    // Camera Bookmarks - Recall (1-4)
    if (event.key === '1' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        recallCameraBookmark(0);
    }
    if (event.key === '2' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        recallCameraBookmark(1);
    }
    if (event.key === '3' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        recallCameraBookmark(2);
    }
    if (event.key === '4' && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        recallCameraBookmark(3);
    }

    // Help Menu
    if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        showHelpMenu();
    }

    // Toggle post-processing
    if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        togglePostProcessing(!postProcessing.enabled);
    }

    // Toggle grid
    if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        gridHelper.visible = !gridHelper.visible;
        showNotification(`Grid ${gridHelper.visible ? 'visible' : 'hidden'}`, 'info');
    }

    // Toggle statistics
    if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        toggleStats();
    }

    // Focus on selected
    if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        focusOnSelected();
    }

    // Toggle wireframe
    if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        toggleWireframe();
    }

    // Toggle random placement
    if (event.key === 't' || event.key === 'T') {
        event.preventDefault();
        toggleRandomPlacement();
    }

    // Align to ground
    if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        alignToGround();
    }

    // Toggle visibility
    if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        toggleSelectedVisibility();
    }

    // Isolation mode
    if (event.key === 'o' || event.key === 'O') {
        event.preventDefault();
        toggleIsolationMode();
    }

    // Paint mode
    if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        togglePaintMode();
    }

    // Rotation snap toggle/cycle
    if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault();
        cycleRotationSnap();
    }

    // Hotbar - Assign (Shift+5-9)
    if (event.shiftKey && event.key >= '5' && event.key <= '9') {
        event.preventDefault();
        const slot = parseInt(event.key) - 5;
        assignToHotbar(slot);
    }

    // Hotbar - Use (5-9 without modifiers)
    if (!event.shiftKey && !event.ctrlKey && event.key >= '5' && event.key <= '9') {
        event.preventDefault();
        const slot = parseInt(event.key) - 5;
        placeFromHotbar(slot);
    }

    // Object replace
    if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        replaceSelectedObjects();
    }

    // Grouping
    if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        createGroup();
    }

    // Ungrouping
    if (event.ctrlKey && event.shiftKey && event.key === 'g') {
        event.preventDefault();
        ungroupSelected();
    }

    // Gizmo size adjustment
    if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        adjustGizmoSize(0.2);
    }
    if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        adjustGizmoSize(-0.2);
    }

    // Mass rotate (Ctrl+Arrow keys)
    if (event.ctrlKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        massRotate('y', -15);
    }
    if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault();
        massRotate('y', 15);
    }
    if (event.ctrlKey && event.key === 'ArrowUp') {
        event.preventDefault();
        massRotate('x', -15);
    }
    if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        massRotate('x', 15);
    }

    // Mass scale
    if (event.key === 'Period' || event.key === '>') {
        event.preventDefault();
        massScale(1.1);
    }
    if (event.key === 'Comma' || event.key === '<') {
        event.preventDefault();
        massScale(0.9);
    }

    // Preview rotation (Left/Right arrows in place mode, without Ctrl)
    if (!event.ctrlKey && event.key === 'ArrowLeft' && editorState.mode === 'place' && editorState.previewObject) {
        event.preventDefault();
        rotatePreview(-15);
    }
    if (!event.ctrlKey && event.key === 'ArrowRight' && editorState.mode === 'place' && editorState.previewObject) {
        event.preventDefault();
        rotatePreview(15);
    }

    // Escape - deselect or exit isolation or cancel placement or exit paint mode
    if (event.key === 'Escape') {
        if (editorState.paintMode) {
            togglePaintMode();
        } else if (editorState.isolationMode) {
            toggleIsolationMode();
        } else if (editorState.mode === 'place') {
            editorState.mode = 'select';
            editorState.selectedType = null;
            editorState.selectedFile = null;
            removePreviewObject();
            document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
            showNotification('Cancelled placement', 'info');
            updateInfo();
        } else {
            deselectObject();
        }
    }
});

// ==================== TOOLBAR BUTTONS ====================
document.getElementById('btn-select').addEventListener('click', () => {
    editorState.mode = 'select';
    removePreviewObject();
    updateInfo();
});

document.getElementById('btn-move').addEventListener('click', () => {
    setTransformMode('translate');
});

document.getElementById('btn-rotate').addEventListener('click', () => {
    setTransformMode('rotate');
});

document.getElementById('btn-scale').addEventListener('click', () => {
    setTransformMode('scale');
});

document.getElementById('btn-paint').addEventListener('click', () => {
    togglePaintMode();
});

document.getElementById('btn-spawn').addEventListener('click', () => {
    // Enable spawn placement mode
    editorState.mode = 'spawn';
    editorState.selectedType = null;
    editorState.selectedFile = null;
    showNotification('Click on ground to place player spawn point', 'info');
});

document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);
document.getElementById('btn-delete').addEventListener('click', deleteSelectedObject);

document.getElementById('btn-save').addEventListener('click', () => {
    exportLevel(); // Use exportLevel for full save with all settings
});

document.getElementById('btn-load').addEventListener('click', () => {
    loadLevel();
});

document.getElementById('btn-settings').addEventListener('click', () => {
    showSettingsPanel();
});

// ==================== SAVE/LOAD ====================
function saveLevel() {
    // Get splatmap data as base64
    const splatmap1Data = splatmapCanvas1.toDataURL('image/png');
    const splatmap2Data = splatmapCanvas2.toDataURL('image/png');

    const levelData = {
        version: '1.0',
        objects: editorState.placedObjects.map(obj => ({
            type: obj.userData.type,
            file: obj.userData.file,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            visible: obj.visible
        })),
        terrain: {
            splatmap1: splatmap1Data,
            splatmap2: splatmap2Data,
            size: groundSize,
            groundTexture: currentGroundTexture // Save selected ground texture
        },
        groups: editorState.groups || [],
        playerSpawn: editorState.playerSpawn ? {
            position: {
                x: editorState.playerSpawn.position.x,
                y: editorState.playerSpawn.position.y,
                z: editorState.playerSpawn.position.z
            },
            rotation: {
                x: editorState.playerSpawn.rotation.x,
                y: editorState.playerSpawn.rotation.y,
                z: editorState.playerSpawn.rotation.z
            }
        } : null,
        teamSpawns: {
            team1: editorState.team1Spawns.map(spawn => ({
                position: {
                    x: spawn.position.x,
                    y: spawn.position.y,
                    z: spawn.position.z
                }
            })),
            team2: editorState.team2Spawns.map(spawn => ({
                position: {
                    x: spawn.position.x,
                    y: spawn.position.y,
                    z: spawn.position.z
                }
            }))
        }
    };

    const json = JSON.stringify(levelData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'level_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Level saved with terrain data!', 'success');
}

// ===== JSON VALIDATION SYSTEM =====
const CURRENT_LEVEL_VERSION = '1.0';
const SUPPORTED_VERSIONS = ['1.0'];

function validateLevelData(levelData, filename = 'level file') {
    const errors = [];
    const warnings = [];

    // Check if data exists
    if (!levelData || typeof levelData !== 'object') {
        errors.push(`${filename}: File is empty or not a valid JSON object`);
        return { valid: false, errors, warnings };
    }

    // Check version
    if (!levelData.version) {
        warnings.push(`${filename}: No version found, assuming legacy format`);
    } else if (!SUPPORTED_VERSIONS.includes(levelData.version)) {
        warnings.push(`${filename}: Version ${levelData.version} may not be fully compatible. Current version: ${CURRENT_LEVEL_VERSION}`);
    }

    // Validate required fields
    if (!levelData.objects) {
        errors.push(`${filename}: Missing 'objects' field`);
    } else if (!Array.isArray(levelData.objects)) {
        errors.push(`${filename}: 'objects' must be an array`);
    }

    // Validate objects array
    if (levelData.objects && Array.isArray(levelData.objects)) {
        levelData.objects.forEach((obj, index) => {
            if (!obj.type) {
                warnings.push(`${filename}: Object at index ${index} missing 'type'`);
            }
            if (!obj.file) {
                warnings.push(`${filename}: Object at index ${index} missing 'file'`);
            }
            if (!obj.position || typeof obj.position.x !== 'number' || typeof obj.position.y !== 'number' || typeof obj.position.z !== 'number') {
                warnings.push(`${filename}: Object at index ${index} has invalid position data`);
            }
        });
    }

    // Validate optional fields
    if (levelData.lights && !Array.isArray(levelData.lights)) {
        warnings.push(`${filename}: 'lights' should be an array`);
    }

    if (levelData.particles && !Array.isArray(levelData.particles)) {
        warnings.push(`${filename}: 'particles' should be an array`);
    }

    if (levelData.terrain && typeof levelData.terrain !== 'object') {
        warnings.push(`${filename}: 'terrain' should be an object`);
    }

    if (levelData.environment && typeof levelData.environment !== 'object') {
        warnings.push(`${filename}: 'environment' should be an object`);
    }

    // Validate terrain data if present
    if (levelData.terrain) {
        if (levelData.terrain.size && typeof levelData.terrain.size !== 'number') {
            warnings.push(`${filename}: terrain.size should be a number`);
        }
        if (levelData.terrain.groundTexture && typeof levelData.terrain.groundTexture !== 'string') {
            warnings.push(`${filename}: terrain.groundTexture should be a string`);
        }
    }

    const valid = errors.length === 0;

    // Log results
    if (errors.length > 0) {
        console.error(`[Validation] Errors in ${filename}:`, errors);
    }
    if (warnings.length > 0) {
        console.warn(`[Validation] Warnings in ${filename}:`, warnings);
    }
    if (valid && errors.length === 0 && warnings.length === 0) {
        console.log(`[Validation] ${filename} passed all checks`);
    }

    return { valid, errors, warnings, data: levelData };
}

async function loadLevel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsedData = JSON.parse(event.target.result);

                // Validate level data with comprehensive checks
                const validation = validateLevelData(parsedData, file.name);

                if (!validation.valid) {
                    throw new Error(`Invalid level file: ${validation.errors.join(', ')}`);
                }

                // Show warnings to user if any
                if (validation.warnings.length > 0) {
                    showNotification(`Loading with warnings: ${validation.warnings[0]}`, 'warning');
                }

                const levelData = validation.data;
                showNotification(`Loading ${levelData.objects.length} objects...`, 'info');

                // Clear existing objects with proper cleanup
                cleanupScene();

                // Clear history when loading new level
                editorState.history = [];
                editorState.historyIndex = -1;

                // Load all objects with Promise.all to handle race condition
                const loadPromises = levelData.objects.map(objData => {
                    return new Promise((resolve, reject) => {
                        // Validate object data
                        if (!objData.type || !objData.file || !objData.position) {
                            console.warn('Skipping invalid object:', objData);
                            resolve(null);
                            return;
                        }

                        const path = objData.type === 'building'
                            ? `assets/buildings/${objData.file}`
                            : `assets/props/${objData.file}`;

                        loader.load(
                            path,
                            (gltf) => {
                                const object = gltf.scene;
                                object.position.set(
                                    objData.position.x ?? 0,
                                    objData.position.y ?? 0,
                                    objData.position.z ?? 0
                                );
                                object.rotation.set(
                                    objData.rotation?.x ?? 0,
                                    objData.rotation?.y ?? 0,
                                    objData.rotation?.z ?? 0
                                );
                                object.scale.set(
                                    objData.scale?.x ?? 1,
                                    objData.scale?.y ?? 1,
                                    objData.scale?.z ?? 1
                                );
                                object.userData = {
                                    type: objData.type,
                                    file: objData.file
                                };

                                object.traverse((child) => {
                                    if (child.isMesh) {
                                        child.castShadow = true;
                                        child.receiveShadow = true;
                                    }
                                });

                                scene.add(object);
                                editorState.placedObjects.push(object);
                                resolve(object);
                            },
                            undefined,
                            (error) => {
                                console.error(`Failed to load ${objData.file}:`, error);
                                showNotification(`Failed to load ${objData.file}`, 'error');
                                resolve(null); // Don't reject, just skip this object
                            }
                        );
                    });
                });

                // Wait for all objects to load
                await Promise.all(loadPromises);

                // Restore lights if they exist
                if (levelData.lights && Array.isArray(levelData.lights)) {
                    levelData.lights.forEach(lightData => {
                        let light, helper;

                        // Create light based on type
                        if (lightData.lightType === 'point') {
                            light = new THREE.PointLight(lightData.color, lightData.intensity, lightData.distance);
                            light.castShadow = lightData.castShadow;
                            light.shadow.mapSize.width = 512;
                            light.shadow.mapSize.height = 512;
                            light.shadow.bias = 0;
                            light.shadow.radius = 1;
                            helper = new THREE.PointLightHelper(light, 1);
                        } else if (lightData.lightType === 'spot') {
                            light = new THREE.SpotLight(lightData.color, lightData.intensity, lightData.distance, lightData.angle, lightData.penumbra);
                            light.castShadow = lightData.castShadow;
                            light.shadow.mapSize.width = 512;
                            light.shadow.mapSize.height = 512;
                            light.shadow.bias = 0;
                            light.shadow.radius = 1;
                            if (lightData.targetPosition) {
                                light.target.position.set(
                                    lightData.targetPosition.x,
                                    lightData.targetPosition.y,
                                    lightData.targetPosition.z
                                );
                                scene.add(light.target);
                            }
                            helper = new THREE.SpotLightHelper(light);
                        } else if (lightData.lightType === 'directional') {
                            light = new THREE.DirectionalLight(lightData.color, lightData.intensity);
                            light.castShadow = lightData.castShadow;
                            light.shadow.mapSize.width = 1024;
                            light.shadow.mapSize.height = 1024;
                            light.shadow.bias = 0;
                            light.shadow.radius = 1;
                            light.shadow.camera.near = 0.5;
                            light.shadow.camera.far = 100;
                            light.shadow.camera.left = -20;
                            light.shadow.camera.right = 20;
                            light.shadow.camera.top = 20;
                            light.shadow.camera.bottom = -20;
                            if (lightData.targetPosition) {
                                light.target.position.set(
                                    lightData.targetPosition.x,
                                    lightData.targetPosition.y,
                                    lightData.targetPosition.z
                                );
                                scene.add(light.target);
                            }
                            helper = new THREE.DirectionalLightHelper(light, 2);
                        }

                        if (light) {
                            light.position.set(lightData.position.x, lightData.position.y, lightData.position.z);

                            // Create clickable sphere for easier selection
                            const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                            const sphereMaterial = new THREE.MeshBasicMaterial({
                                color: 0xffff00,
                                transparent: true,
                                opacity: 0.8,
                                wireframe: false
                            });
                            const clickableSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                            clickableSphere.userData.isLightHandle = true;
                            clickableSphere.renderOrder = 999; // Render on top
                            light.add(clickableSphere);

                            light.userData = {
                                type: 'light',
                                lightType: lightData.lightType,
                                helper: helper,
                                clickableSphere: clickableSphere
                            };

                            scene.add(light);
                            if (helper) {
                                scene.add(helper);
                            }

                            editorState.placedLights.push(light);
                            editorState.placedObjects.push(light);
                        }
                    });
                }

                // Load particle emitters
                if (levelData.particles && Array.isArray(levelData.particles)) {
                    levelData.particles.forEach(particleData => {
                        if (!particleData.particleType || !particleData.position) {
                            console.warn('Skipping invalid particle data:', particleData);
                            return;
                        }

                        const config = {
                            particleType: particleData.particleType,
                            ...particleData.config
                        };

                        // Convert velocity object back to Vector3
                        if (config.velocity && !config.velocity.isVector3) {
                            config.velocity = new THREE.Vector3(
                                config.velocity.x || 0,
                                config.velocity.y || 0,
                                config.velocity.z || 0
                            );
                        }

                        const particleSystem = new ParticleSystem(config);
                        particleSystem.setPosition(
                            particleData.position.x,
                            particleData.position.y,
                            particleData.position.z
                        );

                        editorState.placedParticles.push(particleSystem);
                        editorState.placedObjects.push(particleSystem.system);
                    });
                }

                // Restore player spawn if it exists
                if (levelData.playerSpawn) {
                    const spawnPos = new THREE.Vector3(
                        levelData.playerSpawn.position.x,
                        levelData.playerSpawn.position.y,
                        levelData.playerSpawn.position.z
                    );
                    createPlayerSpawn(spawnPos);

                    // Apply saved rotation
                    if (editorState.playerSpawn && levelData.playerSpawn.rotation) {
                        editorState.playerSpawn.rotation.set(
                            levelData.playerSpawn.rotation.x,
                            levelData.playerSpawn.rotation.y,
                            levelData.playerSpawn.rotation.z
                        );
                    }
                }

                // Load team spawns
                if (levelData.teamSpawns) {
                    if (levelData.teamSpawns.team1) {
                        levelData.teamSpawns.team1.forEach(spawnData => {
                            const pos = new THREE.Vector3(spawnData.position.x, spawnData.position.y, spawnData.position.z);
                            createTeamSpawn(pos, 'team1');
                        });
                    }
                    if (levelData.teamSpawns.team2) {
                        levelData.teamSpawns.team2.forEach(spawnData => {
                            const pos = new THREE.Vector3(spawnData.position.x, spawnData.position.y, spawnData.position.z);
                            createTeamSpawn(pos, 'team2');
                        });
                    }
                }

                updateInfo();
                showNotification(`Level loaded! ${editorState.placedObjects.length} objects, ${editorState.placedLights.length} lights, ${editorState.placedParticles.length} particle emitters`, 'success');

            } catch (error) {
                showNotification('Error loading level: ' + error.message, 'error');
                console.error('Level load error:', error);
            }
        };

        reader.onerror = () => {
            showNotification('Error reading file', 'error');
        };

        reader.readAsText(file);
    };
    input.click();
}

function exportLevel() {
    // Get splatmap data as base64
    const splatmap1Data = splatmapCanvas1.toDataURL('image/png');
    const splatmap2Data = splatmapCanvas2.toDataURL('image/png');

    // Separate lights and particles from regular objects
    const regularObjects = editorState.placedObjects.filter(obj =>
        obj.userData.type !== 'light' && !obj.userData.isParticleEmitter
    );

    const levelData = {
        version: '1.0',
        objects: regularObjects.map(obj => ({
            type: obj.userData.type,
            file: obj.userData.file,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            visible: obj.visible
        })),
        lights: editorState.placedLights.map(light => ({
            lightType: light.userData.lightType,
            position: { x: light.position.x, y: light.position.y, z: light.position.z },
            color: '#' + light.color.getHexString(),
            intensity: light.intensity,
            distance: light.distance || 0,
            angle: light.angle || 0,
            penumbra: light.penumbra || 0,
            castShadow: light.castShadow,
            targetPosition: light.target ? { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z } : null
        })),
        particles: editorState.placedParticles.map(particleSystem => ({
            particleType: particleSystem.particleType,
            position: {
                x: particleSystem.system.position.x,
                y: particleSystem.system.position.y,
                z: particleSystem.system.position.z
            },
            config: {
                color: particleSystem.color,
                count: particleSystem.particleCount,
                size: particleSystem.size,
                lifetime: particleSystem.lifetime,
                velocity: { x: particleSystem.velocity.x, y: particleSystem.velocity.y, z: particleSystem.velocity.z },
                spread: particleSystem.spread,
                gravity: particleSystem.gravity,
                emitInterval: particleSystem.emitInterval,
                loop: particleSystem.loop
            }
        })),
        terrain: {
            splatmap1: splatmap1Data,
            splatmap2: splatmap2Data,
            size: groundSize,
            groundTexture: currentGroundTexture // Save selected ground texture
        },
        environment: {
            skybox: currentSkybox,
            sunAltitude: sunAltitude,
            sunAzimuth: sunAzimuth,
            fogDistance: fogDistance,
            cloudSettings: cloudSettings
        },
        groups: editorState.groups || [],
        playerSpawn: editorState.playerSpawn ? {
            position: {
                x: editorState.playerSpawn.position.x,
                y: editorState.playerSpawn.position.y,
                z: editorState.playerSpawn.position.z
            },
            rotation: {
                x: editorState.playerSpawn.rotation.x,
                y: editorState.playerSpawn.rotation.y,
                z: editorState.playerSpawn.rotation.z
            }
        } : null,
        teamSpawns: {
            team1: editorState.team1Spawns.map(spawn => ({
                position: {
                    x: spawn.position.x,
                    y: spawn.position.y,
                    z: spawn.position.z
                }
            })),
            team2: editorState.team2Spawns.map(spawn => ({
                position: {
                    x: spawn.position.x,
                    y: spawn.position.y,
                    z: spawn.position.z
                }
            }))
        }
    };

    const json = JSON.stringify(levelData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'level_' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Level saved with all settings!', 'success');
}

// ==================== DRAWER ====================
const sidebarTabs = document.querySelectorAll('.sidebar-tab');
const tabPages = document.querySelectorAll('.tab-page');
const drawerTitleIcon = document.getElementById('drawer-title-icon');
const drawerTitleText = document.getElementById('drawer-title-text');

// Tab title mapping
const tabInfo = {
    'props': 'Props',
    'buildings': 'Buildings',
    'terrain': 'Terrain',
    'lights': 'Lights',
    'spawns': 'Spawns',
    'particles': 'Particles'
};

sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        sidebarTabs.forEach(t => t.classList.remove('active'));
        tabPages.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`page-${targetTab}`).classList.add('active');

        // Update drawer title (hide icon, just show title)
        if (tabInfo[targetTab]) {
            drawerTitleIcon.style.display = 'none';
            drawerTitleText.textContent = tabInfo[targetTab];
        }

        if (targetTab === 'props' && !propsLoaded) {
            loadProps();
        }
        if (targetTab === 'buildings' && !buildingsLoaded) {
            loadBuildings();
        }
    });
});

// Drawer toggle
const drawerToggle = document.getElementById('drawer-toggle');
const drawer = document.getElementById('drawer');
if (drawerToggle && drawer) {
    drawerToggle.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
    });
}

// Drawer resize functionality
const drawerResizeHandle = document.getElementById('drawer-resize-handle');
if (drawerResizeHandle && drawer) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    drawerResizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = drawer.offsetHeight;
        drawer.style.transition = 'none'; // Disable transition during drag
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaY = startY - e.clientY; // Inverted because drawer is at bottom
        let newHeight = startHeight + deltaY;

        // Clamp height between 200px and 80% of window height
        const minHeight = 200;
        const maxHeight = window.innerHeight * 0.8;
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

        drawer.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            drawer.style.transition = ''; // Re-enable transition
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// Search
const searchInput = document.getElementById('drawer-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.item-card').forEach(card => {
            const nameEl = card.querySelector('.item-name');
            if (nameEl) {
                const name = nameEl.textContent.toLowerCase();
                card.style.display = name.includes(query) ? '' : 'none';
            }
        });
    });
}

// ==================== PROPS/BUILDINGS LOADING ====================
let propsLoaded = false;
let buildingsLoaded = false;

async function loadProps() {
    try {
        const response = await fetch('/api/list-props');
        const props = await response.json();

        const categorized = categorizeProps(props);
        const propsContent = document.getElementById('props-content');

        // Create "All" category first
        const allDiv = document.createElement('div');
        allDiv.className = 'subtab-content active';
        allDiv.dataset.subtab = 'all';
        const allGrid = document.createElement('div');
        allGrid.className = 'items-grid';
        props.forEach(prop => allGrid.appendChild(createItemCard(prop, 'prop')));
        allDiv.appendChild(allGrid);
        propsContent.appendChild(allDiv);

        // Update "All" count
        const allBtn = document.querySelector(`#props-subtabs [data-subtab="all"] .count`);
        if (allBtn) allBtn.textContent = `(${props.length})`;

        // Create other categories
        Object.keys(categorized).forEach(category => {
            const subtabDiv = document.createElement('div');
            subtabDiv.className = 'subtab-content';
            subtabDiv.dataset.subtab = category;

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            const count = categorized[category].length;

            if (count === 0) {
                // Show empty state
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'padding: 40px; text-align: center; color: rgba(255,255,255,0.4); font-size: 14px;';
                emptyMsg.textContent = `No items in this category`;
                subtabDiv.appendChild(emptyMsg);

                // Hide empty category button
                const btn = document.querySelector(`#props-subtabs [data-subtab="${category}"]`);
                if (btn) btn.style.display = 'none';
            } else {
                categorized[category].forEach(prop => {
                    grid.appendChild(createItemCard(prop, 'prop'));
                });
                subtabDiv.appendChild(grid);

                // Update count badge
                const btn = document.querySelector(`#props-subtabs [data-subtab="${category}"] .count`);
                if (btn) btn.textContent = `(${count})`;
            }

            propsContent.appendChild(subtabDiv);
        });

        setupSubtabs('props');
        propsLoaded = true;
        showNotification(`Loaded ${props.length} props across ${Object.keys(categorized).filter(k => categorized[k].length > 0).length} categories`, 'success');
    } catch (error) {
        showNotification('Error loading props', 'error');
        console.error(error);
    }
}

async function loadBuildings() {
    try {
        const response = await fetch('/api/list-buildings');
        const buildings = await response.json();

        const categorized = categorizeBuildings(buildings);
        const buildingsContent = document.getElementById('buildings-content');

        // Create "All" category first
        const allDiv = document.createElement('div');
        allDiv.className = 'subtab-content active';
        allDiv.dataset.subtab = 'all';
        const allGrid = document.createElement('div');
        allGrid.className = 'items-grid';
        buildings.forEach(building => allGrid.appendChild(createItemCard(building, 'building')));
        allDiv.appendChild(allGrid);
        buildingsContent.appendChild(allDiv);

        // Update "All" count
        const allBtn = document.querySelector(`#buildings-subtabs [data-subtab="all"] .count`);
        if (allBtn) allBtn.textContent = `(${buildings.length})`;

        // Create other categories
        Object.keys(categorized).forEach(category => {
            const subtabDiv = document.createElement('div');
            subtabDiv.className = 'subtab-content';
            subtabDiv.dataset.subtab = category;

            const grid = document.createElement('div');
            grid.className = 'items-grid';

            const count = categorized[category].length;

            if (count === 0) {
                // Show empty state
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = 'padding: 40px; text-align: center; color: rgba(255,255,255,0.4); font-size: 14px;';
                emptyMsg.textContent = `No items in this category`;
                subtabDiv.appendChild(emptyMsg);

                // Hide empty category button
                const btn = document.querySelector(`#buildings-subtabs [data-subtab="${category}"]`);
                if (btn) btn.style.display = 'none';
            } else {
                categorized[category].forEach(building => {
                    grid.appendChild(createItemCard(building, 'building'));
                });
                subtabDiv.appendChild(grid);

                // Update count badge
                const btn = document.querySelector(`#buildings-subtabs [data-subtab="${category}"] .count`);
                if (btn) btn.textContent = `(${count})`;
            }

            buildingsContent.appendChild(subtabDiv);
        });

        setupSubtabs('buildings');
        buildingsLoaded = true;
        showNotification(`Loaded ${buildings.length} buildings across ${Object.keys(categorized).filter(k => categorized[k].length > 0).length} categories`, 'success');
    } catch (error) {
        showNotification('Error loading buildings', 'error');
        console.error(error);
    }
}

function categorizeProps(props) {
    const categories = {
        vegetation: [],
        rocks: [],
        terrain: [],
        vehicles: [],
        military: [],
        containers: [],
        debris: [],
        structures: [],
        natural: [],
        urban: [],
        other: []
    };

    props.forEach(prop => {
        const name = prop.toLowerCase();

        // Vegetation
        if (name.includes('tree') || name.includes('plant') || name.includes('bush') ||
            name.includes('grass') || name.includes('flower') || name.includes('foliage') ||
            name.includes('shrub') || name.includes('leaf') || name.includes('branch')) {
            categories.vegetation.push(prop);
        }
        // Rocks & Stones
        else if (name.includes('rock') || name.includes('stone') || name.includes('boulder')) {
            categories.rocks.push(prop);
        }
        // Terrain Features
        else if (name.includes('hill') || name.includes('crater') || name.includes('cliff') ||
                 name.includes('terrain') || name.includes('ground') || name.includes('mountain')) {
            categories.terrain.push(prop);
        }
        // Vehicles
        else if (name.includes('veh_') || name.includes('vehicle') || name.includes('car') ||
                 name.includes('truck') || name.includes('tank') || name.includes('jeep') ||
                 name.includes('hummer') || name.includes('humvee')) {
            categories.vehicles.push(prop);
        }
        // Military Equipment
        else if (name.includes('weapon') || name.includes('gun') || name.includes('ammo') ||
                 name.includes('military') || name.includes('barrier') || name.includes('barricade') ||
                 name.includes('sandbag') || name.includes('fortification') || name.includes('turret') ||
                 name.includes('mine') || name.includes('explosive')) {
            categories.military.push(prop);
        }
        // Containers & Storage
        else if (name.includes('crate') || name.includes('barrel') || name.includes('box') ||
                 name.includes('container') || name.includes('chest') || name.includes('bin') ||
                 name.includes('drum') || name.includes('pallet')) {
            categories.containers.push(prop);
        }
        // Debris & Trash
        else if (name.includes('debris') || name.includes('trash') || name.includes('garbage') ||
                 name.includes('rubble') || name.includes('scrap') || name.includes('wreck') ||
                 name.includes('destroyed') || name.includes('broken')) {
            categories.debris.push(prop);
        }
        // Structures & Buildings
        else if (name.includes('fence') || name.includes('wall') || name.includes('gate') ||
                 name.includes('door') || name.includes('post') || name.includes('pole') ||
                 name.includes('pillar') || name.includes('column')) {
            categories.structures.push(prop);
        }
        // Natural Features
        else if (name.includes('log') || name.includes('stump') || name.includes('wood') ||
                 name.includes('stick') || name.includes('water') || name.includes('ice')) {
            categories.natural.push(prop);
        }
        // Urban Props
        else if (name.includes('sign') || name.includes('bench') || name.includes('lamp') ||
                 name.includes('light') || name.includes('hydrant') || name.includes('mailbox') ||
                 name.includes('traffic') || name.includes('road') || name.includes('street')) {
            categories.urban.push(prop);
        }
        // Everything else
        else {
            categories.other.push(prop);
        }
    });

    return categories;
}

function categorizeBuildings(buildings) {
    const categories = {
        military: [],
        tents: [],
        walls: [],
        components: [],
        structures: [],
        shelters: [],
        facilities: [],
        other: []
    };

    buildings.forEach(building => {
        const name = building.toLowerCase();

        // Military Buildings
        if (name.includes('barracks') || name.includes('guard') || name.includes('bunker') ||
            name.includes('tower') || name.includes('outpost') || name.includes('checkpoint') ||
            name.includes('armory') || name.includes('command')) {
            categories.military.push(building);
        }
        // Tents & Camping
        else if (name.includes('tent') || name.includes('canopy') || name.includes('awning')) {
            categories.tents.push(building);
        }
        // Walls & Barriers
        else if (name.includes('wall') || name.includes('fence') || name.includes('barrier') ||
                 name.includes('gate') || name.includes('barricade') || name.includes('hesco')) {
            categories.walls.push(building);
        }
        // Building Components
        else if (name.includes('door') || name.includes('window') || name.includes('roof') ||
                 name.includes('stairs') || name.includes('ladder') || name.includes('ramp')) {
            categories.components.push(building);
        }
        // Structures
        else if (name.includes('platform') || name.includes('deck') || name.includes('walkway') ||
                 name.includes('bridge') || name.includes('tower')) {
            categories.structures.push(building);
        }
        // Shelters & Housing
        else if (name.includes('house') || name.includes('building') || name.includes('shack') ||
                 name.includes('shed') || name.includes('cabin') || name.includes('hut')) {
            categories.shelters.push(building);
        }
        // Facilities
        else if (name.includes('warehouse') || name.includes('hangar') || name.includes('garage') ||
                 name.includes('storage') || name.includes('depot')) {
            categories.facilities.push(building);
        }
        // Everything else
        else {
            categories.other.push(building);
        }
    });

    return categories;
}

function createItemCard(filename, type) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.file = filename;
    card.dataset.type = type;

    const cleanName = filename
        .replace(/\.(glb|gltf)$/i, '')
        .replace(/^(SM_|SK_)(Bld_|Env_|Veh_|Prop_)?/, '')
        .replace(/_/g, ' ');

    const info = document.createElement('div');
    info.className = 'item-info';
    info.style.padding = '20px 10px';
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.justifyContent = 'center';
    info.style.alignItems = 'center';
    info.style.height = '100%';

    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = cleanName;
    name.style.fontSize = '15px';
    name.style.fontWeight = '600';
    name.style.textAlign = 'center';
    name.style.lineHeight = '1.4';
    name.style.marginBottom = '8px';
    name.style.whiteSpace = 'normal';
    name.style.wordBreak = 'break-word';

    const desc = document.createElement('div');
    desc.className = 'item-desc';
    desc.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    desc.style.fontSize = '11px';
    desc.style.textAlign = 'center';
    desc.style.opacity = '0.7';

    info.appendChild(name);
    info.appendChild(desc);
    card.appendChild(info);

    card.addEventListener('click', () => {
        editorState.mode = 'place';
        editorState.selectedType = type;
        editorState.selectedFile = filename;

        // Visual feedback
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Create ghost preview
        createPreviewObject();

        showNotification(`Selected: ${cleanName}`, 'info');
        updateInfo();
    });

    // Right-click to deselect
    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            editorState.mode = 'select';
            editorState.selectedType = null;
            editorState.selectedFile = null;
            removePreviewObject();
            showNotification('Deselected', 'info');
            updateInfo();
        }
    });

    // Model preview on hover
    card.addEventListener('mouseenter', (e) => {
        showModelPreview(filename, type, cleanName, e);
    });

    card.addEventListener('mousemove', (e) => {
        updateModelPreviewPosition(e);
    });

    card.addEventListener('mouseleave', () => {
        hideModelPreview();
    });

    return card;
}

function setupSubtabs(pageType) {
    const subtabButtons = document.querySelectorAll(`#${pageType}-subtabs .subtab-btn`);
    const contentContainer = document.getElementById(`${pageType}-content`);

    subtabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.subtab;

            subtabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const subtabs = contentContainer.querySelectorAll('.subtab-content');
            subtabs.forEach(tab => {
                if (tab.dataset.subtab === target) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        });
    });
}

// ==================== LIGHT CARDS AND PROPERTY CONTROLS ====================
// Light type selection
document.querySelectorAll('[data-type="light"]').forEach(card => {
    card.addEventListener('click', () => {
        const lightType = card.dataset.lighttype;
        console.log('[Light Card Click] Setting mode to place for light type:', lightType);
        editorState.mode = 'place';
        editorState.selectedLightType = lightType;
        editorState.selectedType = null;
        editorState.selectedFile = null;
        removePreviewObject();

        // Visual feedback
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        showNotification(`Selected: ${lightType} light - Click to place`, 'info');
        updateInfo();
        console.log('[Light Card Click] After setting - mode:', editorState.mode, 'selectedLightType:', editorState.selectedLightType);
    });
});

// Light property controls
const lightColorInput = document.getElementById('light-color');
const lightIntensityInput = document.getElementById('light-intensity');
const lightIntensityValue = document.getElementById('light-intensity-value');
const lightDistanceInput = document.getElementById('light-distance');
const lightDistanceValue = document.getElementById('light-distance-value');
const lightAngleInput = document.getElementById('light-angle');
const lightAngleValue = document.getElementById('light-angle-value');
const lightPenumbraInput = document.getElementById('light-penumbra');
const lightPenumbraValue = document.getElementById('light-penumbra-value');
const lightDecayInput = document.getElementById('light-decay');
const lightDecayValue = document.getElementById('light-decay-value');
const lightCastShadowInput = document.getElementById('light-cast-shadow');
const lightShadowBiasInput = document.getElementById('light-shadow-bias');
const lightShadowBiasValue = document.getElementById('light-shadow-bias-value');
const lightShadowRadiusInput = document.getElementById('light-shadow-radius');
const lightShadowRadiusValue = document.getElementById('light-shadow-radius-value');
const lightShadowMapSizeInput = document.getElementById('light-shadow-mapsize');
const deleteLightBtn = document.getElementById('delete-light-btn');

if (lightColorInput) {
    lightColorInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        editorState.selectedLight.color.set(e.target.value);
        updateLightHelper(editorState.selectedLight);
    });
}

if (lightIntensityInput) {
    lightIntensityInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        editorState.selectedLight.intensity = value;
        lightIntensityValue.textContent = value.toFixed(1);
        updateLightHelper(editorState.selectedLight);
    });
}

if (lightDistanceInput) {
    lightDistanceInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        if (editorState.selectedLight.distance !== undefined) {
            editorState.selectedLight.distance = value;
        }
        lightDistanceValue.textContent = value;
        updateLightHelper(editorState.selectedLight);
    });
}

if (lightAngleInput) {
    lightAngleInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const degrees = parseFloat(e.target.value);
        const radians = (degrees * Math.PI) / 180;
        editorState.selectedLight.angle = radians;
        lightAngleValue.textContent = degrees;
        updateLightHelper(editorState.selectedLight);
    });
}

if (lightPenumbraInput) {
    lightPenumbraInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        editorState.selectedLight.penumbra = value;
        lightPenumbraValue.textContent = value.toFixed(2);
        updateLightHelper(editorState.selectedLight);
    });
}

if (lightDecayInput) {
    lightDecayInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        if (editorState.selectedLight.decay !== undefined) {
            editorState.selectedLight.decay = value;
        }
        lightDecayValue.textContent = value.toFixed(1);
    });
}

if (lightCastShadowInput) {
    lightCastShadowInput.addEventListener('change', (e) => {
        if (!editorState.selectedLight) return;
        editorState.selectedLight.castShadow = e.target.checked;

        // Show/hide shadow settings
        const shadowSettings = document.getElementById('shadow-settings');
        if (shadowSettings) {
            shadowSettings.style.display = e.target.checked ? 'block' : 'none';
        }
    });
}

if (lightShadowBiasInput) {
    lightShadowBiasInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        if (editorState.selectedLight.shadow) {
            editorState.selectedLight.shadow.bias = value;
        }
        lightShadowBiasValue.textContent = value.toFixed(4);
    });
}

if (lightShadowRadiusInput) {
    lightShadowRadiusInput.addEventListener('input', (e) => {
        if (!editorState.selectedLight) return;
        const value = parseFloat(e.target.value);
        if (editorState.selectedLight.shadow) {
            editorState.selectedLight.shadow.radius = value;
        }
        lightShadowRadiusValue.textContent = value.toFixed(1);
    });
}

if (lightShadowMapSizeInput) {
    lightShadowMapSizeInput.addEventListener('change', (e) => {
        if (!editorState.selectedLight) return;
        const size = parseInt(e.target.value);
        if (editorState.selectedLight.shadow) {
            editorState.selectedLight.shadow.mapSize.width = size;
            editorState.selectedLight.shadow.mapSize.height = size;
            editorState.selectedLight.shadow.map?.dispose();
            editorState.selectedLight.shadow.map = null;
            showNotification(`Shadow resolution updated to ${size}x${size}`, 'info');
        }
    });
}

if (deleteLightBtn) {
    deleteLightBtn.addEventListener('click', () => {
        if (!editorState.selectedLight) return;

        const light = editorState.selectedLight;

        // Remove helper
        if (light.userData.helper) {
            scene.remove(light.userData.helper);
            light.userData.helper.dispose();
        }

        // Remove target if it exists (spot/directional)
        if (light.target && light.target.parent) {
            scene.remove(light.target);
        }

        // Remove light
        scene.remove(light);
        editorState.placedLights = editorState.placedLights.filter(l => l !== light);
        editorState.placedObjects = editorState.placedObjects.filter(o => o !== light);

        // Hide properties panel
        document.getElementById('light-properties').style.display = 'none';
        editorState.selectedLight = null;

        // Add to history
        addToHistory({ type: 'delete', object: light });

        showNotification('Light deleted', 'success');
        updateInfo();
    });
}

// Update light properties panel when a light is selected
function showLightProperties(light) {
    const propertiesPanel = document.getElementById('light-properties');
    const angleContainer = document.getElementById('spotlight-angle-container');
    const penumbraContainer = document.getElementById('spotlight-penumbra-container');
    const decayContainer = document.getElementById('light-decay-container');
    const shadowSettings = document.getElementById('shadow-settings');
    const lightTypeDisplay = document.getElementById('light-type-display');

    if (!light || light.userData.type !== 'light') {
        propertiesPanel.style.display = 'none';
        return;
    }

    editorState.selectedLight = light;
    propertiesPanel.style.display = 'block';

    // Update light type display
    const typeNames = {
        'point': 'Point Light',
        'spot': 'Spot Light',
        'directional': 'Directional Light'
    };
    if (lightTypeDisplay) {
        lightTypeDisplay.textContent = typeNames[light.userData.lightType] || 'Light';
    }

    // Update color
    const hexColor = '#' + light.color.getHexString();
    lightColorInput.value = hexColor;

    // Update intensity
    lightIntensityInput.value = light.intensity;
    lightIntensityValue.textContent = light.intensity.toFixed(1);

    // Update distance (for point and spot lights)
    if (light.distance !== undefined) {
        lightDistanceInput.value = light.distance;
        lightDistanceValue.textContent = light.distance;
    }

    // Show/hide decay control (for point and spot lights)
    if (light.decay !== undefined) {
        if (decayContainer) {
            decayContainer.style.display = 'block';
            lightDecayInput.value = light.decay;
            lightDecayValue.textContent = light.decay.toFixed(1);
        }
    } else {
        if (decayContainer) decayContainer.style.display = 'none';
    }

    // Show/hide spotlight-specific controls
    if (light.userData.lightType === 'spot') {
        angleContainer.style.display = 'block';
        penumbraContainer.style.display = 'block';

        const degrees = Math.round((light.angle * 180) / Math.PI);
        lightAngleInput.value = degrees;
        lightAngleValue.textContent = degrees;

        lightPenumbraInput.value = light.penumbra;
        lightPenumbraValue.textContent = light.penumbra.toFixed(2);
    } else {
        angleContainer.style.display = 'none';
        penumbraContainer.style.display = 'none';
    }

    // Update cast shadow checkbox
    lightCastShadowInput.checked = light.castShadow;

    // Show/hide shadow settings
    if (shadowSettings) {
        shadowSettings.style.display = light.castShadow ? 'block' : 'none';
    }

    // Update shadow properties
    if (light.shadow) {
        if (lightShadowBiasInput) {
            lightShadowBiasInput.value = light.shadow.bias;
            lightShadowBiasValue.textContent = light.shadow.bias.toFixed(4);
        }

        if (lightShadowRadiusInput) {
            lightShadowRadiusInput.value = light.shadow.radius;
            lightShadowRadiusValue.textContent = light.shadow.radius.toFixed(1);
        }

        if (lightShadowMapSizeInput) {
            lightShadowMapSizeInput.value = light.shadow.mapSize.width;
        }
    }
}

// ==================== PARTICLE CARDS AND PROPERTY CONTROLS ====================
// Particle type selection
document.querySelectorAll('[data-type="particle"]').forEach(card => {
    card.addEventListener('click', () => {
        const particleType = card.dataset.particletype;
        console.log('[Particle Card Click] Setting particle type:', particleType);
        editorState.selectedParticleType = particleType;

        // Load preset values into UI
        const preset = particlePresets[particleType];
        if (preset) {
            document.getElementById('particle-color').value = '#' + preset.color.toString(16).padStart(6, '0');
            document.getElementById('particle-count').value = preset.count;
            document.getElementById('particle-count-value').textContent = preset.count;
            document.getElementById('particle-size').value = preset.size;
            document.getElementById('particle-size-value').textContent = preset.size;
            document.getElementById('particle-lifetime').value = preset.lifetime;
            document.getElementById('particle-lifetime-value').textContent = preset.lifetime.toFixed(1);
            document.getElementById('particle-velocity').value = Math.abs(preset.velocity.y);
            document.getElementById('particle-velocity-value').textContent = Math.abs(preset.velocity.y).toFixed(1);
            document.getElementById('particle-spread').value = preset.spread;
            document.getElementById('particle-spread-value').textContent = preset.spread.toFixed(1);
        }

        // Show properties panel
        document.getElementById('particle-properties').style.display = 'block';
        document.getElementById('particle-type-display').textContent = particleType.charAt(0).toUpperCase() + particleType.slice(1);

        // Visual feedback
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        showNotification(`Selected: ${particleType} particles - Configure and click "Place Particle Emitter"`, 'info');
        console.log('[Particle Card Click] Particle type selected:', particleType);
    });
});

// Particle property controls
const particleColorInput = document.getElementById('particle-color');
const particleCountInput = document.getElementById('particle-count');
const particleCountValue = document.getElementById('particle-count-value');
const particleSizeInput = document.getElementById('particle-size');
const particleSizeValue = document.getElementById('particle-size-value');
const particleLifetimeInput = document.getElementById('particle-lifetime');
const particleLifetimeValue = document.getElementById('particle-lifetime-value');
const particleVelocityInput = document.getElementById('particle-velocity');
const particleVelocityValue = document.getElementById('particle-velocity-value');
const particleSpreadInput = document.getElementById('particle-spread');
const particleSpreadValue = document.getElementById('particle-spread-value');
const particleLoopInput = document.getElementById('particle-loop');
const btnPlaceParticle = document.getElementById('btn-place-particle');

if (particleCountInput) {
    particleCountInput.addEventListener('input', (e) => {
        particleCountValue.textContent = e.target.value;
    });
}

if (particleSizeInput) {
    particleSizeInput.addEventListener('input', (e) => {
        particleSizeValue.textContent = parseFloat(e.target.value).toFixed(2);
    });
}

if (particleLifetimeInput) {
    particleLifetimeInput.addEventListener('input', (e) => {
        particleLifetimeValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
}

if (particleVelocityInput) {
    particleVelocityInput.addEventListener('input', (e) => {
        particleVelocityValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
}

if (particleSpreadInput) {
    particleSpreadInput.addEventListener('input', (e) => {
        particleSpreadValue.textContent = parseFloat(e.target.value).toFixed(1);
    });
}

if (btnPlaceParticle) {
    btnPlaceParticle.addEventListener('click', () => {
        if (!editorState.selectedParticleType) {
            showNotification('Please select a particle type first', 'error');
            return;
        }
        editorState.mode = 'place-particle';
        showNotification(`Click in the scene to place ${editorState.selectedParticleType} emitter`, 'info');
        updateInfo();
    });
}

// ==================== MODEL PREVIEW SYSTEM ====================
const modelPreview = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,
    model: null,
    loader: null,
    animationId: null,
    currentFile: null,
    loadingEl: null,
    labelEl: null
};

function initModelPreview() {
    modelPreview.container = document.getElementById('model-preview');
    modelPreview.loadingEl = document.getElementById('model-preview-loading');
    modelPreview.labelEl = document.getElementById('model-preview-label');

    // Create scene
    modelPreview.scene = new THREE.Scene();
    modelPreview.scene.background = new THREE.Color(0x0a0e1a);

    // Create camera
    modelPreview.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    modelPreview.camera.position.set(3, 3, 3);
    modelPreview.camera.lookAt(0, 0, 0);

    // Create renderer
    modelPreview.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    modelPreview.renderer.setSize(300, 300);
    modelPreview.renderer.setPixelRatio(window.devicePixelRatio);
    modelPreview.renderer.shadowMap.enabled = true;
    modelPreview.container.insertBefore(modelPreview.renderer.domElement, modelPreview.loadingEl);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    modelPreview.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    modelPreview.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    modelPreview.scene.add(fillLight);

    // Create loader
    modelPreview.loader = new GLTFLoader();
}

function animateModelPreview() {
    if (!modelPreview.renderer || !modelPreview.scene || !modelPreview.camera) return;

    modelPreview.animationId = requestAnimationFrame(animateModelPreview);

    // Rotate model slowly
    if (modelPreview.model) {
        modelPreview.model.rotation.y += 0.01;
    }

    modelPreview.renderer.render(modelPreview.scene, modelPreview.camera);
}

function showModelPreview(filename, type, cleanName, event) {
    if (!modelPreview.container) initModelPreview();

    // Show container and loading state
    modelPreview.container.classList.add('visible');
    modelPreview.loadingEl.style.display = 'block';
    modelPreview.labelEl.textContent = cleanName;

    // Position near cursor
    updateModelPreviewPosition(event);

    // Don't reload if same file
    if (modelPreview.currentFile === filename) {
        modelPreview.loadingEl.style.display = 'none';
        return;
    }

    // Clear ALL models from scene (in case of race conditions)
    clearModelPreviewScene();

    // Load new model
    const path = type === 'building' ? `/assets/buildings/${filename}` : `/assets/props/${filename}`;
    modelPreview.currentFile = filename;

    modelPreview.loader.load(
        path,
        (gltf) => {
            // Double-check we should still show this model (user might have moved to another)
            if (modelPreview.currentFile !== filename) return;

            // Clear scene again before adding (in case multiple loaded)
            clearModelPreviewScene();

            modelPreview.model = gltf.scene;

            // Center and scale model
            const box = new THREE.Box3().setFromObject(modelPreview.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            modelPreview.model.position.sub(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            modelPreview.model.scale.multiplyScalar(scale);

            // Enable shadows
            modelPreview.model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            modelPreview.scene.add(modelPreview.model);
            modelPreview.loadingEl.style.display = 'none';

            // Start animation if not running
            if (!modelPreview.animationId) {
                animateModelPreview();
            }
        },
        undefined,
        (error) => {
            console.error('Error loading preview model:', error);
            modelPreview.loadingEl.textContent = 'Failed to load';
        }
    );
}

function clearModelPreviewScene() {
    if (!modelPreview.scene) return;

    // Remove and dispose all meshes from the scene
    const objectsToRemove = [];
    modelPreview.scene.traverse(child => {
        // Skip lights, camera, and the scene itself
        if (child.isMesh || (child.isGroup && !child.isLight)) {
            objectsToRemove.push(child);
        }
    });

    objectsToRemove.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });

    modelPreview.model = null;
}

function updateModelPreviewPosition(event) {
    if (!modelPreview.container) return;

    const offsetX = 20;
    const offsetY = 20;
    const previewWidth = 300;
    const previewHeight = 300;

    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;

    // Keep preview on screen
    if (x + previewWidth > window.innerWidth) {
        x = event.clientX - previewWidth - offsetX;
    }
    if (y + previewHeight > window.innerHeight) {
        y = event.clientY - previewHeight - offsetY;
    }

    modelPreview.container.style.left = x + 'px';
    modelPreview.container.style.top = y + 'px';
}

function hideModelPreview() {
    if (!modelPreview.container) return;

    modelPreview.container.classList.remove('visible');

    // Stop animation
    if (modelPreview.animationId) {
        cancelAnimationFrame(modelPreview.animationId);
        modelPreview.animationId = null;
    }

    // Keep model loaded for quick re-display
    // modelPreview.currentFile remains set for caching
}

// ==================== PROPERTIES PANEL INPUTS ====================
['pos-x', 'pos-y', 'pos-z', 'rot-x', 'rot-y', 'rot-z', 'scale-x', 'scale-y', 'scale-z'].forEach(prop => {
    const input = document.getElementById(`prop-${prop}`);
    if (!input) return; // Safety check

    input.addEventListener('change', () => {
        if (!editorState.selectedObject) return;

        const value = parseFloat(input.value);
        const obj = editorState.selectedObject;

        // Validate input - prevent NaN corruption
        if (isNaN(value) || !isFinite(value)) {
            showNotification('Invalid number entered', 'error');
            updatePropertiesPanel(); // Reset to current values
            return;
        }

        // Save state for undo before changing
        const oldPos = obj.position.clone();
        const oldRot = obj.rotation.clone();
        const oldScale = obj.scale.clone();

        if (prop.includes('pos')) {
            const axis = prop.split('-')[1];
            obj.position[axis] = value;
        } else if (prop.includes('rot')) {
            const axis = prop.split('-')[1];
            obj.rotation[axis] = THREE.MathUtils.degToRad(value);
        } else if (prop.includes('scale')) {
            const axis = prop.split('-')[1];
            // Prevent zero or negative scale
            if (value <= 0) {
                showNotification('Scale must be positive', 'error');
                updatePropertiesPanel();
                return;
            }
            obj.scale[axis] = value;
        }

        // Add to history
        addToHistory({
            type: 'transform',
            object: obj,
            oldPosition: oldPos,
            oldRotation: oldRot,
            oldScale: oldScale,
            newPosition: obj.position.clone(),
            newRotation: obj.rotation.clone(),
            newScale: obj.scale.clone()
        });
    });
});

// ==================== COPY/PASTE/DUPLICATE ====================
function copySelectedObjects() {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected to copy', 'error');
        return;
    }

    editorState.clipboard = editorState.selectedObjects.map(obj => ({
        type: obj.userData.type,
        file: obj.userData.file,
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
    }));

    showNotification(`Copied ${editorState.clipboard.length} object(s)`, 'success');
}

function pasteObjects() {
    if (editorState.clipboard.length === 0) {
        showNotification('Clipboard is empty', 'error');
        return;
    }

    deselectObject();

    editorState.clipboard.forEach(objData => {
        const path = objData.type === 'building'
            ? `assets/buildings/${objData.file}`
            : `assets/props/${objData.file}`;

        loader.load(path, (gltf) => {
            const object = gltf.scene;

            // Offset pasted objects slightly
            object.position.set(
                objData.position.x + 2,
                objData.position.y,
                objData.position.z + 2
            );
            object.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
            object.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
            object.userData = {
                type: objData.type,
                file: objData.file
            };

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(object);
            editorState.placedObjects.push(object);
            addToHistory({ type: 'add', object });

            // Select pasted objects
            selectObject(object, editorState.selectedObjects.length > 0);
            updateInfo();
        });
    });

    showNotification(`Pasted ${editorState.clipboard.length} object(s)`, 'success');
}

function duplicateSelectedObjects() {
    copySelectedObjects();
    pasteObjects();
}

// ==================== CAMERA BOOKMARKS ====================
function saveCameraBookmark(slot) {
    if (slot < 0 || slot > 3) return;

    editorState.cameraBookmarks[slot] = {
        position: camera.position.clone(),
        target: controls.target.clone()
    };

    showNotification(`Camera bookmark ${slot + 1} saved`, 'success');
}

function recallCameraBookmark(slot) {
    if (slot < 0 || slot > 3) return;

    const bookmark = editorState.cameraBookmarks[slot];
    if (!bookmark) {
        showNotification(`Camera bookmark ${slot + 1} is empty`, 'error');
        return;
    }

    camera.position.copy(bookmark.position);
    controls.target.copy(bookmark.target);
    controls.update();

    showNotification(`Recalled camera bookmark ${slot + 1}`, 'success');
}

// ==================== AUTO-SAVE ====================
function autoSave() {
    // Get splatmap data as base64
    const splatmap1Data = splatmapCanvas1.toDataURL('image/png');
    const splatmap2Data = splatmapCanvas2.toDataURL('image/png');

    const levelData = {
        version: '1.0',
        objects: editorState.placedObjects.map(obj => ({
            type: obj.userData.type,
            file: obj.userData.file,
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            visible: obj.visible
        })),
        terrain: {
            splatmap1: splatmap1Data,
            splatmap2: splatmap2Data,
            size: groundSize
        },
        groups: editorState.groups || [],
        timestamp: Date.now()
    };

    try {
        localStorage.setItem('levelEditor_autoSave', JSON.stringify(levelData));
        editorState.lastAutoSave = Date.now();
        console.log('Auto-saved level with terrain');
    } catch (error) {
        // If auto-save fails (likely due to localStorage size limit), try without terrain
        console.warn('Auto-save with terrain failed, trying without terrain:', error);
        const lightData = {
            objects: editorState.placedObjects.map(obj => ({
                type: obj.userData.type,
                file: obj.userData.file,
                position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z }
            })),
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('levelEditor_autoSave', JSON.stringify(lightData));
            console.log('Auto-saved level (without terrain due to size)');
        } catch (e2) {
            console.error('Auto-save failed completely:', e2);
        }
    }
}

function loadAutoSave() {
    try {
        const saved = localStorage.getItem('levelEditor_autoSave');
        if (!saved) return false;

        const levelData = JSON.parse(saved);
        const ageMinutes = Math.floor((Date.now() - levelData.timestamp) / 60000);

        // Show custom modal instead of browser confirm
        showAutoSaveModal(levelData, ageMinutes);
        return true;
    } catch (error) {
        console.error('Failed to load auto-save:', error);
    }
    return false;
}

function showAutoSaveModal(levelData, ageMinutes) {
    const modal = document.getElementById('autosave-modal');
    const overlay = document.getElementById('autosave-overlay');
    const message = document.getElementById('autosave-message');
    const loadBtn = document.getElementById('autosave-load-btn');
    const skipBtn = document.getElementById('autosave-skip-btn');

    // Set message
    const timeText = ageMinutes === 0 ? 'less than a minute' :
                     ageMinutes === 1 ? '1 minute' :
                     `${ageMinutes} minutes`;
    message.textContent = `Found an auto-saved level from ${timeText} ago. Would you like to restore it?`;

    // Show modal and overlay
    modal.style.display = 'block';
    overlay.style.display = 'block';

    // Add hover effects
    loadBtn.onmouseenter = () => {
        loadBtn.style.background = 'rgba(59, 130, 246, 0.3)';
        loadBtn.style.transform = 'scale(1.02)';
    };
    loadBtn.onmouseleave = () => {
        loadBtn.style.background = 'rgba(59, 130, 246, 0.2)';
        loadBtn.style.transform = 'scale(1)';
    };

    skipBtn.onmouseenter = () => {
        skipBtn.style.background = 'rgba(255,255,255,0.08)';
        skipBtn.style.transform = 'scale(1.02)';
    };
    skipBtn.onmouseleave = () => {
        skipBtn.style.background = 'rgba(255,255,255,0.05)';
        skipBtn.style.transform = 'scale(1)';
    };

    // Handle load button
    loadBtn.onclick = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        loadLevelData(levelData);
        showNotification('Auto-save restored!', 'success');
    };

    // Handle skip button
    skipBtn.onclick = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        showNotification('Starting with fresh level', 'info');
    };

    // Close on overlay click
    overlay.onclick = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        showNotification('Starting with fresh level', 'info');
    };
}

function loadLevelData(levelData) {
    if (!levelData || !levelData.objects) return;

    cleanupScene();
    editorState.history = [];
    editorState.historyIndex = -1;

    // Load terrain splatmaps if present
    if (levelData.terrain) {
        if (levelData.terrain.splatmap1) {
            const img1 = new Image();
            img1.onload = () => {
                splatmapCtx1.drawImage(img1, 0, 0, splatmapSize, splatmapSize);
                const imageData = splatmapCtx1.getImageData(0, 0, splatmapSize, splatmapSize);
                for (let i = 0; i < splatmapImageData1.data.length; i++) {
                    splatmapImageData1.data[i] = imageData.data[i];
                }
                splatmap1.needsUpdate = true;
                console.log('Loaded splatmap1 from export');
            };
            img1.src = levelData.terrain.splatmap1;
        }

        if (levelData.terrain.splatmap2) {
            const img2 = new Image();
            img2.onload = () => {
                splatmapCtx2.drawImage(img2, 0, 0, splatmapSize, splatmapSize);
                const imageData = splatmapCtx2.getImageData(0, 0, splatmapSize, splatmapSize);
                for (let i = 0; i < splatmapImageData2.data.length; i++) {
                    splatmapImageData2.data[i] = imageData.data[i];
                }
                splatmap2.needsUpdate = true;
                console.log('Loaded splatmap2 from export');
            };
            img2.src = levelData.terrain.splatmap2;
        }
    }

    // Load environment settings if present
    if (levelData.environment) {
        // Load skybox
        if (levelData.environment.skybox) {
            currentSkybox = levelData.environment.skybox;
            const skyboxData = skyboxes[currentSkybox];
            if (skyboxData) {
                changeSkybox(currentSkybox);
                // Update UI selection
                document.querySelectorAll('[data-skybox]').forEach(card => {
                    card.classList.toggle('selected', card.dataset.skybox === currentSkybox);
                });
            }
        }

        // Load sun/moon position
        if (levelData.environment.sunAltitude !== undefined) {
            sunAltitude = levelData.environment.sunAltitude;
            const altInput = document.getElementById('sun-altitude');
            const altValue = document.getElementById('sun-altitude-value');
            if (altInput) altInput.value = sunAltitude;
            if (altValue) altValue.textContent = sunAltitude;
            updateSunPosition();
        }

        if (levelData.environment.sunAzimuth !== undefined) {
            sunAzimuth = levelData.environment.sunAzimuth;
            const aziInput = document.getElementById('sun-azimuth');
            const aziValue = document.getElementById('sun-azimuth-value');
            if (aziInput) aziInput.value = sunAzimuth;
            if (aziValue) aziValue.textContent = sunAzimuth;
            updateSunPosition();
        }

        // Load fog distance
        if (levelData.environment.fogDistance !== undefined) {
            fogDistance = levelData.environment.fogDistance;
            const fogInput = document.getElementById('fog-distance');
            const fogValue = document.getElementById('fog-distance-value');
            if (fogInput) fogInput.value = fogDistance;
            if (fogValue) fogValue.textContent = fogDistance;
            scene.fog.far = fogDistance;
        }

        // Load cloud settings
        if (levelData.environment.cloudSettings) {
            Object.assign(cloudSettings, levelData.environment.cloudSettings);

            // Update UI controls
            const enabledInput = document.getElementById('clouds-enabled');
            const densityInput = document.getElementById('cloud-density');
            const densityValue = document.getElementById('cloud-density-value');
            const heightInput = document.getElementById('cloud-height');
            const heightValue = document.getElementById('cloud-height-value');
            const scaleInput = document.getElementById('cloud-scale');
            const scaleValue = document.getElementById('cloud-scale-value');
            const spreadInput = document.getElementById('cloud-spread');
            const spreadValue = document.getElementById('cloud-spread-value');
            const opacityInput = document.getElementById('cloud-opacity');
            const opacityValue = document.getElementById('cloud-opacity-value');

            if (enabledInput) enabledInput.checked = cloudSettings.enabled;
            if (densityInput) densityInput.value = cloudSettings.density;
            if (densityValue) densityValue.textContent = cloudSettings.density;
            if (heightInput) heightInput.value = cloudSettings.height;
            if (heightValue) heightValue.textContent = cloudSettings.height;
            if (scaleInput) scaleInput.value = cloudSettings.scale;
            if (scaleValue) scaleValue.textContent = cloudSettings.scale;
            if (spreadInput) spreadInput.value = cloudSettings.spread;
            if (spreadValue) spreadValue.textContent = cloudSettings.spread;
            if (opacityInput) opacityInput.value = cloudSettings.opacity;
            if (opacityValue) opacityValue.textContent = cloudSettings.opacity.toFixed(2);

            // Regenerate clouds with loaded settings
            generateClouds();
        }
    }

    // Load groups if present
    if (levelData.groups) {
        editorState.groups = levelData.groups;
    }

    // Load objects
    levelData.objects.forEach(objData => {
        const path = objData.type === 'building'
            ? `assets/buildings/${objData.file}`
            : `assets/props/${objData.file}`;

        loader.load(path, (gltf) => {
            const object = gltf.scene;
            object.position.set(objData.position.x, objData.position.y, objData.position.z);
            object.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
            object.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
            object.userData = {
                type: objData.type,
                file: objData.file
            };

            // Restore visibility if saved
            if (objData.visible !== undefined) {
                object.visible = objData.visible;
            }

            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(object);
            editorState.placedObjects.push(object);
            updateInfo();
        });
    });
}

// Auto-save every 2 minutes
setInterval(() => {
    if (editorState.placedObjects.length > 0) {
        autoSave();
    }
}, 120000);

// ==================== STATISTICS ====================
let lastTime = performance.now();
let frames = 0;
let fps = 60;

function updateStats() {
    if (!editorState.statsVisible) return;

    // Calculate FPS
    frames++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;

        const fpsEl = document.getElementById('stat-fps');
        if (fpsEl) {
            fpsEl.textContent = fps;
            fpsEl.style.color = fps >= 55 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444';
        }
    }

    // Count triangles
    let triangles = 0;
    editorState.placedObjects.forEach(obj => {
        obj.traverse(child => {
            if (child.geometry) {
                if (child.geometry.index) {
                    triangles += child.geometry.index.count / 3;
                } else if (child.geometry.attributes.position) {
                    triangles += child.geometry.attributes.position.count / 3;
                }
            }
        });
    });

    const statTriangles = document.getElementById('stat-triangles');
    if (statTriangles) {
        statTriangles.textContent = Math.round(triangles).toLocaleString();
    }

    // Renderer info
    const info = renderer.info;
    const statDrawCalls = document.getElementById('stat-drawcalls');
    if (statDrawCalls) statDrawCalls.textContent = info.render.calls;

    const statTextures = document.getElementById('stat-textures');
    if (statTextures) statTextures.textContent = info.memory.textures;

    const statGeometries = document.getElementById('stat-geometries');
    if (statGeometries) statGeometries.textContent = info.memory.geometries;

    // Estimate memory (rough)
    const estimatedMemory = (info.memory.textures * 2 + info.memory.geometries * 1) / 1024;
    const statMemory = document.getElementById('stat-memory');
    if (statMemory) statMemory.textContent = estimatedMemory.toFixed(1) + ' MB';
}

function toggleStats() {
    editorState.statsVisible = !editorState.statsVisible;
    const panel = document.getElementById('stats-panel');
    if (panel) panel.style.display = editorState.statsVisible ? 'block' : 'none';
    showNotification(`Statistics ${editorState.statsVisible ? 'visible' : 'hidden'}`, 'info');
}

// ==================== FOCUS ON SELECTED ====================
function focusOnSelected() {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No object selected to focus on', 'error');
        return;
    }

    // Calculate bounding box of all selected objects
    const box = new THREE.Box3();
    editorState.selectedObjects.forEach(obj => {
        box.expandByObject(obj);
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // Add some padding

    // Smooth camera transition
    const targetPos = new THREE.Vector3(
        center.x + cameraZ * 0.5,
        center.y + cameraZ * 0.5,
        center.z + cameraZ
    );

    // Animate camera
    animateCamera(targetPos, center);
    showNotification('Focused on selected object(s)', 'success');
}

function animateCamera(targetPosition, targetLookAt) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 500; // ms
    const startTime = performance.now();

    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        camera.position.lerpVectors(startPos, targetPosition, eased);
        controls.target.lerpVectors(startTarget, targetLookAt, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// ==================== WIREFRAME MODE ====================
function toggleWireframe() {
    editorState.wireframeMode = !editorState.wireframeMode;

    editorState.placedObjects.forEach(obj => {
        obj.traverse(child => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.wireframe = editorState.wireframeMode);
                } else {
                    child.material.wireframe = editorState.wireframeMode;
                }
            }
        });
    });

    // Note: Ground uses custom shader material, wireframe not applicable

    showNotification(`Wireframe mode ${editorState.wireframeMode ? 'ON' : 'OFF'}`, 'info');
}

// ==================== RANDOM PLACEMENT ====================
function toggleRandomPlacement() {
    editorState.randomPlacement = !editorState.randomPlacement;
    showNotification(`Random placement ${editorState.randomPlacement ? 'ON' : 'OFF'}`, 'info');
}

// ==================== ALIGN TO GROUND ====================
function alignToGround() {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected', 'error');
        return;
    }

    editorState.selectedObjects.forEach(obj => {
        // Cast ray downward from object
        const raycaster = new THREE.Raycaster();
        raycaster.set(
            new THREE.Vector3(obj.position.x, obj.position.y + 100, obj.position.z),
            new THREE.Vector3(0, -1, 0)
        );

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            obj.position.y = intersects[0].point.y;
        }
    });

    showNotification(`Aligned ${editorState.selectedObjects.length} object(s) to ground`, 'success');
}

// ==================== TERRAIN PAINTING MODE ====================
function togglePaintMode() {
    editorState.paintMode = !editorState.paintMode;

    const paintBtn = document.getElementById('btn-paint');
    const paintPanel = document.getElementById('paint-panel');

    if (editorState.paintMode) {
        // Enable paint mode
        paintBtn.classList.add('active');
        paintPanel.style.display = 'block';
        brushCursor.visible = true;
        updateBrushCursorSize();

        // Disable orbit controls so camera doesn't rotate while painting
        controls.enabled = false;

        // Disable transform controls and selection
        transformControls.enabled = false;
        transformControls.detach();
        deselectObject();

        showNotification('Paint mode ON - Click and drag to paint terrain', 'success');
    } else {
        // Disable paint mode
        paintBtn.classList.remove('active');
        paintPanel.style.display = 'none';
        brushCursor.visible = false;
        editorState.isPainting = false;

        // Re-enable orbit controls
        controls.enabled = true;

        // Re-enable transform controls
        transformControls.enabled = true;

        showNotification('Paint mode OFF', 'info');
    }
}

// Get texture index from texture name
function getTextureIndex(textureName) {
    const textureMap = {
        'grass': 0,
        'dirt': 1,
        'mud': 2,
        'sand': 3,
        'rock': 4,
        'snow': 5
    };
    return textureMap[textureName] !== undefined ? textureMap[textureName] : 0;
}

// Paint panel UI event handlers
document.getElementById('brush-size-slider').addEventListener('input', (e) => {
    editorState.paintBrushSize = parseFloat(e.target.value);
    document.getElementById('brush-size-value').textContent = editorState.paintBrushSize.toFixed(0);
    updateBrushCursorSize();
});

document.getElementById('brush-opacity-slider').addEventListener('input', (e) => {
    editorState.paintBrushOpacity = parseFloat(e.target.value);
    document.getElementById('brush-opacity-value').textContent = editorState.paintBrushOpacity.toFixed(1);
});

// Texture selection buttons
document.querySelectorAll('.paint-texture-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const textureName = e.currentTarget.getAttribute('data-texture');
        editorState.paintTexture = textureName;

        // Update button styles
        document.querySelectorAll('.paint-texture-btn').forEach(b => {
            b.style.borderColor = 'rgba(255,255,255,0.1)';
            b.style.background = 'rgba(255,255,255,0.05)';
        });
        e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.8)';
        e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)';

        showNotification(`Selected: ${textureName}`, 'info');
    });
});

// Mouse events for painting
canvas.addEventListener('mousedown', (event) => {
    if (!editorState.paintMode) return;
    if (event.button !== 0) return; // Only left click

    // Prevent other handlers from interfering
    event.preventDefault();
    event.stopPropagation();

    console.log('Paint mode mousedown - paint mode:', editorState.paintMode);
    editorState.isPainting = true;

    // Paint at current position
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);

    console.log('Raycaster intersects:', intersects.length);
    if (intersects.length > 0) {
        const intersection = intersects[0];
        const textureIndex = getTextureIndex(editorState.paintTexture);
        console.log('Painting texture:', editorState.paintTexture, 'index:', textureIndex);
        console.log('UV coordinates:', intersection.uv);
        paintOnTerrain(intersection.uv, editorState.paintBrushSize, editorState.paintBrushOpacity, textureIndex);
    } else {
        console.log('No intersection with ground!');
    }
}, true);

canvas.addEventListener('mousemove', (event) => {
    if (!editorState.paintMode) return;

    // Prevent other handlers from interfering
    if (editorState.isPainting) {
        event.preventDefault();
        event.stopPropagation();
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        brushCursor.position.copy(intersection.point);
        brushCursor.position.y += 0.1; // Slightly above ground

        // Paint if mouse is down
        if (editorState.isPainting) {
            const textureIndex = getTextureIndex(editorState.paintTexture);
            paintOnTerrain(intersection.uv, editorState.paintBrushSize, editorState.paintBrushOpacity, textureIndex);
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (editorState.paintMode) {
        editorState.isPainting = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    if (editorState.paintMode) {
        editorState.isPainting = false;
    }
});

// ==================== VISIBILITY TOGGLE ====================
function toggleSelectedVisibility() {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected', 'error');
        return;
    }

    editorState.selectedObjects.forEach(obj => {
        obj.visible = !obj.visible;
        if (obj.userData.outlineHelper) {
            obj.userData.outlineHelper.visible = obj.visible;
        }
    });

    const visible = editorState.selectedObjects[0].visible;
    showNotification(`Objects ${visible ? 'shown' : 'hidden'}`, 'info');
}

// ==================== ISOLATION MODE ====================
function toggleIsolationMode() {
    editorState.isolationMode = !editorState.isolationMode;

    if (editorState.isolationMode) {
        if (editorState.selectedObjects.length === 0) {
            showNotification('Select objects first to isolate', 'error');
            editorState.isolationMode = false;
            return;
        }

        // Hide everything except selected
        editorState.placedObjects.forEach(obj => {
            if (!editorState.selectedObjects.includes(obj)) {
                obj.visible = false;
            }
        });
        showNotification('Isolation mode ON', 'info');
    } else {
        // Show everything
        editorState.placedObjects.forEach(obj => {
            obj.visible = true;
        });
        showNotification('Isolation mode OFF', 'info');
    }
}

// ==================== ROTATION SNAPPING ====================
function toggleRotationSnap(angle = null) {
    if (angle !== null) {
        editorState.rotationSnapAngle = angle;
    }
    editorState.rotationSnap = !editorState.rotationSnap;
    showNotification(`Rotation snap ${editorState.rotationSnap ? 'ON' : 'OFF'} (${editorState.rotationSnapAngle}°)`, 'info');
}

function cycleRotationSnap() {
    const angles = [15, 45, 90];
    const currentIndex = angles.indexOf(editorState.rotationSnapAngle);
    const nextIndex = (currentIndex + 1) % angles.length;
    editorState.rotationSnapAngle = angles[nextIndex];
    editorState.rotationSnap = true;
    showNotification(`Rotation snap: ${editorState.rotationSnapAngle}°`, 'info');
}

// ==================== ASSET HOTBAR ====================
function setHotbarSlot(slot, type, file) {
    if (slot < 0 || slot > 4) return;
    editorState.hotbar[slot] = { type, file };
    showNotification(`Hotbar ${slot + 5} set to ${file}`, 'success');
    updateHotbarUI();
}

function placeFromHotbar(slot) {
    if (slot < 0 || slot > 4) return;
    const item = editorState.hotbar[slot];
    if (!item) {
        showNotification(`Hotbar slot ${slot + 5} is empty`, 'error');
        return;
    }

    editorState.selectedType = item.type;
    editorState.selectedFile = item.file;
    editorState.mode = 'place';
    createPreviewObject();
    showNotification(`Quick place: ${item.file} (Click ground)`, 'info');
}

function assignToHotbar(slot) {
    if (slot < 0 || slot > 4) return;
    if (!editorState.selectedFile || !editorState.selectedType) {
        showNotification('Select an object first', 'error');
        return;
    }
    setHotbarSlot(slot, editorState.selectedType, editorState.selectedFile);
}

function updateHotbarUI() {
    // Will update UI if panel exists
    const panel = document.getElementById('hotbar-panel');
    if (!panel) return;

    editorState.hotbar.forEach((item, index) => {
        const slot = panel.querySelector(`[data-slot="${index}"]`);
        if (slot) {
            if (item) {
                const name = item.file.replace(/\.(glb|gltf)$/i, '').replace(/^(SM_|SK_)(Bld_|Env_|Veh_|Prop_)?/, '').substring(0, 10);
                slot.textContent = name;
                slot.style.opacity = '1';
            } else {
                slot.textContent = index + 5;
                slot.style.opacity = '0.3';
            }
        }
    });
}

// ==================== RECENT ITEMS ====================
function addToRecentItems(type, file) {
    const item = { type, file };
    // Remove if already exists
    editorState.recentItems = editorState.recentItems.filter(i => i.file !== file);
    // Add to front
    editorState.recentItems.unshift(item);
    // Limit to max
    if (editorState.recentItems.length > editorState.maxRecent) {
        editorState.recentItems.pop();
    }
    updateRecentItemsUI();
}

function updateRecentItemsUI() {
    const panel = document.getElementById('recent-items-panel');
    if (!panel) return;

    const grid = panel.querySelector('.recent-grid');
    if (!grid) return;

    grid.innerHTML = '';
    editorState.recentItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'recent-item';
        card.style.cssText = `
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
        `;

        const name = item.file.replace(/\.(glb|gltf)$/i, '').replace(/^(SM_|SK_)(Bld_|Env_|Veh_|Prop_)?/, '').substring(0, 15);
        card.textContent = `${index + 1}. ${name}`;

        card.addEventListener('click', () => {
            editorState.selectedType = item.type;
            editorState.selectedFile = item.file;
            editorState.mode = 'place';
            createPreviewObject();
            showNotification(`Selected: ${item.file}`, 'info');
        });

        card.addEventListener('mouseenter', () => {
            card.style.background = 'rgba(96, 165, 250, 0.2)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.background = 'rgba(255,255,255,0.05)';
        });

        grid.appendChild(card);
    });
}

// ==================== OBJECT REPLACE ====================
function replaceSelectedObjects() {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected to replace', 'error');
        return;
    }

    if (!editorState.selectedFile || !editorState.selectedType) {
        showNotification('Select a replacement object first', 'error');
        return;
    }

    const replacements = [];

    editorState.selectedObjects.forEach(oldObj => {
        const path = editorState.selectedType === 'building'
            ? `assets/buildings/${editorState.selectedFile}`
            : `assets/props/${editorState.selectedFile}`;

        loader.load(path, (gltf) => {
            const newObj = gltf.scene;

            // Copy transform from old object
            newObj.position.copy(oldObj.position);
            newObj.rotation.copy(oldObj.rotation);
            newObj.scale.copy(oldObj.scale);

            newObj.userData = {
                type: editorState.selectedType,
                file: editorState.selectedFile
            };

            newObj.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Remove old, add new
            scene.remove(oldObj);
            scene.add(newObj);

            const index = editorState.placedObjects.indexOf(oldObj);
            if (index > -1) {
                editorState.placedObjects[index] = newObj;
            }

            replacements.push({ old: oldObj, new: newObj });
            removeSelectionOutline(oldObj);

            updateInfo();
        });
    });

    deselectObject();
    showNotification(`Replacing ${editorState.selectedObjects.length} object(s)`, 'success');
}

// ==================== MASS OPERATIONS ====================
function massRotate(axis, degrees) {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected', 'error');
        return;
    }

    const radians = THREE.MathUtils.degToRad(degrees);
    editorState.selectedObjects.forEach(obj => {
        obj.rotation[axis] += radians;
    });

    showNotification(`Rotated ${editorState.selectedObjects.length} objects ${degrees}° on ${axis.toUpperCase()}`, 'success');
}

function massScale(factor) {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected', 'error');
        return;
    }

    editorState.selectedObjects.forEach(obj => {
        obj.scale.multiplyScalar(factor);
    });

    showNotification(`Scaled ${editorState.selectedObjects.length} objects by ${factor}x`, 'success');
}

function massSetScale(value) {
    if (editorState.selectedObjects.length === 0) {
        showNotification('No objects selected', 'error');
        return;
    }

    editorState.selectedObjects.forEach(obj => {
        obj.scale.set(value, value, value);
    });

    showNotification(`Set scale to ${value} for ${editorState.selectedObjects.length} objects`, 'success');
}

// ==================== GIZMO SIZE ====================
function adjustGizmoSize(delta) {
    editorState.gizmoSize = Math.max(0.5, Math.min(3.0, editorState.gizmoSize + delta));
    transformControls.setSize(editorState.gizmoSize);
    showNotification(`Gizmo size: ${editorState.gizmoSize.toFixed(1)}x`, 'info');
}

// ==================== OBJECT GROUPING ====================
function createGroup() {
    if (editorState.selectedObjects.length < 2) {
        showNotification('Select at least 2 objects to group', 'error');
        return;
    }

    const group = new THREE.Group();
    group.userData.isGroup = true;
    group.userData.groupId = Date.now();

    // Calculate center
    const box = new THREE.Box3();
    editorState.selectedObjects.forEach(obj => box.expandByObject(obj));
    const center = box.getCenter(new THREE.Vector3());

    group.position.copy(center);

    // Add objects to group
    editorState.selectedObjects.forEach(obj => {
        const worldPos = obj.position.clone();
        const worldRot = obj.rotation.clone();
        const worldScale = obj.scale.clone();

        scene.remove(obj);
        group.add(obj);

        // Maintain world position
        obj.position.set(
            worldPos.x - center.x,
            worldPos.y - center.y,
            worldPos.z - center.z
        );
    });

    scene.add(group);
    editorState.placedObjects.push(group);
    editorState.groups.push(group);

    deselectObject();
    selectObject(group);

    showNotification(`Grouped ${editorState.selectedObjects.length} objects`, 'success');
}

function ungroupSelected() {
    if (!editorState.selectedObject || !editorState.selectedObject.userData.isGroup) {
        showNotification('Select a group to ungroup', 'error');
        return;
    }

    const group = editorState.selectedObject;
    const children = [...group.children];

    children.forEach(child => {
        const worldPos = new THREE.Vector3();
        const worldRot = new THREE.Euler();
        const worldScale = new THREE.Vector3();

        child.getWorldPosition(worldPos);
        child.getWorldQuaternion(new THREE.Quaternion()).toEuler(worldRot);
        child.getWorldScale(worldScale);

        group.remove(child);
        scene.add(child);

        child.position.copy(worldPos);
        child.rotation.copy(worldRot);
        child.scale.copy(worldScale);

        editorState.placedObjects.push(child);
    });

    scene.remove(group);
    editorState.placedObjects = editorState.placedObjects.filter(obj => obj !== group);
    editorState.groups = editorState.groups.filter(g => g !== group);

    deselectObject();
    showNotification('Group disbanded', 'success');
}

// ==================== ANIMATION LOOP ====================
let particleLastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time for particle updates
    const particleCurrentTime = performance.now();
    const delta = (particleCurrentTime - particleLastTime) / 1000; // Convert to seconds
    particleLastTime = particleCurrentTime;

    controls.update();
    updateSelectionOutlines();
    updateStats();

    // Update all particle systems
    editorState.placedParticles.forEach(particleSystem => {
        particleSystem.update(delta);
    });

    // Use post-processing composer if enabled
    if (postProcessing.enabled) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    updateInfo();
}

animate();

// Generate initial clouds
generateClouds();

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    ssaoPass.setSize(window.innerWidth, window.innerHeight);
});

// ==================== GROUND TEXTURE SELECTION ====================
document.querySelectorAll('[data-texture]').forEach(card => {
    card.addEventListener('click', () => {
        const textureId = card.dataset.texture;

        // Visual feedback
        document.querySelectorAll('[data-texture]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (textureId === 'default') {
            resetGroundTexture();
        } else {
            const texture = groundTextures[textureId];
            if (texture && texture.path) {
                loadGroundTexture(textureId, texture.name, texture.path);
            }
        }
    });
});

// ==================== SKYBOX SELECTION ====================
document.querySelectorAll('[data-skybox]').forEach(card => {
    card.addEventListener('click', () => {
        const skyboxId = card.dataset.skybox;

        // Visual feedback
        document.querySelectorAll('[data-skybox]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        changeSkybox(skyboxId);
    });
});

// Sun/Moon position controls
const sunAltitudeInput = document.getElementById('sun-altitude');
const sunAltitudeValue = document.getElementById('sun-altitude-value');
const sunAzimuthInput = document.getElementById('sun-azimuth');
const sunAzimuthValue = document.getElementById('sun-azimuth-value');
const fogDistanceInput = document.getElementById('fog-distance');
const fogDistanceValue = document.getElementById('fog-distance-value');

if (sunAltitudeInput) {
    sunAltitudeInput.addEventListener('input', (e) => {
        sunAltitude = parseFloat(e.target.value);
        sunAltitudeValue.textContent = sunAltitude;
        updateSunPosition();
    });
}

if (sunAzimuthInput) {
    sunAzimuthInput.addEventListener('input', (e) => {
        sunAzimuth = parseFloat(e.target.value);
        sunAzimuthValue.textContent = sunAzimuth;
        updateSunPosition();
    });
}

if (fogDistanceInput) {
    fogDistanceInput.addEventListener('input', (e) => {
        fogDistance = parseFloat(e.target.value);
        fogDistanceValue.textContent = fogDistance;
        scene.fog.far = fogDistance;
    });
}

// Cloud controls
const cloudsEnabledInput = document.getElementById('clouds-enabled');
const cloudDensityInput = document.getElementById('cloud-density');
const cloudDensityValue = document.getElementById('cloud-density-value');
const cloudHeightInput = document.getElementById('cloud-height');
const cloudHeightValue = document.getElementById('cloud-height-value');
const cloudScaleInput = document.getElementById('cloud-scale');
const cloudScaleValue = document.getElementById('cloud-scale-value');
const cloudSpreadInput = document.getElementById('cloud-spread');
const cloudSpreadValue = document.getElementById('cloud-spread-value');
const cloudOpacityInput = document.getElementById('cloud-opacity');
const cloudOpacityValue = document.getElementById('cloud-opacity-value');
const regenerateCloudsBtn = document.getElementById('regenerate-clouds-btn');

if (cloudsEnabledInput) {
    cloudsEnabledInput.addEventListener('change', (e) => {
        toggleClouds(e.target.checked);
    });
}

if (cloudDensityInput) {
    cloudDensityInput.addEventListener('input', (e) => {
        const density = parseInt(e.target.value);
        cloudDensityValue.textContent = density;
        updateCloudSettings({ density });
    });
}

if (cloudHeightInput) {
    cloudHeightInput.addEventListener('input', (e) => {
        const height = parseInt(e.target.value);
        cloudHeightValue.textContent = height;
        updateCloudSettings({ height });
    });
}

if (cloudScaleInput) {
    cloudScaleInput.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        cloudScaleValue.textContent = scale;
        updateCloudSettings({ scale });
    });
}

if (cloudSpreadInput) {
    cloudSpreadInput.addEventListener('input', (e) => {
        const spread = parseInt(e.target.value);
        cloudSpreadValue.textContent = spread;
        updateCloudSettings({ spread });
    });
}

if (cloudOpacityInput) {
    cloudOpacityInput.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        cloudOpacityValue.textContent = opacity.toFixed(2);
        updateCloudSettings({ opacity });
    });
}

if (regenerateCloudsBtn) {
    regenerateCloudsBtn.addEventListener('click', () => {
        generateClouds();
        showNotification('Clouds regenerated', 'success');
    });
}

// ==================== HELP MENU ====================
function showHelpMenu() {
    const helpHTML = `
        <div id="help-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        ">
            <div style="
                background: linear-gradient(135deg, rgba(10, 14, 26, 0.95), rgba(20, 24, 36, 0.95));
                border: 2px solid rgba(96, 165, 250, 0.3);
                border-radius: 16px;
                padding: 30px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            ">
                <h2 style="margin: 0 0 20px 0; color: #60a5fa; font-size: 28px; text-align: center;">
                    🎮 Level Editor - Keyboard Shortcuts
                </h2>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Transform Modes</h3>
                        <p><kbd>W</kbd> - Move (Translate)</p>
                        <p><kbd>E</kbd> - Rotate</p>
                        <p><kbd>R</kbd> - Scale</p>
                        <p><kbd>V</kbd> - Select Mode</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Selection</h3>
                        <p><kbd>Click</kbd> - Select object</p>
                        <p><kbd>Shift+Click</kbd> - Multi-select</p>
                        <p><kbd>Ctrl+Click</kbd> - Toggle selection</p>
                        <p><kbd>Esc</kbd> - Deselect all</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Edit</h3>
                        <p><kbd>Ctrl+C</kbd> - Copy</p>
                        <p><kbd>Ctrl+V</kbd> - Paste</p>
                        <p><kbd>Ctrl+D</kbd> - Duplicate</p>
                        <p><kbd>Delete</kbd> - Delete selected</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">History</h3>
                        <p><kbd>Ctrl+Z</kbd> - Undo</p>
                        <p><kbd>Ctrl+Y</kbd> - Redo</p>
                        <p><em>50 action history</em></p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Camera Bookmarks</h3>
                        <p><kbd>F1-F4</kbd> - Save bookmark</p>
                        <p><kbd>1-4</kbd> - Recall bookmark</p>
                        <p><em>Quick camera positions</em></p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">File</h3>
                        <p><kbd>Ctrl+S</kbd> - Save level</p>
                        <p><em>Auto-saves every 2 min</em></p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">View</h3>
                        <p><kbd>P</kbd> - Toggle post-processing</p>
                        <p><kbd>G</kbd> - Toggle grid</p>
                        <p><kbd>S</kbd> - Toggle statistics</p>
                        <p><kbd>X</kbd> - Toggle wireframe</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Tools</h3>
                        <p><kbd>F</kbd> - Focus on selected</p>
                        <p><kbd>A</kbd> - Align to ground</p>
                        <p><kbd>T</kbd> - Toggle random placement</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Advanced</h3>
                        <p><kbd>I</kbd> - Toggle visibility</p>
                        <p><kbd>O</kbd> - Isolation mode</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Grouping</h3>
                        <p><kbd>Ctrl+G</kbd> - Group objects</p>
                        <p><kbd>Ctrl+Shift+G</kbd> - Ungroup</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Rotation</h3>
                        <p><kbd>Q</kbd> - Cycle snap (15/45/90°)</p>
                        <p><kbd>Ctrl+Arrows</kbd> - Mass rotate</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Preview Rotation</h3>
                        <p><kbd>← →</kbd> - Rotate preview ±15°</p>
                        <p><em>Before placing object</em></p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Hotbar</h3>
                        <p><kbd>5-9</kbd> - Quick place</p>
                        <p><kbd>Shift+5-9</kbd> - Assign hotbar</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Mass Edit</h3>
                        <p><kbd>B</kbd> - Replace objects</p>
                        <p><kbd>,</kbd> / <kbd>.</kbd> - Scale down/up</p>
                        <p><kbd>+</kbd> / <kbd>-</kbd> - Gizmo size</p>
                    </div>
                </div>

                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(96, 165, 250, 0.2);">
                    <h3 style="color: #60a5fa; margin-bottom: 10px;">Features</h3>
                    <ul style="columns: 2; column-gap: 20px;">
                        <li>Multi-select (Shift/Ctrl+Click)</li>
                        <li>Copy/paste/duplicate</li>
                        <li>Undo/redo (50 actions)</li>
                        <li>Auto-save (2 min)</li>
                        <li>Camera bookmarks (F1-F4)</li>
                        <li>Focus on selected (F)</li>
                        <li>Grid snapping</li>
                        <li>PBR ground textures</li>
                        <li>Transform controls</li>
                        <li>Selection outlines</li>
                        <li>Save/load levels</li>
                        <li>Post-processing (Bloom, SSAO)</li>
                        <li>Dynamic skybox/lighting</li>
                        <li>Statistics panel (FPS, triangles)</li>
                        <li>Wireframe mode</li>
                        <li>Random placement</li>
                        <li>Align to ground</li>
                        <li>Visibility toggle</li>
                        <li>Isolation mode</li>
                        <li>Object grouping/parenting</li>
                        <li>Rotation snapping (15/45/90°)</li>
                        <li>Asset hotbar (5-9 keys)</li>
                        <li>Recent items panel</li>
                        <li>Object replace</li>
                        <li>Mass operations (rotate/scale)</li>
                        <li>Gizmo size adjustment</li>
                        <li>Preview rotation (before placement)</li>
                    </ul>
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button id="close-help" style="
                        padding: 12px 32px;
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.2));
                        border: 1px solid rgba(59, 130, 246, 0.6);
                        border-radius: 8px;
                        color: #60a5fa;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        Close (Esc)
                    </button>
                </div>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = helpHTML;
    document.body.appendChild(overlay);

    const closeHelp = () => {
        overlay.remove();
    };

    document.getElementById('close-help').addEventListener('click', closeHelp);
    overlay.addEventListener('click', (e) => {
        if (e.target.id === 'help-overlay') closeHelp();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeHelp();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Function to change map size
function changeMapSize(newSize) {
    // Update global ground size
    groundSize = newSize;

    // Remove old ground
    scene.remove(ground);
    ground.geometry.dispose();
    ground.material.dispose();

    // Create new ground with new size
    const newGroundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
    const newGroundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a5f3a,
        roughness: 0.8,
        metalness: 0.2
    });

    ground = new THREE.Mesh(newGroundGeometry, newGroundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Clear all placed objects
    editorState.placedObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    editorState.placedObjects = [];

    // Update grid helper
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(groundSize, Math.floor(groundSize / 2), 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Update directional light shadow camera
    dirLight.shadow.camera.left = -groundSize / 2;
    dirLight.shadow.camera.right = groundSize / 2;
    dirLight.shadow.camera.top = groundSize / 2;
    dirLight.shadow.camera.bottom = -groundSize / 2;
    dirLight.shadow.camera.updateProjectionMatrix();

    updateInfo();
    showNotification(`Map size changed to ${groundSize}x${groundSize}`, 'success');
}

// ==================== SETTINGS PANEL ====================
function showSettingsPanel() {
    const settingsHTML = `
        <div id="settings-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        ">
            <div style="
                background: linear-gradient(135deg, rgba(10, 14, 26, 0.95), rgba(20, 24, 36, 0.95));
                border: 2px solid rgba(96, 165, 250, 0.3);
                border-radius: 16px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            ">
                <h2 style="margin: 0 0 20px 0; color: #60a5fa; font-size: 28px; text-align: center;">
                    ⚙️ Editor Settings
                </h2>

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Grid Snap</h3>
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-grid-snap" ${editorState.gridSnap ? 'checked' : ''}>
                            <span>Enable grid snapping</span>
                        </label>
                        <div style="margin-top: 10px;">
                            <label>Grid Size:
                                <input type="number" id="setting-grid-size" value="${editorState.gridSize}"
                                    min="0.1" max="10" step="0.1"
                                    style="width: 80px; margin-left: 10px; padding: 4px; background: rgba(0,0,0,0.3); border: 1px solid rgba(96, 165, 250, 0.3); color: white; border-radius: 4px;">
                            </label>
                        </div>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Rotation Snap</h3>
                        <label>Current: ${editorState.rotationSnap ? editorState.rotationSnap + '°' : 'Off'}</label>
                        <p style="opacity: 0.7; font-size: 12px; margin-top: 5px;">Press Q to cycle through snap angles</p>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Auto-save</h3>
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-auto-save" checked>
                            <span>Auto-save every 2 minutes</span>
                        </label>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Display</h3>
                        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <input type="checkbox" id="setting-post-processing" ${postProcessing.enabled ? 'checked' : ''}>
                            <span>Post-processing (Bloom, SSAO)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <input type="checkbox" id="setting-grid" ${gridHelper.visible ? 'checked' : ''}>
                            <span>Show grid</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="setting-stats" ${editorState.statsVisible ? 'checked' : ''}>
                            <span>Show statistics panel</span>
                        </label>
                    </div>

                    <div>
                        <h3 style="color: #60a5fa; margin-bottom: 10px;">Map Size</h3>
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <span>Terrain Size:</span>
                            <select id="setting-map-size" style="
                                padding: 6px 12px;
                                background: rgba(0,0,0,0.3);
                                border: 1px solid rgba(96, 165, 250, 0.3);
                                color: white;
                                border-radius: 4px;
                                cursor: pointer;
                                flex: 1;
                            ">
                                <option value="100" ${groundSize === 100 ? 'selected' : ''}>Small (100x100)</option>
                                <option value="200" ${groundSize === 200 ? 'selected' : ''}>Medium (200x200)</option>
                                <option value="300" ${groundSize === 300 ? 'selected' : ''}>Large (300x300)</option>
                                <option value="500" ${groundSize === 500 ? 'selected' : ''}>Huge (500x500)</option>
                            </select>
                        </label>
                        <p style="opacity: 0.7; font-size: 11px; margin-top: 8px;">Warning: Changing map size will clear placed objects</p>
                    </div>
                </div>

                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    <button id="save-settings" style="
                        padding: 12px 32px;
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.3));
                        border: 1px solid rgba(59, 130, 246, 0.8);
                        border-radius: 8px;
                        color: #60a5fa;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        Apply
                    </button>
                    <button id="close-settings" style="
                        padding: 12px 32px;
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.2));
                        border: 1px solid rgba(59, 130, 246, 0.6);
                        border-radius: 8px;
                        color: #60a5fa;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = settingsHTML;
    document.body.appendChild(overlay);

    const closeSettings = () => {
        overlay.remove();
    };

    const saveSettings = () => {
        // Grid snap
        editorState.gridSnap = document.getElementById('setting-grid-snap').checked;
        const newGridSize = parseFloat(document.getElementById('setting-grid-size').value);
        if (!isNaN(newGridSize) && newGridSize > 0) {
            editorState.gridSize = newGridSize;
        }

        // Post-processing
        const ppEnabled = document.getElementById('setting-post-processing').checked;
        togglePostProcessing(ppEnabled);

        // Grid visibility
        const gridVisible = document.getElementById('setting-grid').checked;
        gridHelper.visible = gridVisible;

        // Stats visibility
        const statsVisible = document.getElementById('setting-stats').checked;
        if (statsVisible) {
            if (!editorState.statsVisible) toggleStats();
        } else {
            if (editorState.statsVisible) toggleStats();
        }

        // Map size
        const newMapSize = parseInt(document.getElementById('setting-map-size').value);
        if (newMapSize !== groundSize) {
            if (confirm(`Changing map size will clear all placed objects. Continue?`)) {
                changeMapSize(newMapSize);
            }
        }

        showNotification('Settings saved', 'success');
        closeSettings();
    };

    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    overlay.addEventListener('click', (e) => {
        if (e.target.id === 'settings-overlay') closeSettings();
    });

    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeSettings();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ==================== INITIALIZATION ====================
console.log('🎮 Level Editor Pro - Ready!');
showNotification('Level Editor loaded! Press H for help', 'success');
updateInfo();

// Set up spawn point card click handlers
document.querySelectorAll('.item-card[data-type="spawn"]').forEach(card => {
    card.addEventListener('click', () => {
        const team = card.getAttribute('data-subtype');

        // Clear other selections
        document.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));

        // Select this card
        card.classList.add('selected');

        // Set mode and spawn type
        editorState.mode = 'place';
        editorState.selectedSpawnType = team;

        console.log(`Selected ${team} spawn mode`);
        showNotification(`Click to place ${team === 'team1' ? 'Team 1' : 'Team 2'} spawn point`, 'info');
    });
});

// Check for auto-save on startup
setTimeout(() => {
    loadAutoSave();
}, 1000);
