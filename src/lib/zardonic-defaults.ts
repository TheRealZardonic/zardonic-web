/**
 * zardonic-defaults.ts
 *
 * Site-specific preset data for the Zardonic deployment.
 *
 * This file is the ONLY place in the codebase where Zardonic-branded
 * content lives. When using this project as a template for a different
 * artist / brand, replace (or delete) this file and provide your own
 * preset via the Admin panel or the KV store — never modify
 * `DEFAULT_SITE_DATA` in `app-types.ts`.
 *
 * Usage: the `api/kv.ts` endpoint returns this as the fallback value
 * for the `band-data` key when the KV store contains no data yet
 * (first-time setup scenario).
 */

import type { SiteData } from '@/lib/app-types'

export const ZARDONIC_SITE_DATA_PRESET: SiteData = {
  artistName: 'ZARDONIC',
  heroImage: '',
  bio: `The clash of disparate elements activates innovation, and every generation brings us timeless figures who accidentally spark a new revolutionary sound within the music world. Chuck Berry mixed jazz, blues, gospel and country music to create Rock N Roll. A few decades later, Ozzy Osbourne turned up the gain to create Heavy Metal. And since the early 2000s, Federico Ágreda Álvarez, the masked performer known to the world as DJ and producer Zardonic, has harnessed the power of the nexus between Drum & Bass and Heavy Metal to create the sound that is now known as Metal & Bass. Born and raised in Venezuela, inspired by America, and based in Germany with a passport book stamped into oblivion, he also represents a union of cultures. In his music, these elements charge forward on a collision course towards a future without creative or spiritual borders.`,
  tracks: [],
  gigs: [],
  releases: [],
  gallery: [],
  instagramFeed: [],
  members: [],
  mediaFiles: [],
  creditHighlights: [
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/0f55903209332a56b6137578b492e543373fdc6c/original/sega-logo.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'SEGA' },
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/4b65d0d33e1113b5511272580e87828768cfc2d1/original/7fdd8d8997a41afbdd8381c287d9a984.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Superhot' },
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/6eb32362aa0c4fdcce4fa319b7fa721d1fab0989/original/fearfactory-logo-svg.png/!!/b%3AW1sicmVzaXplIiw2NjBdLFsibWF4Il0sWyJ3ZSJdXQ%3D%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Fear Factory' },
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/5021ea146b63ef5ffaa3fa82ca588a2abacc85db/original/citypng-com-white-aew-all-elite-wrestling-logo-4000x4000.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoyOSwidG9wIjo4NjIsIndpZHRoIjozOTcxLCJoZWlnaHQiOjIyMzN9XSxbInJlc2l6ZSIsNjYwXSxbIm1heCJdLFsid2UiXV0%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'AEW' },
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/682412f8e4ef237f862a19771c88a5a24db05ef0/original/pop-evil-5c8c4556e6b4f.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoxOTIsInRvcCI6MCwid2lkdGgiOjQxMywiaGVpZ2h0IjozMTB9XSxbInJlc2l6ZSIsNjYwXSxbIm1heCJdLFsid2UiXV0%3D/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Pop Evil' },
    { src: 'https://images.zoogletools.com/s:bzglfiles/u/154437/e43afa6931b42622a32c143ea820b45b4bf22772/original/bfmv.png/!!/b%3AW1siZXh0cmFjdCIseyJsZWZ0IjoxMTksInRvcCI6MjUsIndpZHRoIjo4NjcsImhlaWdodCI6NjgyfV0sWyJyZXNpemUiLDY2MF0sWyJtYXgiXSxbIndlIl1d/meta%3AeyJzcmNCdWNrZXQiOiJiemdsZmlsZXMifQ%3D%3D.png', alt: 'Bullet For My Valentine' },
  ],
  social: {
    instagram: 'https://www.instagram.com/djzardonic',
    facebook: 'https://www.facebook.com/zardonic/',
    spotify: 'https://open.spotify.com/intl-de/artist/7BqEidErPMNiUXCRE0dV2n',
    youtube: 'https://www.youtube.com/channel/UCmC_na-XRiW1lhQNRJbAR-w',
    soundcloud: 'https://soundcloud.com/zardonic',
    bandcamp: 'https://zardonic.bandcamp.com/',
    appleMusic: 'https://music.apple.com/de/artist/zardonic/184996964',
  },
}
