# Klyra Multiplayer Server

Real-time multiplayer server for Klyra roguelike game using Node.js, Express, and Socket.IO.

## Features

- **Automatic Matchmaking**: Players automatically join available lobbies
- **10-Player Lobbies**: Supports up to 10 players per game session
- **Real-time Sync**: All player movements, attacks, and interactions synced instantly
- **Procedural Dungeons**: Generates unique dungeons for each game session
- **Game State Management**: Handles enemies, items, player stats, and inventory
- **Chat System**: In-game chat for team coordination

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **UUID** - Unique identifier generation

## Production Server

**Server is live at:** https://klyra-server.onrender.com

**Endpoints:**
- Health: https://klyra-server.onrender.com/health
- Stats: https://klyra-server.onrender.com/stats

## Deployment to Render (Already Done!)

The server is already deployed. To redeploy or update:

1. Push changes to GitHub
2. Render will auto-deploy from the `main` branch

### Manual Deployment

If you need to deploy from scratch:

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `klyra-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose paid for better performance)
5. Click "Create Web Service"

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status, uptime, and player/lobby counts.

### Server Stats
```
GET /stats
```
Returns detailed statistics about active lobbies and players.

## Client Integration

### Connect to Server (JavaScript)

```javascript
// Import Socket.IO client
import io from 'socket.io-client';

// Connect to server (replace with your Render URL)
const socket = io('https://klyra-server.onrender.com');

// Join game
socket.emit('player:join', {
    username: 'PlayerName',
    characterClass: 'warrior'
});

// Listen for lobby joined
socket.on('lobby:joined', (data) => {
    console.log('Joined lobby:', data.lobbyId);
    console.log('Players in lobby:', data.players);
});

// Listen for game start
socket.on('game:start', (data) => {
    console.log('Game starting!');
    console.log('Players:', data.players);
    console.log('Dungeon:', data.gameState.dungeon);
});

// Send player movement
socket.emit('player:move', {
    position: { x: 10, y: 5 }
});

// Listen for other players moving
socket.on('player:moved', (data) => {
    console.log(`Player ${data.playerId} moved to`, data.position);
});

// Attack
socket.emit('player:attack', {
    target: 'enemy_id',
    damage: 25
});

// Pick up item
socket.emit('item:pickup', {
    itemId: 'item_uuid'
});

// Send chat message
socket.emit('chat:message', {
    message: 'Hello team!'
});

// Listen for chat messages
socket.on('chat:message', (data) => {
    console.log(`${data.username}: ${data.message}`);
});
```

## Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `player:join` | `{username, characterClass}` | Join the game and get matched to a lobby |
| `player:move` | `{position: {x, y}}` | Update player position |
| `player:attack` | `{target, damage}` | Perform attack |
| `player:ready` | None | Mark player as ready |
| `enemy:hit` | `{enemyId, damage}` | Damage an enemy |
| `item:pickup` | `{itemId}` | Pick up an item |
| `chat:message` | `{message}` | Send chat message |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `lobby:joined` | `{lobbyId, player, players, lobbyStatus}` | Confirmation of joining lobby |
| `game:start` | `{lobbyId, players, gameState}` | Game is starting |
| `player:joined` | `{player, playerCount}` | New player joined lobby |
| `player:left` | `{playerId, username, playerCount}` | Player left lobby |
| `player:moved` | `{playerId, position}` | Player moved |
| `player:attacked` | `{playerId, target, damage}` | Player attacked |
| `player:ready` | `{playerId, username}` | Player marked ready |
| `enemy:damaged` | `{enemyId, health, damage}` | Enemy took damage |
| `enemy:killed` | `{enemyId, killedBy}` | Enemy was killed |
| `item:picked` | `{itemId, playerId}` | Item was picked up |
| `chat:message` | `{playerId, username, message, timestamp}` | Chat message received |

## Game Flow

1. **Player Joins**: Client connects and emits `player:join`
2. **Matchmaking**: Server automatically assigns player to available lobby or creates new one
3. **Lobby Waiting**: Players wait in lobby until 10 players join
4. **Game Start**: When lobby reaches 10 players, game auto-starts after 3 seconds
5. **Active Game**: Players can move, attack, pick up items, chat
6. **Player Leaves**: If player disconnects, others are notified

## Lobby System

- **Max Players**: 10 per lobby
- **Auto-Start**: Game starts automatically when lobby is full
- **Start Delay**: 3 seconds after lobby fills up
- **Status States**:
  - `waiting` - Accepting players
  - `starting` - Countdown to game start
  - `active` - Game in progress
  - `finished` - Game over or empty

## Game State

Each lobby maintains:
- **Players**: All connected players with stats, position, inventory
- **Dungeon**: Procedurally generated 50x50 tile map
- **Enemies**: Spawned monsters with health and position
- **Items**: Collectible items (potions, weapons, armor, keys)
- **Floor**: Current dungeon floor (for future expansion)

## Future Enhancements

- [ ] Multiple dungeon floors
- [ ] Boss battles
- [ ] Player trading system
- [ ] Leaderboards
- [ ] Persistent player progression
- [ ] Different game modes
- [ ] Spectator mode
- [ ] Replay system

## Environment Variables

Optional environment variables:

```bash
PORT=3000                    # Server port (Render sets this automatically)
NODE_ENV=production          # Environment mode
```

## Performance

**Free Tier (Render)**:
- Handles 100+ concurrent players
- Auto-sleeps after 15 min inactivity
- Cold start: ~30 seconds

**Paid Tier (Recommended for production)**:
- Always-on server
- Better performance
- No cold starts
- More resources

## Monitoring

Monitor your server at:
- Health: `https://your-server.onrender.com/health`
- Stats: `https://your-server.onrender.com/stats`
- Render Dashboard: Real-time logs and metrics

## Support

For issues or questions about the server, check the Render logs in your dashboard.

---

**Ready to deploy!** Just push to GitHub and connect to Render. 🚀
