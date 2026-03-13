# MOVELand

A multiplayer 3D world where players explore as their Movement NFTs. Built with React, Three.js, and PartyKit.

## Features

- Connect with Movement-compatible wallets
- Select an NFT from supported collections as your avatar
- Explore a Greek island-themed 3D world
- See other players in real-time multiplayer
- Run (hold Shift), jump (Space), and explore buildings

## Supported Collections (so far)

- Gorilla Moverz (Community & Founders)
- MoveLady
- Moveously
- Arkai
- MetaMenko
- RUFFLES Community
- MoonMoverz
- BabyGorillaz

## Project Structure

```
/
├── client/          # React + Three.js frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── game/         # 3D game logic
│   │   ├── stores/       # Zustand state management
│   │   ├── blockchain/   # NFT fetching
│   │   └── multiplayer/  # WebSocket client
│   └── ...
├── server/          # PartyKit multiplayer server
│   └── src/
│       └── server.ts
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### 1. Install dependencies

```bash
# Install client dependencies
cd client
pnpm install

# Install server dependencies
cd ../server
pnpm install
```

### 2. Start the multiplayer server

```bash
cd server
pnpm dev
```

This starts the PartyKit server at `localhost:1999`.

### 3. Start the client

In a new terminal:

```bash
cd client
pnpm dev
```

The client runs at `http://localhost:5173`.

### Environment Variables

The client uses `.env.development` for local development:

```bash
# client/.env.development
VITE_PARTYKIT_HOST=localhost:1999
```

## Production Deployment

### Deploy the PartyKit server

```bash
cd server
pnpm run deploy
```

This deploys to PartyKit's infrastructure and gives you a URL like `your-app.username.partykit.dev`.

### Configure production environment

Create `client/.env.production`:

```bash
VITE_PARTYKIT_HOST=your-app.username.partykit.dev
```

### Build and deploy the client

```bash
cd client
pnpm build
```

Deploy the `dist/` folder to your hosting provider (Vercel, Netlify, etc.).

#### Vercel Example

```bash
cd client
pnpm install -g vercel
vercel
```

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Move forward |
| S / Arrow Down | Move backward |
| A / Arrow Left | Turn left |
| D / Arrow Right | Turn right |
| Shift (hold) | Run |
| Space | Jump |

## Tech Stack

- **Frontend**: React, TypeScript, Three.js, React Three Fiber
- **State**: Zustand
- **Multiplayer**: PartyKit (WebSocket)
- **Wallet**: Movement Wallet Adapter
- **Styling**: CSS

## License

Apache 2.0 - See [LICENSE](LICENSE)
