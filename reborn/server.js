const express = require('express');
const app = express();

// Serve static files (HTML, JS, assets) from project root
app.use(express.static(__dirname));

const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: [
            "http://localhost:9000",
            "https://klyra.lol",
            "https://www.klyra.lol",
            "https://unclephilburt.github.io"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store connected players
const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Add new player
    players[socket.id] = {
        id: socket.id,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        characterIndex: 0,
        animationIndex: 0,
        isRifleEquipped: false,
        isJogging: false,
        isCrouching: false
    };

    // Send existing players to the new player
    socket.emit('currentPlayers', players);

    // Tell other players about the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Handle player movement updates
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;
            players[socket.id].isJogging = movementData.isJogging || false;
            players[socket.id].isCrouching = movementData.isCrouching || false;

            // Broadcast to all other players
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: movementData.position,
                rotation: movementData.rotation,
                isJogging: movementData.isJogging || false,
                isCrouching: movementData.isCrouching || false
            });
        }
    });

    // Handle animation changes
    socket.on('animationChange', (data) => {
        if (players[socket.id]) {
            players[socket.id].animationIndex = data.animationIndex;

            socket.broadcast.emit('playerAnimationChange', {
                id: socket.id,
                animationIndex: data.animationIndex
            });
        }
    });

    // Handle character changes
    socket.on('characterChange', (data) => {
        if (players[socket.id]) {
            players[socket.id].characterIndex = data.characterIndex;

            socket.broadcast.emit('playerCharacterChange', {
                id: socket.id,
                characterIndex: data.characterIndex
            });
        }
    });

    // Handle weapon toggle
    socket.on('weaponToggle', (data) => {
        if (players[socket.id]) {
            players[socket.id].isRifleEquipped = data.isRifleEquipped;

            socket.broadcast.emit('playerWeaponToggle', {
                id: socket.id,
                isRifleEquipped: data.isRifleEquipped
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);

        // Remove from active editors
        delete activeEditors[socket.id];
        io.emit('editorDisconnected', socket.id);
    });

    // ===== COLLABORATIVE LEVEL EDITOR =====

    // Join editor session
    socket.on('joinEditor', (data) => {
        // Assign a unique color to this editor
        const editorColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#88ff44'];
        const usedColors = Object.values(activeEditors).map(e => e.color);
        const availableColors = editorColors.filter(c => !usedColors.includes(c));
        const assignedColor = availableColors.length > 0 ? availableColors[0] : editorColors[Object.keys(activeEditors).length % editorColors.length];

        activeEditors[socket.id] = {
            id: socket.id,
            name: data.name || `Editor ${socket.id.substring(0, 5)}`,
            color: assignedColor,
            preview: null
        };
        console.log(`Editor joined: ${activeEditors[socket.id].name} (${assignedColor})`);

        // Send list of active editors to everyone
        io.emit('activeEditors', Object.values(activeEditors));

        // Send current level state to new editor
        socket.emit('syncLevel', currentLevelState);
    });

    // Object placed in editor
    socket.on('editor:objectPlaced', (data) => {
        console.log('Object placed:', data);
        socket.broadcast.emit('editor:objectPlaced', data);
        updateLevelState('add', data);
    });

    // Object moved
    socket.on('editor:objectMoved', (data) => {
        socket.broadcast.emit('editor:objectMoved', data);
        updateLevelState('update', data);
    });

    // Object rotated
    socket.on('editor:objectRotated', (data) => {
        socket.broadcast.emit('editor:objectRotated', data);
        updateLevelState('update', data);
    });

    // Object scaled
    socket.on('editor:objectScaled', (data) => {
        socket.broadcast.emit('editor:objectScaled', data);
        updateLevelState('update', data);
    });

    // Object deleted
    socket.on('editor:objectDeleted', (data) => {
        socket.broadcast.emit('editor:objectDeleted', data);
        updateLevelState('delete', data);
    });

    // Terrain painted
    socket.on('editor:terrainPainted', (data) => {
        socket.broadcast.emit('editor:terrainPainted', data);
    });

    // Ground texture changed
    socket.on('editor:groundTextureChanged', (data) => {
        socket.broadcast.emit('editor:groundTextureChanged', data);
        if (currentLevelState.terrain) {
            currentLevelState.terrain.groundTexture = data.texture;
        }
    });

    // Sky color changed
    socket.on('editor:skyColorChanged', (data) => {
        socket.broadcast.emit('editor:skyColorChanged', data);
        if (!currentLevelState.environment) {
            currentLevelState.environment = {};
        }
        currentLevelState.environment.skyColor = data.color;
    });

    // Preview updated (hovering object)
    socket.on('editor:previewUpdate', (data) => {
        if (activeEditors[socket.id]) {
            activeEditors[socket.id].preview = data;
            // Broadcast with editor color
            socket.broadcast.emit('editor:previewUpdate', {
                editorId: socket.id,
                color: activeEditors[socket.id].color,
                ...data
            });
        }
    });

    // Preview cleared
    socket.on('editor:previewClear', () => {
        if (activeEditors[socket.id]) {
            activeEditors[socket.id].preview = null;
            socket.broadcast.emit('editor:previewClear', { editorId: socket.id });
        }
    });

    // Level saved
    socket.on('editor:levelSaved', (data) => {
        console.log('Level saved from editor');
        currentLevelState = data;
        socket.broadcast.emit('editor:levelSaved', { savedBy: activeEditors[socket.id]?.name });
    });
});

// Store active editors
const activeEditors = {};

// Store current level state for syncing new editors
let currentLevelState = {
    objects: [],
    lights: [],
    particles: [],
    terrain: {},
    environment: {}
};

// Update level state helper
function updateLevelState(action, data) {
    if (!currentLevelState.objects) currentLevelState.objects = [];

    if (action === 'add') {
        currentLevelState.objects.push(data);
    } else if (action === 'update') {
        const index = currentLevelState.objects.findIndex(obj => obj.uuid === data.uuid);
        if (index !== -1) {
            currentLevelState.objects[index] = { ...currentLevelState.objects[index], ...data };
        }
    } else if (action === 'delete') {
        currentLevelState.objects = currentLevelState.objects.filter(obj => obj.uuid !== data.uuid);
    }
}

// API endpoints for level editor
const fs = require('fs');
const path = require('path');

app.get('/api/list-props', (req, res) => {
    const propsDir = path.join(__dirname, 'assets', 'props');
    fs.readdir(propsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read props directory' });
        }
        const glbFiles = files.filter(f => f.endsWith('.glb') || f.endsWith('.gltf'));
        res.json(glbFiles);
    });
});

app.get('/api/list-buildings', (req, res) => {
    const buildingsDir = path.join(__dirname, 'assets', 'buildings');
    fs.readdir(buildingsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read buildings directory' });
        }
        const glbFiles = files.filter(f => f.endsWith('.glb') || f.endsWith('.gltf'));
        res.json(glbFiles);
    });
});

app.get('/api/list-textures/:folder', (req, res) => {
    const folder = req.params.folder;
    const textureDir = path.join(__dirname, 'assets', 'textures', 'ground', folder);
    fs.readdir(textureDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read texture directory' });
        }
        const textureFiles = files.filter(f =>
            f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.PNG') || f.endsWith('.JPG')
        );
        res.json(textureFiles);
    });
});

// Add JSON body parser for POST requests
app.use(express.json({ limit: '50mb' }));

// API endpoint to save level to server
app.post('/api/save-level', (req, res) => {
    const levelData = req.body;
    const levelName = req.body.levelName || 'autosave';
    const levelsDir = path.join(__dirname, 'levels');

    // Ensure levels directory exists
    if (!fs.existsSync(levelsDir)) {
        fs.mkdirSync(levelsDir, { recursive: true });
    }

    const filename = path.join(levelsDir, `${levelName}.json`);

    fs.writeFile(filename, JSON.stringify(levelData, null, 2), (err) => {
        if (err) {
            console.error('Error saving level:', err);
            return res.status(500).json({ error: 'Failed to save level' });
        }
        console.log(`Level saved: ${filename}`);
        res.json({ success: true, filename: `${levelName}.json` });
    });
});

// API endpoint to load level from server
app.get('/api/load-level/:name', (req, res) => {
    const levelName = req.params.name;
    const filename = path.join(__dirname, 'levels', `${levelName}.json`);

    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Level not found' });
        }
        res.json(JSON.parse(data));
    });
});

// API endpoint to list saved levels
app.get('/api/list-levels', (req, res) => {
    const levelsDir = path.join(__dirname, 'levels');
    fs.readdir(levelsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read levels directory' });
        }
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        res.json(jsonFiles);
    });
});

const PORT = process.env.PORT || 9000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Multiplayer server running on port ${PORT}`);
});
