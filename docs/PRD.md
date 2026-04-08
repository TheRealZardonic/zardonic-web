# ZARDONIC Artist Landing Page

A dark, industrial single-page application showcasing the hard techno/industrial artist ZARDONIC with automatic iTunes integration, music player, event listings, and comprehensive content management.

**Experience Qualities**:
1. **Aggressive**: High-contrast black and white aesthetic with crimson accents creates an intense, industrial atmosphere
2. **Cybernetic**: HUD-style overlays, scanline effects, and glitch animations evoke a dystopian tech aesthetic
3. **Immersive**: Built-in music player and interactive elements keep visitors engaged with the artist's world

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
- Multiple interactive sections (music player, galleries, admin dashboard, analytics)
- Content management system with owner-only edit mode
- iTunes API integration with streaming link enrichment
- Analytics tracking and visualization
- Multi-language legal pages

## Essential Features

### 3D Logo with Parallax Scrolling
- **Functionality**: Interactive 3D model (zardonictext.glb) displayed as hero logo with smooth parallax effect tied to scroll position
- **Purpose**: Create a striking, modern first impression that reflects the artist's cutting-edge electronic/metal sound
- **Trigger**: Page loads with 3D canvas, user scrolls page
- **Progression**: Logo loads in 3D space → User scrolls → Model rotates and translates smoothly based on scroll position → Cyberpunk lighting effects illuminate the model
- **Success criteria**: 3D model loads without blocking page, parallax is smooth at 60fps, fallback displays if GLB missing

### Music Player
- **Functionality**: Play ZARDONIC tracks with full playback controls (play/pause, next/previous, volume, progress bar)
- **Purpose**: Let visitors experience the music directly without leaving the site
- **Trigger**: User clicks play on a track or the player interface
- **Progression**: Track selection → Audio loads → Playback controls active → Volume adjustment available → Progress tracking visible
- **Success criteria**: Audio plays smoothly, controls respond instantly, progress updates in real-time

### iTunes Integration with Streaming Links
- **Functionality**: Automatically fetch latest releases from iTunes Search API and enrich with Odesli streaming links
- **Purpose**: Display current discography with direct links to all major platforms
- **Trigger**: Page load or manual refresh in admin mode
- **Progression**: API call to iTunes → Parse response → Fetch Odesli links → Display releases with artwork → Click opens streaming options
- **Success criteria**: Latest releases appear with cover art and working links to Spotify, SoundCloud, YouTube, Bandcamp

### Biography Section
- **Functionality**: Artist story with expandable member profiles, achievements, and collaborations
- **Purpose**: Tell ZARDONIC's story and establish credibility
- **Trigger**: User scrolls to bio section or clicks member profile
- **Progression**: View bio text → Click member → Profile overlay appears with glitch animation → View details → Close overlay
- **Success criteria**: Text is readable, profiles expand smoothly, overlays display correctly

### Photo & Instagram Gallery
- **Functionality**: Swipeable image galleries with lightbox zoom, HUD overlays, and glitch effects
- **Purpose**: Visual showcase of the artist's brand and live performances
- **Trigger**: User navigates to gallery section or clicks image
- **Progression**: Grid display → Click image → Lightbox opens → Swipe between images → Close or zoom
- **Success criteria**: Images load quickly, lightbox is smooth, swipe gestures work on mobile

### Upcoming Gigs
- **Functionality**: Event listings with venue, location, date, ticket links, supporting artists
- **Purpose**: Drive ticket sales and keep fans informed of live shows
- **Trigger**: User scrolls to gigs section
- **Progression**: View event list → Sort by date → Click ticket link → External site opens
- **Success criteria**: Events display clearly, dates are formatted correctly, links work

### Releases Gallery
- **Functionality**: Grid of releases with dot-matrix/scanline effects and streaming links
- **Purpose**: Showcase discography and drive streams
- **Trigger**: User scrolls to releases section or clicks release
- **Progression**: View grid → Click release → Streaming options appear → Select platform → External link opens
- **Success criteria**: Artwork displays with effects, links open correct platforms

### Content Management System
- **Functionality**: Owner-only edit mode for updating all content without code changes
- **Purpose**: Allow artist/manager to maintain site without developer
- **Trigger**: Navigate to ?admin-setup (first time) or click edit button (subsequent)
- **Progression**: Setup password → Enable edit mode → Click section to edit → Update content → Save changes → Data persists
- **Success criteria**: Only owner can edit, changes save immediately, all sections are editable

### Admin Analytics Dashboard
- **Functionality**: Track page visits, section views, interactions, traffic sources, device types
- **Purpose**: Understand visitor behavior and optimize content
- **Trigger**: Admin clicks analytics button
- **Progression**: Open dashboard → View charts → Filter by date range → Export data
- **Success criteria**: Data is accurate, charts render correctly, insights are actionable

### Media Archive
- **Functionality**: File explorer overlay for press kits, logos, downloadable assets
- **Purpose**: Provide resources for media and promoters
- **Trigger**: User clicks media archive link
- **Progression**: Open explorer overlay → Browse folders → Click file → Download begins
- **Success criteria**: Files are organized, downloads work, overlay closes properly

### Social Media Hub
- **Functionality**: Links to Instagram, Facebook, Spotify, SoundCloud, YouTube, Bandcamp, TikTok
- **Purpose**: Drive traffic to social platforms and build following
- **Trigger**: User clicks social icon or Connect section
- **Progression**: Click icon → External platform opens in new tab
- **Success criteria**: All links work, icons are recognizable, hover states are clear

### Secret Terminal Easter Egg
- **Functionality**: Hidden Konami code terminal with cyberpunk interface
- **Purpose**: Delight power users and reinforce brand aesthetic
- **Trigger**: User enters Konami code (↑↑↓↓←→←→BA)
- **Progression**: Code entered → Terminal animates in → User can type commands → Easter egg content revealed
- **Success criteria**: Code detection works, terminal is functional, commands respond

## Edge Case Handling
- **iTunes API Failure**: Show cached releases or placeholder content if API is unavailable
- **No Upcoming Gigs**: Display "No upcoming shows - check back soon" message
- **Missing Images**: Use placeholder graphics with ZARDONIC branding
- **Mobile Navigation**: Hamburger menu for small screens with smooth drawer animation
- **Slow Connections**: Progressive loading with skeleton screens
- **Admin Without Password**: Redirect to setup page if attempting to access admin features
- **Browser Compatibility**: Graceful degradation for older browsers (no WebGL effects)
- **Empty Galleries**: Show upload prompt in admin mode, hide section for visitors

## Design Direction
The design should evoke a dystopian, industrial cyberpunk aesthetic - like a HUD interface from a dark sci-fi film. Think high-tech weaponry displays, surveillance systems, and military terminals. Every interaction should feel mechanical yet precise, with glitch effects suggesting digital decay beneath a brutalist exterior. The experience should be intense and uncompromising, matching the aggressive energy of the music.

## Color Selection
Pure black and white foundation with crimson red tactical accents creating high contrast and visual aggression.

- **Primary Color**: oklch(0.45 0.22 25) - Deep crimson red, communicates intensity and danger, used for CTAs and interactive elements
- **Secondary Colors**: 
  - Pure black oklch(0.1 0 0) for backgrounds
  - Off-white oklch(0.95 0 0) for primary text
  - Dark gray oklch(0.25 0 0) for cards and elevated surfaces
- **Accent Color**: oklch(0.55 0.25 25) - Brighter crimson for hover states and highlights
- **Foreground/Background Pairings**:
  - Background (Pure Black oklch(0.1 0 0)): Off-white text (oklch(0.95 0 0)) - Ratio 14.2:1 ✓
  - Primary (Deep Crimson oklch(0.45 0.22 25)): White text (oklch(1 0 0)) - Ratio 4.9:1 ✓
  - Card (Dark Gray oklch(0.25 0 0)): Off-white text (oklch(0.95 0 0)) - Ratio 6.1:1 ✓
  - Accent (Bright Crimson oklch(0.55 0.25 25)): Pure black text (oklch(0.1 0 0)) - Ratio 5.2:1 ✓

## Font Selection
Industrial monospace and technical grotesque fonts convey precision, machinery, and military aesthetics.

- **Typographic Hierarchy**:
  - H1 (Hero Logo): JetBrains Mono Bold / 96px / Extra tight (-0.05em) / Uppercase / Scanline effect
  - H2 (Section Headers): JetBrains Mono Bold / 48px / Tight (-0.02em) / Uppercase / HUD corner markers
  - H3 (Subsections): Space Grotesk Bold / 32px / Normal / Uppercase
  - Body (Content): Space Grotesk Regular / 16px / Line height 1.6 / Normal tracking
  - Small (Labels): Space Grotesk Medium / 12px / Uppercase / Wide tracking (0.1em)
  - Code (Terminal): JetBrains Mono Regular / 14px / Monospace / Green text on black

## Animations
Animations should feel mechanical and glitchy, like malfunctioning surveillance systems. Use chromatic aberration on hover, scanline sweeps on section reveals, and brief digital corruption effects on transitions. The music player should have VU meter animations. Profile overlays should have a three-phase animation: loading bars → glitch flash → smooth reveal. Keep timing aggressive (150-250ms) except for intentional dramatic reveals (500ms+).

## Component Selection
- **Components**:
  - Button: Primary CTAs (ticket links, streaming buttons) with crimson fill and glitch effect on hover
  - Card: Release artwork, event listings with dark gray background and red border on hover
  - Dialog: Full-screen overlays for profiles, media archive, and admin panels
  - Slider: Volume control and track progress with crimson fill and metal knob aesthetic
  - Badge: Genre tags, event status (sold out, new) with red fill
  - Tooltip: HUD-style data readouts on hover
  - Separator: Horizontal scan lines between sections
  - Switch: Toggle edit mode with mechanical click animation
  - Textarea/Input: Admin content editing with monospace font and red focus ring
  - Tabs: Navigation between analytics views with underline indicator
  
- **Customizations**:
  - Custom music player component with waveform visualization
  - Custom lightbox gallery with swipe gestures and zoom
  - Custom HUD corner markers (SVG) for section framing
  - Custom scanline/dot-matrix overlay shader
  - Custom konami code detector hook
  - Custom analytics charts with red/black color scheme

- **States**:
  - Buttons: Default (red fill) → Hover (glitch shift + brightness) → Active (pressed inset) → Disabled (gray 50% opacity)
  - Inputs: Default (red underline) → Focus (bright red glow) → Error (red shake animation) → Success (green checkmark)
  - Cards: Default (subtle border) → Hover (bright red border + lift) → Active (red glow)

- **Icon Selection**:
  - Play/Pause: CaretRight, Pause (music player)
  - Volume: SpeakerHigh, SpeakerLow, SpeakerX
  - Navigation: List, X, CaretLeft, CaretRight
  - Social: InstagramLogo, FacebookLogo, SpotifyLogo, SoundcloudLogo, YoutubeLogo
  - Admin: Pencil, FloppyDisk, ChartLine, Download
  - Status: CheckCircle, XCircle, Warning
  - Gallery: MagnifyingGlassPlus, ArrowsOut, X

- **Spacing**:
  - Section padding: 96px vertical, 24px horizontal
  - Card padding: 24px
  - Grid gaps: 16px (mobile), 24px (desktop)
  - Button padding: 12px 24px
  - Section margins: 48px between sections

- **Mobile**:
  - Hero: Reduce logo to 48px, single column layout
  - Navigation: Hamburger menu with drawer from right
  - Music player: Sticky bottom bar, simplified controls
  - Galleries: Single column, touch-optimized swipe
  - Admin: Full-screen panels, larger touch targets
  - Analytics: Stack charts vertically, simplified views
  - Text sizes: Scale down 20% on mobile while maintaining hierarchy
