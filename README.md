# Discord Music Bot

Bot Discord berbasis TypeScript + discord.js v14 dengan fitur music player lengkap.

---

## Tech Stack

- **Language**: TypeScript (Node.js 20 LTS)
- **Bot Framework**: discord.js v14
- **Voice**: @discordjs/voice
- **Audio Source**: play-dl (YouTube) + FFmpeg
- **Process Manager**: PM2 (production)
- **Hosting**: AWS EC2 t3.micro (Ubuntu 22.04)

---

## Commands

| Command | Deskripsi |
|---------|-----------|
| `/play <query>` | Play lagu dari YouTube URL atau keyword |
| `/pause` | Pause lagu saat ini |
| `/resume` | Resume lagu yang di-pause |
| `/skip` | Skip ke lagu berikutnya |
| `/stop` | Stop dan clear queue |
| `/queue [page]` | Tampilkan queue saat ini |
| `/nowplaying` | Info lagu yang sedang diputar |
| `/volume <0-100>` | Set volume |
| `/loop <off/track/queue>` | Toggle loop mode |
| `/shuffle` | Shuffle queue |
| `/remove <position>` | Hapus lagu dari queue |
| `/clear` | Kosongkan queue (kecuali lagu saat ini) |
| `/ping` | Cek latency bot |

---

## Setup Lokal

### Prerequisites

- Node.js 20 LTS
- FFmpeg (`brew install ffmpeg` / `apt install ffmpeg`)
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd discord-music-bot
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here   # optional: hanya untuk dev (command langsung aktif)
```

### 3. Register Slash Commands

```bash
# Development (guild-specific, langsung aktif):
npm run deploy-commands

# Production (global, butuh ~1 jam untuk propagate):
# Hapus GUILD_ID dari .env, lalu:
npm run deploy-commands
```

### 4. Jalankan Bot

```bash
# Development
npm run dev

# Production (setelah build)
npm run build
npm start
```

---

## Deploy ke AWS EC2

### 1. Setup Instance

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Install PM2 globally
sudo npm install -g pm2

# Install build tools (untuk native npm packages)
sudo apt install -y build-essential python3
```

### 2. Upload Project

```bash
# Dari lokal
scp -r ./dist ./package.json ./ecosystem.config.js ubuntu@<EC2_IP>:~/discord-music-bot/
```

### 3. Setup & Jalankan

```bash
cd ~/discord-music-bot
npm install --omit=dev

# Buat file .env
nano .env
# Isi DISCORD_TOKEN dan DISCORD_CLIENT_ID

# Jalankan via PM2
pm2 start ecosystem.config.js

# Auto-start setelah reboot
pm2 startup
pm2 save
```

### PM2 Commands

```bash
pm2 status              # Cek status
pm2 logs discord-music-bot   # Lihat logs
pm2 restart discord-music-bot
pm2 stop discord-music-bot
```

---

## Project Structure

```
src/
├── index.ts                  # Entry point
├── deploy-commands.ts        # Register slash commands
├── types/
│   └── index.ts              # Shared TypeScript types
├── commands/                 # Slash command handlers
│   ├── play.ts
│   ├── pause.ts
│   ├── resume.ts
│   ├── skip.ts
│   ├── stop.ts
│   ├── queue.ts
│   ├── nowplaying.ts
│   ├── volume.ts
│   ├── loop.ts
│   ├── shuffle.ts
│   ├── remove.ts
│   ├── clear.ts
│   └── ping.ts
├── events/
│   ├── ready.ts
│   └── interactionCreate.ts
├── music/
│   ├── AudioStream.ts        # play-dl + FFmpeg integration
│   ├── MusicQueue.ts         # Queue management per guild
│   └── MusicPlayer.ts        # Voice connection + audio player
└── utils/
    ├── embeds.ts             # Discord embed builders
    ├── validators.ts         # Input validation
    └── rateLimiter.ts        # Rate limiting (1 cmd/user/2s)
```

---

## Notes

- **Opus encoding**: `opusscript` (pure JS) digunakan secara default agar mudah di-install di semua platform. Di EC2 Ubuntu dengan Node.js 20, kamu bisa install `@discordjs/opus` untuk performa lebih baik: `npm install @discordjs/opus`
- **Volume**: Dikontrol via FFmpeg PCM + @discordjs/voice inline volume transformer. Perubahan volume berlaku langsung pada lagu yang sedang diputar.
- **Idle timeout**: Bot akan otomatis leave voice channel setelah 5 menit tidak ada lagu yang dimainkan.
- **Rate limit**: 1 command per user per 2 detik.
# discord-bot-music
