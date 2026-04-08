export interface Track {
  id: string
  title: string
  artist: string
  url: string
  artwork?: string
}

export interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
  lineup?: string[]
  streetAddress?: string
  postalCode?: string
  soldOut?: boolean
  startsAt?: string
  description?: string
  title?: string
}

export interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
}

export interface Member {
  id: string
  name: string
  role: string
  bio: string
  image?: string
  instagram?: string
}

export interface MediaFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'zip'
  url: string
  size: string
}

export interface CreditHighlight {
  src: string
  alt: string
}

export interface SiteData {
  artistName: string
  heroImage: string
  bio: string
  tracks: Track[]
  gigs: Gig[]
  releases: Release[]
  gallery: string[]
  instagramFeed: string[]
  members: Member[]
  mediaFiles: MediaFile[]
  creditHighlights: CreditHighlight[]
  social: {
    instagram?: string
    facebook?: string
    spotify?: string
    youtube?: string
    soundcloud?: string
    bandcamp?: string
    tiktok?: string
    appleMusic?: string
    twitter?: string
    twitch?: string
    beatport?: string
    linktree?: string
  }
}

export const DEFAULT_SITE_DATA: SiteData = {
  artistName: 'ZARDONIC',
  heroImage: '',
  bio: `The clash of disparate elements activates innovation, and every generation brings us timeless figures who accidentally spark a new revolutionary sound within the music world. Chuck Berry mixed jazz, blues, gospel and country music to create Rock N Roll. A few decades later, Ozzy Osbourne turned up the gain to create Heavy Metal. And since the early 2000s, Federico Ágreda Álvarez, the masked performer known to the world as DJ and producer Zardonic, has harnessed the power of the nexus between Drum & Bass and Heavy Metal to create the sound that is now known as Metal & Bass. Born and raised in Venezuela, inspired by America, and based in Germany with a passport book stamped into oblivion, he also represents a union of cultures. In his music, these elements charge forward on a collision course towards a future without creative or spiritual borders. Instead, the award-winning artist draws an inimitable energy from this confluence. Following a prolific string of releases, high-profile remixes and video game collaborations, packed shows on multiple continents, and 100 million-plus streams, he realizes the power and potential of his vision like never before on his 2023 full-length offering Superstars [MNRK HEAVY]. "It's been a long road trying to find the perfect flashpoint between the metal and electronic worlds," he states about his third MNRK studio album, which follows Antihero (2015) and Become (2018). "To me, music is a direct translation of human emotion. I'm all about bringing sounds and people together with no boundaries at all. I don't like limits, so my approach is to be limitless." Boundlessness has defined his output since day one. Zardonic has cultivated an expansive catalogue of original tracks and remixes for platinum icons, leaving his imprint on Pop Evil, Fear Factory, Bullet For My Valentine and Sonic Syndicate, among others. He has also contributed music to soundtracks for videogames such as Superhot: Mind Control Delete and Redout 2, plus features on All Elite Wrestling, TNT and NBC Sports. He's the rare force of nature who can earn praise from both YourEDM and Metal Injection. Renowned as "Venezuela's Top DJ Act," he has impressively toppled Beatport's Drum & Bass Releases of the Week and Amazon's Hard Rock Bestsellers at #1. Not to mention, he even appeared in Warlocks Vs Shadows, standing out as "the first Latin American musician to ever be featured as a playable character in a video game.", and if you're a music producer yourself, chances are you've already used a few of his hundreds of factory presets and artist packs he's created for Arturia, Brainworx, Slate Digital, BABY Audio, GForce Software, and many more. As if reflecting progression in palpable form, Zardonic's signature mask has evolved with him. "To some extent, every mask marks the end of an era in my life and my way of approaching music," he notes. "The mask from the Become album and recent tours received a lot of battle damage. I had to constantly glue it back together. The paint scraped off. It wore a lot of scars with pride, yet it was a huge weight on my shoulders because no longer want to these scars to rule my decisions. Hence, the new mask is the exact opposite: shiny, sparkly and full of life. You could say I'm constantly resurrecting the Zardonic character, so to speak." The new album features an assortment of international talents from the Drum & Bass and Hard Rock worlds, including UK singer/songwriter Reebz, featured on the single "Bitter", as well as Nazareth singer Carl Sentance, Toronto Is Broken, Daedric, Hevy, Bruno Balanta from The Qemists, Rage guitarist Jean Bormann, Blitz Union, Norwegian Blackjazz virtuosos SHINING, The Surgery & MC Reptile, Mechanical Vein, Camo MC, and Omnimar. "I am humbled to have such a strong relationship with a group of amazing people. I could spend hours writing about them, but they know that if we're working together, it's because they mean a great deal to me. My most important thing is being able to genuinely connect with the people I work with. If I can't have fun with an artist, there's simply no point in it, and I am glad to call these amazing Superstars my friends." In the end, Zardonic will unite listeners with Superstars. "At the core of everything, I try to breathe life into people," he leaves off. "I'm blessed enough to be able to do what I love the most, and that is Music. Music is my own form of self-healing. It allows me to float above the darkness. Maybe, it will do the same for you."`,
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

/** Discriminated union so TypeScript narrows `data` to the correct type per overlay variant. */
export type CyberpunkOverlayState =
  | { type: 'impressum' | 'privacy' | 'contact'; data?: never }
  | { type: 'gig'; data: Gig }
  | { type: 'release'; data: Release }
  | { type: 'member'; data: Member }
