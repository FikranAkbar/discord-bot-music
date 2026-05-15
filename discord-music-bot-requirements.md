# Discord Music Bot — Requirements Document

## Overview

Bot Discord berbasis **TypeScript + discord.js** dengan fitur music player. Dihosting di **AWS EC2** dan ditargetkan untuk penggunaan personal / small server.

---

## 1. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Language | TypeScript (Node.js) |
| Bot Framework | discord.js v14 |
| Voice | @discordjs/voice |
| Audio Source | yt-dlp |
| Audio Encoding | FFmpeg |
| Hosting | AWS EC2 (t3.micro) |
| Runtime | Node.js 20 LTS |

---

## 2. Functional Requirements

### 2.1 Core Music Features

- [ ] **Play** — stream audio dari YouTube URL atau search query
- [ ] **Pause / Resume** — pause dan lanjutkan lagu yang sedang diputar
- [ ] **Stop** — hentikan playback dan clear queue
- [ ] **Skip** — lewati lagu saat ini ke lagu berikutnya di queue
- [ ] **Queue** — tampilkan daftar lagu yang akan diputar
- [ ] **Now Playing** — tampilkan info lagu yang sedang diputar (judul, durasi, requester)
- [ ] **Volume** — atur volume playback (0–100)
- [ ] **Loop** — toggle loop untuk lagu saat ini atau seluruh queue
- [ ] **Shuffle** — acak urutan queue
- [ ] **Remove** — hapus lagu tertentu dari queue berdasarkan posisi
- [ ] **Clear Queue** — kosongkan seluruh queue

### 2.2 Voice Channel Management

- [ ] Bot otomatis join voice channel saat command play dijalankan
- [ ] Bot otomatis leave jika tidak ada user di voice channel (idle timeout: 5 menit)
- [ ] Bot hanya bisa dikontrol oleh user yang berada di voice channel yang sama

### 2.3 Bot Commands (Slash Commands)

| Command | Deskripsi |
|---------|-----------|
| `/play <query>` | Play lagu dari YouTube URL atau keyword |
| `/pause` | Pause lagu saat ini |
| `/resume` | Resume lagu yang di-pause |
| `/skip` | Skip ke lagu berikutnya |
| `/stop` | Stop dan clear queue |
| `/queue` | Tampilkan queue saat ini |
| `/nowplaying` | Info lagu yang sedang diputar |
| `/volume <0-100>` | Set volume |
| `/loop <off/track/queue>` | Toggle loop mode |
| `/shuffle` | Shuffle queue |
| `/remove <position>` | Hapus lagu dari queue |
| `/clear` | Kosongkan queue |
| `/ping` | Cek latency bot |

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Latency join voice channel: < 2 detik
- Queue mendukung minimal 50 lagu
- Bot bisa handle minimal 3 guild (server) secara bersamaan

### 3.2 Reliability
- Bot auto-restart jika crash (menggunakan **PM2**)
- Graceful shutdown saat update/restart (tidak memutus sesi tiba-tiba)

### 3.3 Security
- Bot token disimpan di environment variable, tidak di-hardcode
- Rate limiting untuk command (1 command per user per 2 detik)

---

## 4. Infrastructure (AWS)

### 4.1 EC2 Setup

| Config | Value |
|--------|-------|
| Instance Type | t3.micro (Free Tier eligible) |
| OS | Ubuntu 22.04 LTS |
| Storage | 20 GB gp3 |
| Region | ap-southeast-1 (Singapore) |

### 4.2 Security Group Rules

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | IP pribadi saja |
| Outbound | All | All | 0.0.0.0/0 |

> ⚠️ Tidak perlu inbound port selain SSH karena bot bersifat outbound-only ke Discord API.

### 4.3 Process Management
- Gunakan **PM2** untuk keep-alive dan auto-restart
- Setup `pm2 startup` agar bot otomatis jalan setelah reboot instance

---

## 5. Dependencies

### 5.1 NPM Packages

```json
{
  "dependencies": {
    "discord.js": "^14.x",
    "@discordjs/voice": "^0.17.x",
    "@discordjs/opus": "^0.9.x",
    "ytdl-core": "latest",
    "play-dl": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "ts-node": "^10.x"
  }
}
```

> 💡 `play-dl` lebih disarankan daripada `ytdl-core` untuk saat ini karena lebih aktif di-maintain.

### 5.2 System Dependencies (di EC2)

```bash
# Node.js 20 LTS
# FFmpeg
# Python3 + yt-dlp
# PM2 (global npm)
```

---

## 6. Project Structure

```
discord-music-bot/
├── src/
│   ├── index.ts               # Entry point
│   ├── commands/              # Slash command handlers
│   │   ├── play.ts
│   │   ├── skip.ts
│   │   ├── queue.ts
│   │   └── ...
│   ├── events/                # Discord event handlers
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── music/
│   │   ├── MusicQueue.ts      # Queue management
│   │   ├── MusicPlayer.ts     # Playback logic
│   │   └── AudioStream.ts     # yt-dlp / play-dl integration
│   └── utils/
│       ├── embeds.ts          # Discord embed builder
│       └── validators.ts      # Input validation
├── .env                       # Environment variables (gitignored)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 7. Environment Variables

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
GUILD_ID=optional_for_dev_testing
```

---

## 8. Out of Scope (untuk saat ini)

- Spotify integration
- Dashboard web
- Database / persistent queue (queue hilang saat bot restart)
- Multi-language support
- Premium / subscription feature

---

## 9. Milestones

| Fase | Target | Deskripsi |
|------|--------|-----------|
| **Phase 1** | Setup | Project init, bot token, slash command register |
| **Phase 2** | Core | Play, pause, resume, stop |
| **Phase 3** | Queue | Queue management, skip, now playing |
| **Phase 4** | Extra | Loop, shuffle, volume, remove |
| **Phase 5** | Deploy | AWS EC2 setup, PM2, production config |

---

*Last updated: May 2026*
