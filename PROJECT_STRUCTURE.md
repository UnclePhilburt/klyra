# KLYRA - Project Structure Documentation

## 📁 Project Overview

Clean, modular architecture for the KLYRA multiplayer roguelite game.

```
klyra/
├── 📄 Root Website Files
├── 🎮 Game Implementation
├── 📊 Assets & Resources
├── 🔧 Configuration
└── 📚 Documentation
```

---

## 🗂️ Complete Directory Structure

```
klyra/
│
├── index.html              # Main homepage (modern landing page)
├── characters.html         # Characters showcase page
├── lore.html              # Game lore and world building
├── server.js              # Multiplayer server (Node.js + Socket.IO)
├── package.json           # Node dependencies
├── render.yaml            # Render deployment config
├── .gitignore             # Git ignore rules
│
├── 📁 characters/         # Individual character detail pages
│   ├── aldric.html       # Knight tank details
│   ├── hiroshi.html      # Samurai details
│   └── malachar.html     # Necromancer details
│
├── 📁 game/              # Main Phaser 3 game implementation
│   ├── index.html        # Game entry point with menu system
│   │
│   ├── 📁 js/           # Game JavaScript modules
│   │   │
│   │   ├── main.js                      # Phaser game initialization
│   │   ├── config.js                    # Game configuration constants
│   │   │
│   │   ├── 📁 config/                   # Configuration modules
│   │   │   └── characters.js            # Character definitions & stats
│   │   │
│   │   ├── 📁 entities/                 # Game entity classes (MODULAR!)
│   │   │   ├── Player.js                # Player logic (150 lines)
│   │   │   ├── PlayerSprite.js          # Player visual rendering (200 lines)
│   │   │   ├── PlayerUI.js              # Player UI elements (250 lines)
│   │   │   ├── Enemy.js                 # Enemy entities
│   │   │   ├── Item.js                  # Item entities
│   │   │   └── README.md                # Entity architecture documentation
│   │   │
│   │   ├── 📁 managers/                 # Game system managers
│   │   │   └── NetworkManager.js        # Network/multiplayer handling
│   │   │
│   │   ├── 📁 scenes/                   # Phaser game scenes
│   │   │   ├── BootScene.js             # Initial loading scene
│   │   │   ├── MenuScene.js             # Main menu
│   │   │   ├── CharacterSelectScene.js  # Character selection
│   │   │   ├── LobbyScene.js            # Multiplayer lobby
│   │   │   └── GameScene.js             # Main gameplay scene
│   │   │
│   │   └── 📁 utils/                    # Utility classes
│   │       ├── BiomeGenerator.js        # Procedural world generation
│   │       └── MobileControls.js        # Touch controls for mobile
│   │
│   ├── 📁 mainmenu/                     # Custom menu system
│   │   ├── mainmenu.js                  # Menu logic
│   │   ├── mainmenu.css                 # Menu styles
│   │   ├── CharacterSelectManager.js    # Character selection UI
│   │   ├── character-select-styles.css  # Character select styles
│   │   └── ProgressionSystem.js         # Player progression tracking
│   │
│   ├── 📁 assets/                       # Game assets
│   │   ├── sprites/                     # Character sprite sheets
│   │   ├── tilesets/                    # Tileset images
│   │   ├── audio/                       # Sound effects & music
│   │   └── ui/                          # UI graphics
│   │
│   └── 📁 tilesets/                     # Additional tileset resources
│
└── 📁 assets/                            # Website assets
    ├── images/                           # Marketing images
    └── icons/                            # Favicon, icons
```

---

## 🎯 Module Responsibilities

### Root Level
| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main landing page with modern design | ✅ Active |
| `characters.html` | Character showcase & comparison | ✅ Active |
| `lore.html` | Game world lore & story | ✅ Active |
| `server.js` | Multiplayer server backend | ✅ Active |
| `package.json` | Node.js dependencies | ✅ Active |
| `render.yaml` | Deployment configuration | ✅ Active |

### Game Directory (`/game/`)
| Module | Purpose | Lines | Status |
|--------|---------|-------|--------|
| `index.html` | Game launcher with menu | - | ✅ Active |
| `main.js` | Phaser initialization | ~100 | ✅ Active |
| `config.js` | Game constants | ~50 | ✅ Active |

### Entities (`/game/js/entities/`) - **MODULAR!**
| File | Responsibility | Lines | Dependencies |
|------|---------------|-------|--------------|
| `Player.js` | Player logic & state | 150 | PlayerSprite, PlayerUI |
| `PlayerSprite.js` | Visual rendering | 200 | None |
| `PlayerUI.js` | UI rendering (health, name) | 250 | None |
| `Enemy.js` | Enemy behavior | ~200 | None |
| `Item.js` | Item functionality | ~100 | None |
| `README.md` | Architecture docs | - | - |

### Managers (`/game/js/managers/`)
| File | Purpose | Status |
|------|---------|--------|
| `NetworkManager.js` | Socket.IO multiplayer sync | ✅ Active |

### Scenes (`/game/js/scenes/`)
| Scene | Purpose | Status |
|-------|---------|--------|
| `BootScene.js` | Asset loading | ✅ Active |
| `MenuScene.js` | Main menu | ✅ Active |
| `CharacterSelectScene.js` | Character picker | ✅ Active |
| `LobbyScene.js` | Multiplayer lobby | ✅ Active |
| `GameScene.js` | Main gameplay | ✅ Active |

### Utils (`/game/js/utils/`)
| Utility | Purpose | Status |
|---------|---------|--------|
| `BiomeGenerator.js` | Procedural map generation | ✅ Active |
| `MobileControls.js` | Touch/mobile input | ✅ Active |

---

## 🏗️ Architecture Patterns

### 1. **Modular Entity System**
Each entity is split into focused responsibilities:
- **Logic** (Player.js) - Game state & behavior
- **Rendering** (PlayerSprite.js) - Visual display
- **UI** (PlayerUI.js) - Interface elements

**Benefits:**
✅ Separation of concerns
✅ Easy to maintain and debug
✅ Reusable components
✅ Independently testable

### 2. **Scene-Based Game Flow**
Phaser scenes manage different game states:
```
Boot → Menu → CharacterSelect → Lobby → Game
```

### 3. **Manager Pattern**
Centralized systems (NetworkManager) handle cross-cutting concerns.

### 4. **Configuration-Driven**
Character stats and game constants in separate config files.

---

## 📦 Dependencies

### Frontend
- **Phaser 3** (v3.60.0) - Game framework
- **Socket.IO Client** (v4.5.4) - Multiplayer sync

### Backend
- **Node.js** - Runtime
- **Express** - Web server
- **Socket.IO** - WebSocket server
- **UUID** - Unique ID generation

---

## 🚀 Deployment

### Development
```bash
# Install dependencies
npm install

# Start server
node server.js

# Open browser to localhost:3000
```

### Production (Render)
Configured via `render.yaml`:
- Auto-deploys from GitHub
- Environment: Node 18.x
- Port: 3000
- Health check: `/health`

---

## 📝 Code Standards

### Naming Conventions
- **Classes**: PascalCase (`Player`, `PlayerSprite`)
- **Files**: PascalCase for classes (`Player.js`)
- **Variables**: camelCase (`playerHealth`)
- **Constants**: UPPER_SNAKE_CASE (`TILE_SIZE`)

### File Organization
- One class per file
- Related functionality grouped in folders
- README.md in complex folders

### Comments
- JSDoc for public methods
- Inline comments for complex logic
- Section headers with `===` separators

---

## 🧹 Recent Cleanup

### Deleted (Unused Files)
❌ `/game/klyra2/` - Alternative game implementation (not used)
❌ `Default.html` - Unknown purpose
❌ `client-example.html` - Server test client

### Before Cleanup
- 650+ line monolithic Player.js
- 2 game implementations
- Orphaned test files
- Mixed concerns

### After Cleanup
- 3 focused Player modules (150, 200, 250 lines)
- 1 clean game implementation
- No orphaned files
- Clear separation of concerns

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PROJECT_STRUCTURE.md` | This file - project overview |
| `/game/js/entities/README.md` | Entity architecture details |
| `SERVER_README.md` | Server documentation |
| `INTEGRATION_SUMMARY.md` | Integration guide |

---

## 🔄 Development Workflow

### Adding New Feature
1. Identify module category (entity, scene, manager, util)
2. Create new file in appropriate folder
3. Follow modular pattern (separate concerns)
4. Update this documentation
5. Test independently

### Modifying Existing Code
1. Identify the specific module
2. Make focused changes
3. Update related documentation
4. Test affected systems

---

## 🎯 Future Expansion

Potential new modules:
- `PlayerAnimations.js` - Animation state machine
- `PlayerEffects.js` - Buff/debuff visuals
- `PlayerAudio.js` - Sound management
- `PlayerInput.js` - Input abstraction
- `PlayerInventory.js` - Equipment UI

The modular architecture makes these additions straightforward!

---

## 🔒 Critical Files (Do Not Delete)

### Game Core
- `game/index.html`
- `game/js/main.js`
- `game/js/config.js`
- All files in `/game/js/entities/`
- All files in `/game/js/scenes/`

### Website
- `index.html`
- `characters.html`
- `lore.html`

### Server
- `server.js`
- `package.json`

---

## 📊 Project Statistics

- **Total JavaScript Files**: 22
- **Total Lines of Code**: ~5,000
- **Modular Entities**: 3 (Player, PlayerSprite, PlayerUI)
- **Game Scenes**: 5
- **Character Classes**: 6
- **Supported Players**: 10 (multiplayer)

---

## 🤝 Contributing

When adding new code:
1. **Follow modular pattern** - Separate concerns
2. **Document thoroughly** - Update this file
3. **Keep files focused** - Max ~300 lines per file
4. **Write clean code** - Use consistent style

---

**Last Updated**: 2025-11-12
**Version**: 2.0 (Modular Refactor)
**Status**: ✅ Production Ready
