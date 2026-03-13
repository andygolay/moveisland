# MOVE Island - Project Plan

A web-based 3D MMO game on Movement blockchain where players explore a Greek island using their NFT avatars.

## Current Status: MVP (Single-Player)

### Implemented Features

#### Core Game
- [x] 3D Greek island environment with Mediterranean styling
- [x] Terrain with roads connecting key locations
- [x] Varied Mediterranean trees (olive, cypress, pine, fig)
- [x] Greek-style whitewashed buildings
- [x] Temple ruins with columns
- [x] Vibrant Mediterranean water with wave shader
- [x] Player movement with tank-style controls (WASD)
- [x] Building collision detection
- [x] Water boundary (can't walk into ocean)

#### NFT Integration
- [x] Movement wallet connection (Nightly, Petra, etc.)
- [x] Fetch owned NFTs from MoveLady/Moveously collections
- [x] NFT displayed as player avatar (billboard style)
- [x] Black stick-figure legs with walking animation

#### UI
- [x] Wallet connection screen
- [x] NFT selection screen
- [x] In-game HUD with player info
- [x] Demo mode for testing without wallet

---

## Phase 2: Multiplayer (Not Implemented)

### Backend Server
- [ ] Node.js + Express server
- [ ] Socket.io for real-time communication
- [ ] Redis for session/position caching
- [ ] Player state management

### Real-time Sync
- [ ] Position broadcasting (~30 fps)
- [ ] Player join/leave events
- [ ] Zone-based updates (only sync nearby players)

### Client Updates
- [ ] Socket.io client connection
- [ ] Other players store (Zustand)
- [ ] Render other players with their NFT avatars
- [ ] Interpolation for smooth movement

### Sync Protocol
```typescript
// Client -> Server (30 fps)
{ type: 'position', x, y, z, rotation, animation }

// Server -> Client (broadcast to zone)
{ type: 'players', players: [{ id, x, y, z, rotation, animation, nftImage }] }
```

---

## Phase 3: Gameplay Features (Future)

### Social Features
- [ ] Text chat
- [ ] Emotes (wave, dance, sit, etc.)
- [ ] Friends list
- [ ] Player profiles

### Mini-Games
- [ ] Fishing at harbor
- [ ] Treasure hunts
- [ ] Racing

### Quests
- [ ] NPC dialogue system
- [ ] Quest log UI
- [ ] Quest rewards

---

## Tech Stack

### Frontend (Current)
- **Vite + React + TypeScript** - Build tooling
- **Three.js + React Three Fiber** - 3D rendering
- **@react-three/drei** - 3D helpers
- **Zustand** - State management
- **@moveindustries/ts-sdk** - Movement blockchain SDK
- **@moveindustries/wallet-adapter-react** - Wallet connection

### Backend (Phase 2)
- **Node.js + Express** - API server
- **Socket.io** - Real-time sync
- **Redis** - Session cache
- **PostgreSQL** - Persistent data (optional)

---

## File Structure

```
client/
├── public/
├── src/
│   ├── main.tsx                 # App entry
│   ├── App.tsx                  # Main component
│   ├── blockchain/              # Wallet & NFT
│   │   ├── constants.ts         # Network config, collection addresses
│   │   ├── nft.ts               # NFT fetching
│   │   └── wallet.ts            # Movement SDK setup
│   ├── components/              # React UI
│   │   ├── WalletConnect.tsx    # Login screen
│   │   ├── NFTSelector.tsx      # Avatar selection
│   │   ├── HUD.tsx              # In-game UI
│   │   └── *.css                # Styles
│   ├── game/                    # Three.js 3D
│   │   ├── Scene.tsx            # Canvas setup
│   │   ├── World.tsx            # World container
│   │   ├── Terrain.tsx          # Island terrain + roads
│   │   ├── Water.tsx            # Ocean shader
│   │   ├── Buildings.tsx        # Buildings, trees, vegetation
│   │   ├── Avatar.tsx           # Player avatar
│   │   ├── AvatarBody.tsx       # Stick figure legs
│   │   ├── NFTBillboard.tsx     # NFT image display
│   │   ├── PlayerController.tsx # Movement & collision
│   │   └── CameraController.tsx # Third-person camera
│   └── stores/                  # Zustand state
│       ├── gameStore.ts         # Game state
│       └── playerStore.ts       # Player state
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Key Locations on Island

| Location | Coordinates | Purpose |
|----------|-------------|---------|
| Agora | (0, 0) | Spawn point, central plaza |
| Harbor | (-35, 30) | Fishing area |
| Temple | (30, -25) | Ruins with columns |
| Amphitheater | (25, 25) | Events area |
| Market | (-25, -20) | Trading |
| Lighthouse | (40, 10) | Scenic point |

---

## Supported NFT Collections

- **MoveLady**: `0x5b4227cfd3119e0c8a9652328c9980b338296a0880f73e5ac3f6cdd5d832ac07`
- **Moveously**: `0xb92ea39b214d23a3bc7a79e4050c6d9b8038b68790176f9dc061d421ae07793f`

---

## Controls

- **W / Up Arrow** - Move forward
- **S / Down Arrow** - Move backward
- **A / Left Arrow** - Turn left
- **D / Right Arrow** - Turn right
- **Space** - Jump

---

## Running Locally

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

---

## Deployment

The client is a static site that can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting

For multiplayer (Phase 2), the backend would need:
- Node.js hosting (Railway, Render, Fly.io, etc.)
- Redis instance
- WebSocket support
