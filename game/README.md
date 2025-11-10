# Klyra Game Client (Phaser 3)

Multiplayer roguelike game built with Phaser 3 and Socket.IO.

## 🎮 Features

- **Phaser 3** game engine
- **Real-time multiplayer** with Socket.IO
- **7 character classes** (Warrior, Mage, Rogue, Archer, Paladin, Necromancer, Malachar)
- **4 difficulty modes** (Easy, Normal, Hard, Nightmare)
- **Procedurally generated dungeons**
- **10-player co-op**
- **Real-time combat** and item collection
- **Retro pixel art style**

## 🚀 Quick Start

### Play Now

1. Open `index.html` in a web browser
2. Enter your username
3. Select a class and difficulty
4. Click PLAY

### Deploy to Siteground

Upload the entire `game/` folder to your Siteground public_html directory.

## 📁 Project Structure

```
game/
├── index.html                  # Main HTML file
├── js/
│   ├── config.js              # Game configuration
│   ├── main.js                # Game initialization
│   ├── managers/
│   │   └── NetworkManager.js  # Socket.IO handler
│   ├── scenes/
│   │   ├── BootScene.js       # Loading & connection
│   │   ├── MenuScene.js       # Main menu & class selection
│   │   ├── LobbyScene.js      # Waiting room
│   │   └── GameScene.js       # Main gameplay
│   └── entities/
│       ├── Player.js          # Player entity
│       ├── Enemy.js           # Enemy entity
│       └── Item.js            # Item entity
└── README.md                  # This file
```

## 🎮 Controls

### Keyboard
- **WASD** or **Arrow Keys** - Move
- **SPACE** - Attack nearest enemy
- **Left Click** - Attack in direction

### UI
- Health bar (top left)
- Stats display (level, XP, class)
- Kill counter (top right)
- Minimap (top right)

## 🌐 Server Connection

The game connects to: `https://klyra-server.onrender.com`

To change the server URL, edit `js/config.js`:

```javascript
const GameConfig = {
    SERVER_URL: 'https://your-server-url.com',
    // ...
};
```

## 🎨 Character Classes

| Class | Health | Strength | Defense | Speed |
|-------|--------|----------|---------|-------|
| Warrior | 120 | 15 | 12 | 8 |
| Mage | 80 | 8 | 6 | 10 |
| Rogue | 90 | 10 | 8 | 15 |
| Archer | 100 | 12 | 8 | 12 |
| Paladin | 130 | 13 | 15 | 7 |
| Necromancer | 85 | 9 | 7 | 9 |
| Malachar | 115 | 16 | 10 | 9 |

## 🗺️ Difficulty Modes

- **Easy** - 40x40 dungeon, 5 enemies
- **Normal** - 50x50 dungeon, 8 enemies
- **Hard** - 60x60 dungeon, 12 enemies
- **Nightmare** - 70x70 dungeon, 15 enemies

## 🔧 Development

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server (for local testing)

### Local Testing

Using Python:
```bash
cd game
python -m http.server 8000
```

Using Node.js (http-server):
```bash
npm install -g http-server
cd game
http-server -p 8000
```

Open `http://localhost:8000` in your browser.

### Live Server (VS Code)

1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## 🎯 Game Flow

1. **Boot Scene** - Connect to server, load assets
2. **Menu Scene** - Enter username, select class & difficulty
3. **Lobby Scene** - Wait for 10 players (or 4+ ready players)
4. **Game Scene** - Play the roguelike dungeon crawler!

## 📊 Features

### Implemented
✅ Character selection (6 classes)
✅ Difficulty selection (4 modes)
✅ Real-time multiplayer synchronization
✅ Player movement and combat
✅ Enemy spawning and AI
✅ Item collection system
✅ Health and stats UI
✅ Procedural dungeon rendering
✅ Death and respawn
✅ Kill tracking
✅ Chat system
✅ Player reconnection
✅ AFK detection

### Coming Soon
🔜 Enemy AI movement
🔜 Multiple dungeon floors
🔜 Boss battles
🔜 Trading system
🔜 Leaderboards
🔜 Guild system
🔜 More character customization
🔜 Sound effects & music
🔜 Particle effects
🔜 Better sprites/tilesets

## 🐛 Known Issues

- Sprites are simple shapes (placeholder art)
- No collision detection with walls yet
- No enemy AI movement (static enemies)
- Minimap not functional yet

## 🎮 How to Play

1. **Join Game** - Enter your name and select class
2. **Wait in Lobby** - Game starts with 10 players or when 4+ ready
3. **Explore Dungeon** - Move with WASD/arrows
4. **Fight Enemies** - Use SPACE or click to attack
5. **Collect Items** - Walk over items to pick them up
6. **Survive** - Don't let your health reach zero!
7. **Team Up** - Work together with other players

## 🌟 Tips

- Stick together with teammates
- Health potions are common - grab them quickly
- Different classes work better together
- Watch your health bar carefully
- Legendary items (orange) are rare and powerful
- Ready up quickly to start games faster

## 📝 Credits

- **Engine**: Phaser 3
- **Networking**: Socket.IO
- **Server**: Node.js + Express
- **Hosting**: Siteground (website) + Render (server)

## 📄 License

MIT

---

**Website**: https://klyra.lol
**Server**: https://klyra-server.onrender.com
**Status**: Live! 🎮
