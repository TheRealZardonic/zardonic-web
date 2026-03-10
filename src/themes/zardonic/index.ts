import Hero from './Hero'
import Navigation from './Navigation'
import Card from './Card'
import BackgroundEffects from './BackgroundEffects'
import SectionDivider from './SectionDivider'
import LoadingScreen from './LoadingScreen'
import BiographySection from './BiographySection'
import GigsSection from './GigsSection'
import ReleasesSection from './ReleasesSection'
import SocialSection from './SocialSection'
import Footer from './Footer'
import ThemeModalWrapper from './ThemeModalWrapper'
import GlobalOverlayLayer from './GlobalOverlayLayer'
import './styles.css'

export const zardonicTheme = {
  id: 'zardonic-industrial-theme',
  name: 'Zardonic - Cyberpunk Industrial',
  description: 'A dark, high-tech cyberpunk theme with CRT effects, scanlines, and chromatic aberration for industrial/metal music bands',
  colors: {
    primary: 'oklch(0.55 0.25 25)',
    accent: 'oklch(0.55 0.25 25)',
    background: 'oklch(0.1 0 0)',
    foreground: 'oklch(0.95 0 0)',
    card: 'oklch(0.15 0 0)',
    muted: 'oklch(0.25 0 0)',
    border: 'oklch(0.25 0 0)',
  },
  fonts: {
    heading: "'Orbitron', sans-serif",
    body: "'Share Tech Mono', monospace",
    mono: "'Share Tech Mono', monospace",
  },
  slots: {
    Hero,
    Navigation,
    Card,
    BackgroundEffects,
    SectionDivider,
    LoadingScreen,
    BiographySection,
    GigsSection,
    ReleasesSection,
    SocialSection,
    Footer,
    ThemeModalWrapper,
    GlobalOverlayLayer,
  }
}

export {
  Hero,
  Navigation,
  Card,
  BackgroundEffects,
  SectionDivider,
  LoadingScreen,
  BiographySection,
  GigsSection,
  ReleasesSection,
  SocialSection,
  Footer,
  ThemeModalWrapper,
  GlobalOverlayLayer,
}

export default zardonicTheme
