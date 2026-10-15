# 🔴 THROW IT

> **Drop smart. Block rivals. Own the board.**

A modern, highly interactive multiplayer strategy game inspired by classic Four-in-a-Row mechanics, re-engineered for **2 to 7 players**, featuring an intelligent Robot AI with 3 difficulty tiers, same-device Pass & Play with privacy screens, online multiplayer rooms with shareable invite links and short codes, and integrated real-time Voice & Video calling.

---

## 🎮 Highlights & Features

- **3 Playable Game Modes**:
  - **Play vs Robo**: Battle a robot opponent with Easy, Medium, or Hard minimax lookahead with alpha-beta pruning and threat-blocking heuristics.
  - **Pass & Play (2–7 Players)**: Single-device local multiplayer with customizable player names, avatars, distinct color swatches, and optional handoff privacy screens.
  - **Online Multiplayer**: Real-time room creation, 6-character room codes (e.g. `DROP7X`), one-click invitation links, host start controls, and server-synchronized turns.
- **Customizable Boards**:
  - Classic default `7×6` board.
  - Customizable grid dimensions from `4×4` up to `12×10` with strict enforcement that the winning condition is **always 4 connected coins**.
- **Voice & Video Calling (LiveKit Integration)**:
  - Join call control inside online matches.
  - Mic mute/unmute and camera toggle.
  - Non-blocking collapsible video tiles keeping the board fully playable.
- **Audio & Visual Immersion**:
  - Procedural Web Audio API sound effects (coin drop, turn chime, invalid buzz, fanfare, and draw).
  - Global Dark Mode (midnight navy & violet) and Light Mode.
  - Smooth CSS coin-drop physics and glowing victory pulse.
  - Accessible shape symbols (`●`, `▲`, `★`, `■`, `◆`, `✦`, `⬟`) for color-blind accessibility.

---

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Audio Engine**: Pure Web Audio API synthesized procedural sound effects
- **Testing**: Vitest unit test suite covering gravity, full columns, 4-directional wins, draws, and AI lookahead
- **Backend**: Supabase (PostgreSQL, Row-Level Security, Realtime Publications)
- **Voice / Video**: LiveKit Client SDK
- **Hosting**: Vercel

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- **Node.js**: v20+
- **npm**: v10+

### 2. Installation
Navigate to the project directory:
```bash
cd "C:\Users\Pushmitha\.gemini\antigravity\scratch\throw-it"
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Automated Unit Tests
```bash
npm test
```
Runs the 20 comprehensive unit tests covering:
- Horizontal, vertical, diagonal-up (`/`), and diagonal-down (`\`) win detection.
- Non-winning formations and 3-coin boundary tests.
- Full-column move rejection and out-of-bound drops.
- Full-board draw detection.
- Sequential turn rotation across 2 through 7 players.
- Robot immediate winning moves and lethal threat blocking.

### 5. Production Build
```bash
npm run build
```

---

## 🌐 Instant Local Multi-Tab Testing

Throw It comes equipped with **Dual Transport Synchronization**:
1. When running locally without Supabase credentials, the game utilizes browser **BroadcastChannels** to sync rooms across separate browser tabs or windows on the same machine.
2. Open Tab A: Click **Online Multiplayer** → **Create Room** → Copy the 6-character code.
3. Open Tab B: Click **Online Multiplayer** → **Join by Code** → Enter the code.
4. Both tabs will instantly connect into the lobby, display live player colors, and synchronize coin drops!

---

## ☁️ Connecting Supabase (Production Online Multiplayer)

To run online rooms across the public internet between different computers and phones:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Copy and run the contents of [supabase-schema.sql](file:///C:/Users/Pushmitha/.gemini/antigravity/scratch/throw-it/supabase-schema.sql). This will set up:
   - `rooms`, `room_players`, and `room_moves` tables.
   - Row Level Security (RLS) public read/insert policies.
   - Realtime replication publications.
   - Authoritative `make_move_authoritative` stored procedure.
4. Copy your project URL and public anon key from **Project Settings → API**.
5. Create `.env` in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 🎙 Connecting LiveKit (Voice & Video Calls)

To enable live audio and video streaming in online rooms:

1. Create a free account at [livekit.io](https://livekit.io).
2. Create a project and obtain your WebSocket URL (`wss://your-project.livekit.cloud`).
3. Add to your `.env`:
   ```env
   VITE_LIVEKIT_URL=wss://your-project.livekit.cloud
   ```
4. For secure production deployments, generate participant access tokens using a serverless function (such as Vercel Serverless Functions or Supabase Edge Functions) using `livekit-server-sdk`. Never expose your `LIVEKIT_API_SECRET` in client-side files.
*(Note: If LiveKit is unconfigured, Throw It gracefully uses local camera/mic direct preview so the UI is 100% testable).*

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub or run `npx vercel` in the project directory.
2. When deploying on Vercel:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Under **Project Settings → Environment Variables**, add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy! Your friends can now open the link on desktop, iPhone, iPad, or Android browsers.

---

## 📜 License
MIT License. Built for Google Antigravity.
