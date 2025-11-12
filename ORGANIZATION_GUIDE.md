# Folder Organization & Modularity Guide

## 🎯 Philosophy

**One Responsibility Per File**
- Each file should do ONE thing well
- Max ~300 lines per file
- If a file gets too big, split it

**Modular = Maintainable**
- Easy to find bugs
- Easy to test
- Easy to reuse
- Easy to understand

---

## 📂 Where to Put New Code

### Adding a New Entity?
```
game/js/entities/YourEntity.js
```

**Pattern to follow:**
```javascript
class YourEntity {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        // Create modules
        this.sprite = new YourEntitySprite(...);
        this.ui = new YourEntityUI(...);
    }

    // ==================== LOGIC ====================
    update() { }

    // ==================== ACTIONS ====================
    performAction() { }

    // ==================== CLEANUP ====================
    destroy() { }
}
```

**Split into modules if complex:**
- `YourEntity.js` - Core logic
- `YourEntitySprite.js` - Visual rendering
- `YourEntityUI.js` - UI elements

---

### Adding a New Scene?
```
game/js/scenes/YourScene.js
```

**Pattern:**
```javascript
class YourScene extends Phaser.Scene {
    constructor() {
        super({ key: 'YourScene' });
    }

    preload() {
        // Load assets
    }

    create() {
        // Initialize scene
    }

    update(time, delta) {
        // Game loop
    }
}
```

---

### Adding a New Manager?
```
game/js/managers/YourManager.js
```

**Managers handle cross-cutting concerns:**
- Network (already exists)
- Audio
- Save/Load
- Analytics
- Input

**Pattern:**
```javascript
class YourManager {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        // Setup
        this.isInitialized = true;
    }

    // Manager methods
}

// Singleton instance
const yourManager = new YourManager();
```

---

### Adding a Utility Function?
```
game/js/utils/YourUtility.js
```

**Utilities are stateless helpers:**
- Math functions
- Data transformations
- Generators
- Helpers

**Pattern:**
```javascript
class YourUtility {
    static helperMethod(param) {
        // Stateless operation
        return result;
    }
}
```

---

### Adding Configuration?
```
game/js/config/yourConfig.js
```

**For:**
- Game constants
- Character definitions
- Level data
- Balancing values

---

## 🏗️ Modular Entity Pattern (Best Practice)

### Example: Player System

**Before (Monolithic - BAD)**
```
Player.js (650 lines)
├── Player state
├── Sprite rendering
├── Health bar rendering
├── Name tag rendering
├── Movement logic
└── Combat logic
```

**After (Modular - GOOD)**
```
Player.js (150 lines)
├── Player state
├── Movement logic
└── Combat logic

PlayerSprite.js (200 lines)
├── Sprite creation
├── Visual effects
└── Animations

PlayerUI.js (250 lines)
├── Health bar
├── Name tag
└── Level badge
```

### Creating a Modular Entity

**1. Main Entity File**
```javascript
// game/js/entities/Boss.js
class Boss {
    constructor(scene, data) {
        this.scene = scene;
        this.health = data.health;

        // Create modules
        this.sprite = new BossSprite(scene, data);
        this.ui = new BossUI(scene, this);
        this.ai = new BossAI(this);
    }

    update(delta) {
        this.ai.update(delta);
        this.sprite.update();
        this.ui.update(this.sprite.getDepth());
    }
}
```

**2. Sprite Module**
```javascript
// game/js/entities/BossSprite.js
class BossSprite {
    constructor(scene, data) {
        this.scene = scene;
        this.createSprite(data);
    }

    createSprite(data) {
        // Sprite creation logic only
    }

    update() {
        // Update positions
    }

    flash() {
        // Visual effect
    }
}
```

**3. UI Module**
```javascript
// game/js/entities/BossUI.js
class BossUI {
    constructor(scene, entity) {
        this.scene = scene;
        this.entity = entity;
        this.createHealthBar();
    }

    createHealthBar() {
        // UI creation logic only
    }

    update(depth) {
        // Update UI positions
    }
}
```

**4. AI Module (if needed)**
```javascript
// game/js/entities/BossAI.js
class BossAI {
    constructor(boss) {
        this.boss = boss;
        this.state = 'idle';
    }

    update(delta) {
        // AI logic only
    }
}
```

---

## 📋 File Naming Conventions

### JavaScript Files
- **Classes**: `PascalCase.js` (Player.js, NetworkManager.js)
- **Utilities**: `camelCase.js` or `PascalCase.js`
- **Config**: `camelCase.js` (characters.js, config.js)

### Folders
- **Lowercase with hyphens**: `game-objects/`
- **camelCase**: `gameObjects/` (preferred)
- **Consistent style**: Pick one and stick to it

---

## 🎨 Code Organization Within Files

### Section Headers
```javascript
class Player {
    // ==================== INITIALIZATION ====================
    constructor() { }

    // ==================== MOVEMENT ====================
    move() { }
    moveToPosition() { }

    // ==================== COMBAT ====================
    attack() { }
    takeDamage() { }

    // ==================== UPDATE ====================
    update() { }

    // ==================== CLEANUP ====================
    destroy() { }
}
```

### Method Order
1. Constructor
2. Initialization methods
3. Public methods (grouped by feature)
4. Update methods
5. Cleanup methods

---

## 📦 Module Loading Order

**In index.html, load in dependency order:**

```html
<!-- 1. Libraries first -->
<script src="phaser.js"></script>
<script src="socket.io.js"></script>

<!-- 2. Config -->
<script src="js/config/characters.js"></script>
<script src="js/config.js"></script>

<!-- 3. Utilities (no dependencies) -->
<script src="js/utils/BiomeGenerator.js"></script>

<!-- 4. Managers -->
<script src="js/managers/NetworkManager.js"></script>

<!-- 5. Entity modules (dependencies first) -->
<script src="js/entities/PlayerSprite.js"></script>
<script src="js/entities/PlayerUI.js"></script>
<script src="js/entities/Player.js"></script> <!-- Depends on above -->

<!-- 6. Scenes -->
<script src="js/scenes/BootScene.js"></script>
<script src="js/scenes/GameScene.js"></script>

<!-- 7. Main (last - initializes everything) -->
<script src="js/main.js"></script>
```

---

## 🧪 Testing New Modules

### Checklist
- [ ] File in correct folder
- [ ] Following naming convention
- [ ] Max ~300 lines
- [ ] Single responsibility
- [ ] Clear comments
- [ ] Loaded in correct order
- [ ] No dependencies on non-existent files
- [ ] Tested independently (if possible)

---

## 🚫 Anti-Patterns (Avoid These!)

### ❌ God Objects
```javascript
// BAD - One file does everything
class Game {
    handleNetwork() { }
    renderGraphics() { }
    playSound() { }
    handleInput() { }
    updatePhysics() { }
    manageInventory() { }
    // 2000+ lines...
}
```

### ❌ Mixed Concerns
```javascript
// BAD - Rendering mixed with logic
class Player {
    move() {
        this.x += 1;
        // Rendering in logic method!
        this.sprite.setPosition(this.x, this.y);
        this.healthBar.update();
        this.nameTag.setPosition(this.x, this.y - 50);
    }
}
```

### ❌ Tight Coupling
```javascript
// BAD - Hard dependencies
class Player {
    constructor() {
        // Creating dependencies inside
        this.network = new NetworkManager();
        this.audio = new AudioManager();
    }
}

// GOOD - Dependency injection
class Player {
    constructor(network, audio) {
        this.network = network;
        this.audio = audio;
    }
}
```

---

## ✅ Good Practices

### ✅ Separation of Concerns
```javascript
// Player.js - Logic only
class Player {
    takeDamage(amount) {
        this.health -= amount;
        this.sprite.flash(); // Delegate to sprite
        this.ui.updateHealthBar(); // Delegate to UI
    }
}
```

### ✅ Single Responsibility
```javascript
// Each module does ONE thing

// PlayerMovement.js
class PlayerMovement {
    move() { }
    stop() { }
}

// PlayerCombat.js
class PlayerCombat {
    attack() { }
    defend() { }
}
```

### ✅ Composition Over Inheritance
```javascript
class Player {
    constructor(scene) {
        // Compose from modules
        this.movement = new PlayerMovement(this);
        this.combat = new PlayerCombat(this);
        this.inventory = new PlayerInventory(this);
    }
}
```

---

## 📊 When to Split a File

### Signs a file needs splitting:
- ⚠️ Over 300 lines
- ⚠️ Multiple unrelated responsibilities
- ⚠️ Hard to find specific functionality
- ⚠️ Many long methods (>50 lines)
- ⚠️ Difficult to test

### How to split:
1. Identify separate concerns
2. Create new files for each concern
3. Move methods to appropriate files
4. Use composition in main file
5. Update load order in HTML

---

## 🎯 Example: Adding a New Feature

**Task**: Add inventory system to Player

### Step 1: Create Module
```
game/js/entities/PlayerInventory.js
```

### Step 2: Implement
```javascript
class PlayerInventory {
    constructor(player) {
        this.player = player;
        this.items = [];
        this.maxSlots = 10;
    }

    addItem(item) {
        if (this.items.length < this.maxSlots) {
            this.items.push(item);
            return true;
        }
        return false;
    }

    removeItem(index) {
        return this.items.splice(index, 1)[0];
    }

    getItem(index) {
        return this.items[index];
    }
}
```

### Step 3: Integrate
```javascript
// In Player.js
class Player {
    constructor(scene, data) {
        // ...existing code...
        this.inventory = new PlayerInventory(this);
    }
}
```

### Step 4: Load
```html
<!-- In index.html -->
<script src="js/entities/PlayerInventory.js"></script>
<script src="js/entities/Player.js"></script>
```

---

## 📚 Resources

- See `/game/js/entities/README.md` for entity architecture details
- See `PROJECT_STRUCTURE.md` for overall structure
- Follow existing patterns in the codebase

---

**Remember**: Clean code is code that's easy to understand, modify, and maintain!
