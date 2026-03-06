# ZARDONIC — Industrial Cyberpunk Artist Website

A fully customizable cyberpunk-themed artist website for **ZARDONIC**, built with React, TypeScript, Vite, and Framer Motion. Features a 3D loading screen, chromatic aberration glitch effects, and a full admin CMS.

## Features

### Public Site
- **3D Loading Screen** — Three.js model loading with real progress tracking and background image caching
- **Chromatic Aberration Glitch Logo** — Hero logo with animated RGB channel separation and jitter effects
- **Cyberpunk UI** — Scanline overlays, CRT effects, noise grain, circuit board background
- **Spotify Integration** — Embedded Spotify player for artist streaming
- **iTunes & Bandsintown Sync** — Automatic release and event fetching with Odesli cross-platform links
- **Responsive Gallery** — Swipeable image gallery with lightbox and Google Drive URL support
- **Social Connect** — Links to Instagram, Facebook, Spotify, YouTube, SoundCloud, TikTok, etc.
- **Impressum & Privacy** — Built-in legal pages with EN/DE support
- **Secret Terminal** — Konami code activated terminal interface

### Admin CMS
Access via the lock icon in the footer, or by navigating to `?admin-setup` for first-time setup.

- **Section Visibility** — Show/hide any section (Bio, Music, Gigs, Releases, Gallery, Connect, Credits)
- **Theme Customization** — Customize primary/accent/background/foreground colors and heading/body/mono fonts
- **Animation Controls** — Toggle glitch, scanline, chromatic, CRT, noise, and circuit background effects
- **Config Editor** — Fine-tune all animation parameters (durations, probabilities, intervals, offsets)
- **Data Export/Import** — Export site data as JSON, import from file
- **Password Protection** — SHA-256 hashed admin password with timing-safe comparison
- **Favicon Customization** — Set a custom favicon URL from the theme panel

### Data Persistence
- **Upstash Redis** — All site data and admin settings are persisted via Upstash Redis with 24-hour TTL
- **localStorage Fallback** — Graceful fallback to localStorage when Redis is unavailable
- **Background Caching** — Images are pre-cached in IndexedDB during the loading screen

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Animation**: Framer Motion, Three.js
- **Storage**: Upstash Redis, IndexedDB, localStorage
- **UI**: Radix UI, Phosphor Icons, Sonner
- **APIs**: iTunes Search, Bandsintown, Odesli/song.link

## Development

```bash
npm install
npm run dev
```

### Environment Variables

For Redis persistence and API integrations, set these in your `.env` or deployment environment:

```
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
BANDSINTOWN_API_KEY=your-bandsintown-api-key
```

**How to get API keys:**
- **Upstash Redis**: Sign up at https://upstash.com and create a Redis database
- **Bandsintown API**: Register at https://www.bandsintown.com/api/overview

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | TypeScript check + Vite build |
| `npm run test` | Run Vitest test suite |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## License

MIT License — see [LICENSE](LICENSE) for details.
