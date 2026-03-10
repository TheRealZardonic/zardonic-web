# Zardonic - Cyberpunk Industrial Theme

A dark, high-tech cyberpunk theme designed for industrial/metal music bands. Features CRT monitor effects, animated scanlines, chromatic aberration, and glitch aesthetics.

## Theme Overview

**Theme ID:** `zardonic-industrial-theme`  
**Name:** Zardonic - Cyberpunk Industrial  
**Style:** Dark cyberpunk with retro CRT aesthetics

### Color Palette

```css
Primary: oklch(0.55 0.25 25)  /* Orange-red accent */
Background: oklch(0.1 0 0)     /* Near black */
Foreground: oklch(0.95 0 0)    /* Near white */
Card: oklch(0.15 0 0)          /* Dark gray */
Muted: oklch(0.25 0 0)         /* Mid gray */
Border: oklch(0.25 0 0)        /* Mid gray */
```

### Typography

- **Heading:** `'Orbitron', sans-serif` - Futuristic, geometric sans-serif
- **Body:** `'Share Tech Mono', monospace` - Technical monospace font
- **Mono:** `'Share Tech Mono', monospace`

## Components

### Core Structural Components

#### 1. **LoadingScreen**
Initial entry animation with system boot sequence.

```tsx
<LoadingScreen 
  onLoadComplete={() => console.log('Loaded')}
  precacheUrls={['image1.jpg', 'image2.jpg']}
/>
```

**Props:**
- `onLoadComplete?: () => void` - Callback when loading completes
- `precacheUrls?: string[]` - Images to preload during loading screen

**Features:**
- Animated progress bar
- System-style loading messages
- Dual-ring loader with CRT effects
- HUD corner decorations

---

#### 2. **BackgroundEffects**
Persistent background layers (pointer-events-none).

```tsx
<BackgroundEffects />
```

**Features:**
- Full-page noise/grain texture
- CRT monitor overlay
- Vignette effect
- Animated scanline moving down viewport
- Circuit board pattern background

---

#### 3. **Navigation**
Fixed header navigation bar.

```tsx
<Navigation 
  logo="/logo.png"
  brandName="BAND NAME"
  menuItems={[
    { label: 'Bio', href: '#bio' },
    { label: 'Music', href: '#music' },
  ]}
  onNavigate={(href) => console.log(href)}
/>
```

**Props:**
- `logo?: string | React.ReactNode` - Logo image or custom component
- `brandName?: string` - Fallback text if no logo (default: `'{{BAND_NAME}}'`)
- `menuItems?: { label: string; href: string }[]` - Navigation links
- `onNavigate?: (href: string) => void` - Custom navigation handler

**Features:**
- Responsive mobile menu
- Chromatic aberration hover effects
- Scanline overlay
- Smooth scroll navigation

---

#### 4. **Hero**
Full-height hero section with logo and CTA buttons.

```tsx
<Hero 
  logo="/logo.png"
  brandName="BAND NAME"
  tagline="Industrial Metal from the Future"
  ctaButtons={[
    { label: 'Listen Now', href: '#music', variant: 'default' },
    { label: 'Tour Dates', href: '#gigs', variant: 'outline' },
  ]}
  backgroundImage="/hero-bg.jpg"
  onCtaClick={(href) => console.log(href)}
/>
```

**Props:**
- `logo?: string | React.ReactNode`
- `brandName?: string`
- `tagline?: string`
- `ctaButtons?: { label: string; href: string; variant?: 'default' | 'outline' }[]`
- `backgroundImage?: string`
- `onCtaClick?: (href: string) => void`

**Features:**
- Triple-layer glitch effect on logo
- Chromatic aberration animation
- Noise overlay
- Animated entrance

---

#### 5. **Card**
Reusable card wrapper with cyber border effects.

```tsx
<Card variant="cyber" animate={true} delay={0.2}>
  <div>Card content here</div>
</Card>
```

**Props:**
- `children: ReactNode`
- `className?: string`
- `onClick?: () => void`
- `variant?: 'default' | 'outline' | 'cyber'` (default: `'cyber'`)
- `animate?: boolean` (default: `true`)
- `delay?: number` (default: `0`)

**Features:**
- Cyber corner decorations on hover
- Animated reveal on scroll
- Scanline effect
- Data label indicator

---

#### 6. **SectionDivider**
Visual separators between sections.

```tsx
<SectionDivider variant="line" />
<SectionDivider variant="circuit" />
<SectionDivider variant="glitch" />
```

**Props:**
- `variant?: 'line' | 'circuit' | 'glitch' | 'none'` (default: `'line'`)
- `className?: string`

---

### Content Section Components

#### 7. **BiographySection**
Layout for band bio text and photo.

```tsx
<BiographySection 
  title="BIOGRAPHY"
  bioText="Band biography text here..."
  photoUrl="/band-photo.jpg"
  photoAlt="Band Name"
  layout="text-first"
/>
```

**Props:**
- `title?: string` (default: `'BIOGRAPHY'`)
- `bioText?: string` (default: `'{{BIO_TEXT}}'`)
- `photoUrl?: string`
- `photoAlt?: string`
- `layout?: 'text-first' | 'image-first'` (default: `'text-first'`)

---

#### 8. **GigsSection**
List of upcoming tour dates.

```tsx
<GigsSection 
  title="UPCOMING GIGS"
  gigs={[
    {
      id: '1',
      venue: 'The Venue',
      location: 'City, Country',
      date: '2025-12-31',
      ticketUrl: 'https://tickets.com',
      support: 'Support Act Name'
    }
  ]}
  onTicketClick={(gig) => console.log(gig)}
/>
```

**Props:**
- `title?: string`
- `gigs?: Gig[]`
- `onTicketClick?: (gig: Gig) => void`

**Gig Interface:**
```typescript
interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
}
```

---

#### 9. **ReleasesSection**
Grid of album releases.

```tsx
<ReleasesSection 
  title="RELEASES"
  releases={[
    {
      id: '1',
      title: 'Album Title',
      artwork: '/album-cover.jpg',
      year: '2024'
    }
  ]}
  onReleaseClick={(release) => console.log(release)}
/>
```

**Props:**
- `title?: string`
- `releases?: Release[]`
- `onReleaseClick?: (release: Release) => void`

**Release Interface:**
```typescript
interface Release {
  id: string
  title: string
  artwork: string
  year: string
}
```

---

#### 10. **SocialSection**
Social media links and optional video embed.

```tsx
<SocialSection 
  title="CONNECT"
  socialLinks={[
    {
      platform: 'Instagram',
      url: 'https://instagram.com/band',
      icon: InstagramLogo
    }
  ]}
  videoEmbedUrl="https://youtube.com/embed/..."
/>
```

**Props:**
- `title?: string`
- `socialLinks?: SocialLink[]`
- `videoEmbedUrl?: string`

**SocialLink Interface:**
```typescript
interface SocialLink {
  platform: string
  url: string
  icon?: React.ComponentType<{ className?: string; weight?: string }>
}
```

---

#### 11. **Footer**
Copyright and legal links.

```tsx
<Footer 
  brandName="BAND NAME"
  copyrightYear={2024}
  imprintLink="#imprint"
  privacyLink="#privacy"
  additionalLinks={[
    { label: 'Contact', href: '#contact' }
  ]}
/>
```

**Props:**
- `brandName?: string`
- `copyrightYear?: number`
- `imprintLink?: string`
- `privacyLink?: string`
- `additionalLinks?: { label: string; href: string }[]`

---

### Utility Components

#### 12. **ThemeModalWrapper**
Animated modal with cyberpunk styling.

```tsx
<ThemeModalWrapper 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Modal Title"
>
  <div>Modal content</div>
</ThemeModalWrapper>
```

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `title?: string`
- `children: ReactNode`

**Features:**
- Framer Motion enter/exit animations
- HUD corner decorations
- Animated bars and labels
- Backdrop blur overlay

---

#### 13. **GlobalOverlayLayer**
Controllable overlay effects (pointer-events-none).

```tsx
<GlobalOverlayLayer 
  crtIntensity={0.6}
  vignetteIntensity={0.3}
  noiseIntensity={0.4}
  scanlineIntensity={1}
/>
```

**Props:**
- `crtIntensity?: number` (0-1, default: 0.6)
- `vignetteIntensity?: number` (0-1, default: 0.3)
- `noiseIntensity?: number` (0-1, default: 0.4)
- `scanlineIntensity?: number` (0-1, default: 1)

---

## CSS Classes

All CSS classes are prefixed with `zardonic-theme-` to avoid global collisions.

### Effects Classes

- `.zardonic-theme-scanline-effect` - Animated scanline overlay
- `.zardonic-theme-noise-effect` - Grain/noise texture
- `.zardonic-theme-crt-overlay` - CRT monitor overlay
- `.zardonic-theme-crt-vignette` - Vignette darkening
- `.zardonic-theme-full-page-noise` - Full-page noise layer
- `.zardonic-theme-periodic-noise-glitch` - Periodic glitch animation

### Interactive Classes

- `.zardonic-theme-hover-chromatic` - Chromatic aberration on hover
- `.zardonic-theme-hover-chromatic-image` - Image chromatic effect
- `.zardonic-theme-hover-glitch` - Glitch effect on hover
- `.zardonic-theme-hover-noise` - Noise reveal on hover

### Component Classes

- `.zardonic-theme-cyber-card` - Card with cyber corners
- `.zardonic-theme-cyber-border` - Cyber border with corners
- `.zardonic-theme-scan-line` - Animated scan line
- `.zardonic-theme-data-label` - Small technical label text
- `.zardonic-theme-hud-corner` - HUD corner decoration

### Logo Effects

- `.zardonic-theme-hero-logo-glitch` - Hero logo entrance effect
- `.zardonic-theme-logo-glitch` - Logo glitch animation

---

## Data Placeholders

Use these placeholders for dynamic content integration:

### Text Placeholders
- `{{BAND_NAME}}` - Band/artist name
- `{{BIO_TEXT}}` - Biography paragraph
- `{{GIG_VENUE_*}}` - Venue names
- `{{GIG_LOCATION_*}}` - City, country
- `{{GIG_DATE_*}}` - Date string
- `{{SUPPORT_ACT_*}}` - Support act names
- `{{ALBUM_TITLE_*}}` - Release titles
- `{{RELEASE_YEAR_*}}` - Release years

### URL Placeholders
- `{{HERO_IMAGE}}` - Hero background image
- `{{ALBUM_ARTWORK_*}}` - Album cover URLs
- `{{INSTAGRAM_URL}}` - Social media URLs
- `{{FACEBOOK_URL}}`
- `{{SPOTIFY_URL}}`
- `{{YOUTUBE_URL}}`
- `{{SOUNDCLOUD_URL}}`
- `{{TIKTOK_URL}}`

---

## Example Usage

```tsx
import { zardonicTheme } from '@/themes/zardonic'

const {
  Hero,
  Navigation,
  BackgroundEffects,
  BiographySection,
  GigsSection,
  ReleasesSection,
  SocialSection,
  Footer,
  LoadingScreen,
  GlobalOverlayLayer
} = zardonicTheme.slots

function App() {
  const [loading, setLoading] = useState(true)

  return (
    <>
      {loading && (
        <LoadingScreen onLoadComplete={() => setLoading(false)} />
      )}
      
      <BackgroundEffects />
      <GlobalOverlayLayer />
      
      <Navigation 
        logo="/logo.png"
        brandName="BAND NAME"
      />
      
      <Hero 
        logo="/logo.png"
        tagline="Industrial Metal from the Future"
      />
      
      <BiographySection 
        bioText="Biography text..."
        photoUrl="/band-photo.jpg"
      />
      
      <GigsSection gigs={gigsData} />
      <ReleasesSection releases={releasesData} />
      <SocialSection socialLinks={socialData} />
      <Footer brandName="BAND NAME" />
    </>
  )
}
```

---

## Responsive Behavior

The theme automatically adjusts for mobile devices:
- Navigation collapses to hamburger menu on small screens
- Grid layouts reflow from multi-column to single column
- Heavy visual effects (noise, CRT, scanlines) are disabled on mobile for performance
- Touch-friendly button sizes (minimum 44x44px)

---

## Accessibility

- Respects `prefers-reduced-motion` media query
- Proper focus states on interactive elements
- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

---

## Performance Optimizations

- CSS keyframes use `transform` and `opacity` for GPU acceleration
- `will-change` hints for animated elements
- `contain: strict` on fixed overlay layers
- Conditional rendering of effects on mobile
- Lazy loading of images with `loading="lazy"`

---

## Integration Notes

This theme is designed as a **presentational layer** for headless CMS integration:
- All components accept data via props
- No data fetching logic included
- Clear placeholder structure for content mapping
- Event handlers use callbacks for custom behavior
- Components are fully typed with TypeScript

---

## License

This theme is part of the Spark Theme System.
