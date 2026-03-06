/**
 * Global i18n utility for the site.
 * Supports English (en) and German (de).
 */

export type Locale = 'en' | 'de'

const translations: Record<string, Record<Locale, string>> = {
  // ── Footer ──────────────────────────────────────────────────────────
  'footer.section':            { en: 'FOOTER_SECTION', de: 'FOOTER_BEREICH' },
  'footer.protocol':           { en: 'PROTOCOL: HELLFIRE', de: 'PROTOKOLL: HELLFIRE' },
  'footer.defaultGenres':      { en: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', de: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO' },
  'footer.label':              { en: 'LABEL: {0}', de: 'LABEL: {0}' },
  'footer.copyright':          { en: '© {0} All rights reserved.', de: '© {0} Alle Rechte vorbehalten.' },
  'footer.impressum':          { en: 'IMPRESSUM', de: 'IMPRESSUM' },
  'footer.datenschutz':        { en: 'PRIVACY POLICY', de: 'DATENSCHUTZ' },
  'footer.admin':              { en: 'ADMIN', de: 'ADMIN' },
  'footer.adminLogin':         { en: 'Admin login', de: 'Admin-Login' },
  'footer.backToTop':          { en: 'BACK TO TOP', de: 'NACH OBEN' },

  // ── Navigation ──────────────────────────────────────────────────────
  'nav.home':                  { en: 'HOME', de: 'STARTSEITE' },
  'nav.news':                  { en: 'NEWS', de: 'NEUIGKEITEN' },
  'nav.biography':             { en: 'BIOGRAPHY', de: 'BIOGRAFIE' },
  'nav.gallery':               { en: 'GALLERY', de: 'GALERIE' },
  'nav.gigs':                  { en: 'GIGS', de: 'AUFTRITTE' },
  'nav.releases':              { en: 'RELEASES', de: 'VERÖFFENTLICHUNGEN' },
  'nav.media':                 { en: 'MEDIA', de: 'MEDIEN' },
  'nav.connect':               { en: 'CONNECT', de: 'VERBINDEN' },
  'nav.closePlayer':           { en: 'Close music player', de: 'Musik-Player schließen' },
  'nav.openPlayer':            { en: 'Open music player', de: 'Musik-Player öffnen' },

  // ── CookieBanner ────────────────────────────────────────────────────
  'cookie.notice':             { en: 'SYSTEM_NOTICE', de: 'SYSTEM_HINWEIS' },
  'cookie.text':               { en: 'This website uses technically necessary local storage (Local Storage, IndexedDB) for settings and image caching. No tracking cookies are set. For more information, see our privacy policy.', de: 'Diese Website verwendet technisch notwendige lokale Speicherung (Local Storage, IndexedDB) für Einstellungen und Bildcaching. Es werden keine Tracking-Cookies gesetzt. Weitere Informationen finden Sie in unserer Datenschutzerklärung.' },
  'cookie.decline':            { en: 'DECLINE', de: 'ABLEHNEN' },
  'cookie.accept':             { en: 'ACCEPT', de: 'AKZEPTIEREN' },

  // ── Hero ────────────────────────────────────────────────────────────
  'hero.sysLabel':             { en: 'SYS: NK-MAIN', de: 'SYS: NK-MAIN' },
  'hero.online':               { en: 'ONLINE', de: 'ONLINE' },
  'hero.freq':                 { en: 'FREQ: 140-180', de: 'FREQ: 140-180' },
  'hero.mode':                 { en: 'MODE: HARD', de: 'MODE: HARD' },
  'hero.logoAlt':              { en: 'Logo', de: 'Logo' },
  'hero.titleAlt':             { en: 'NEUROKLAST', de: 'NEUROKLAST' },
  'hero.editInfo':             { en: 'Edit Info', de: 'Info bearbeiten' },
  'hero.enter':                { en: 'ENTER', de: 'EINTRETEN' },

  // ── NewsSection ─────────────────────────────────────────────────────
  'news.defaultTitle':         { en: 'NEWS', de: 'NEUIGKEITEN' },
  'news.link':                 { en: 'LINK', de: 'LINK' },
  'news.readMore':             { en: 'CLICK TO READ MORE', de: 'KLICKEN UM MEHR ZU LESEN' },
  'news.noNews':               { en: 'No news yet.', de: 'Noch keine Neuigkeiten.' },
  'news.showLess':             { en: 'Show Less', de: 'Weniger anzeigen' },
  'news.showMore':             { en: 'Show More ({0} more)', de: 'Mehr anzeigen ({0} weitere)' },
  'news.share':                { en: 'SHARE', de: 'TEILEN' },
  'news.copied':               { en: 'COPIED', de: 'KOPIERT' },
  'news.openLink':             { en: 'OPEN LINK', de: 'LINK ÖFFNEN' },
  'news.entry':                { en: 'NEWS ENTRY', de: 'NACHRICHTEN-EINTRAG' },
  'news.version':              { en: 'NK-NEWS v1.0', de: 'NK-NEWS v1.0' },
  'news.editTitle':            { en: 'EDIT NEWS', de: 'NEUIGKEITEN BEARBEITEN' },
  'news.addTitle':             { en: 'ADD NEWS', de: 'NEUIGKEIT HINZUFÜGEN' },

  // ── BiographySection ────────────────────────────────────────────────
  'bio.defaultTitle':          { en: 'BIOGRAPHY', de: 'BIOGRAFIE' },
  'bio.editButton':            { en: 'Edit Bio', de: 'Bio bearbeiten' },

  // ── GigsSection ─────────────────────────────────────────────────────
  'gigs.defaultTitle':         { en: 'UPCOMING GIGS', de: 'ANSTEHENDE AUFTRITTE' },
  'gigs.noGigs':               { en: 'No upcoming gigs scheduled.', de: 'Keine anstehenden Auftritte geplant.' },
  'gigs.tickets':              { en: 'TICKETS', de: 'TICKETS' },
  'gigs.addGig':               { en: 'Add Gig', de: 'Auftritt hinzufügen' },

  // ── ReleasesSection ─────────────────────────────────────────────────
  'releases.defaultTitle':     { en: 'RELEASES', de: 'VERÖFFENTLICHUNGEN' },
  'releases.noReleases':       { en: 'No releases yet.', de: 'Noch keine Veröffentlichungen.' },
  'releases.addRelease':       { en: 'Add Release', de: 'Release hinzufügen' },

  // ── Contact ─────────────────────────────────────────────────────────
  'contact.defaultTitle':      { en: 'CONTACT', de: 'KONTAKT' },
  'contact.description':       { en: 'Get in touch with us.', de: 'Nimm Kontakt mit uns auf.' },
  'contact.nameLabel':         { en: 'NAME', de: 'NAME' },
  'contact.namePlaceholder':   { en: 'Your name...', de: 'Dein Name...' },
  'contact.emailLabel':        { en: 'EMAIL', de: 'E-MAIL' },
  'contact.emailPlaceholder':  { en: 'your@email.com', de: 'deine@email.com' },
  'contact.subjectLabel':      { en: 'SUBJECT', de: 'BETREFF' },
  'contact.subjectPlaceholder': { en: 'Subject...', de: 'Betreff...' },
  'contact.messageLabel':      { en: 'MESSAGE', de: 'NACHRICHT' },
  'contact.messagePlaceholder': { en: 'Your message...', de: 'Deine Nachricht...' },
  'contact.send':              { en: 'SEND MESSAGE', de: 'NACHRICHT SENDEN' },
  'contact.sending':           { en: 'SENDING...', de: 'WIRD GESENDET...' },
  'contact.success':           { en: 'Message sent successfully!', de: 'Nachricht erfolgreich gesendet!' },
  'contact.sendError':         { en: 'Failed to send message. Please try again.', de: 'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.' },
  'contact.newMessage':        { en: 'SEND ANOTHER', de: 'WEITERE SENDEN' },
  'contact.settings':          { en: 'CONTACT SETTINGS', de: 'KONTAKT-EINSTELLUNGEN' },
  'contact.titleLabel':        { en: 'Section Title', de: 'Abschnittstitel' },
  'contact.titlePlaceholder':  { en: 'CONTACT', de: 'KONTAKT' },
  'contact.emailForward':      { en: 'Forward to Email', de: 'Weiterleiten an E-Mail' },
  'contact.emailForwardPlaceholder': { en: 'admin@example.com', de: 'admin@example.com' },
  'contact.descriptionLabel':  { en: 'Description', de: 'Beschreibung' },
  'contact.descriptionPlaceholder': { en: 'Get in touch...', de: 'Kontaktiere uns...' },
  'contact.successLabel':      { en: 'Success Message', de: 'Erfolgsnachricht' },
  'contact.successPlaceholder': { en: 'Thanks for reaching out!', de: 'Danke für deine Nachricht!' },

  // ── Social ──────────────────────────────────────────────────────────
  'social.defaultTitle':       { en: 'CONNECT', de: 'VERBINDEN' },
  'social.editLinks':          { en: 'Edit Links', de: 'Links bearbeiten' },

  // ── Newsletter ──────────────────────────────────────────────────────
  'newsletter.title':          { en: 'STAY CONNECTED', de: 'BLEIB VERBUNDEN' },
  'newsletter.description':    { en: 'Get the latest news, releases and gig updates.', de: 'Erhalte die neuesten News, Releases und Gig-Updates.' },
  'newsletter.placeholder':    { en: 'your@email.com', de: 'deine@email.com' },
  'newsletter.subscribe':      { en: 'SUBSCRIBE', de: 'ABONNIEREN' },
  'newsletter.signupError':    { en: 'Error signing up', de: 'Fehler beim Anmelden' },
  'newsletter.networkError':   { en: 'Network error. Please try again later.', de: 'Netzwerkfehler. Bitte versuche es später erneut.' },
  'newsletter.success':        { en: "✓ You're in! Check your emails.", de: '✓ Du bist dabei! Check deine E-Mails.' },
  'newsletter.unsubscribe':    { en: 'You can unsubscribe at any time.', de: 'Du kannst dich jederzeit abmelden.' },

  // ── ErrorFallback ───────────────────────────────────────────────────
  'error.title':               { en: 'Runtime Error', de: 'Laufzeitfehler' },
  'error.description':         { en: 'Something unexpected happened while running the application.', de: 'Beim Ausführen der Anwendung ist ein unerwarteter Fehler aufgetreten.' },
  'error.details':             { en: 'Error Details:', de: 'Fehlerdetails:' },
  'error.tryAgain':            { en: 'Try Again', de: 'Erneut versuchen' },

  // ── Gallery ─────────────────────────────────────────────────────────
  'gallery.defaultTitle':      { en: 'GALLERY', de: 'GALERIE' },
  'gallery.subtitle':          { en: 'Visual identity', de: 'Visuelle Identität' },
  'gallery.noImages':          { en: 'No images found in gallery', de: 'Keine Bilder in der Galerie gefunden' },

  // ── Partners ────────────────────────────────────────────────────────
  'partners.defaultTitle':     { en: 'PARTNERS & FRIENDS', de: 'PARTNER & FREUNDE' },

  // ── EditControls ────────────────────────────────────────────────────
  'edit.export':               { en: 'EXPORT', de: 'EXPORT' },
  'edit.import':               { en: 'IMPORT', de: 'IMPORT' },
  'edit.config':               { en: 'CONFIG', de: 'KONFIG' },
  'edit.analytics':            { en: 'ANALYTICS', de: 'ANALYTIK' },
  'edit.security':             { en: 'SECURITY', de: 'SICHERHEIT' },
  'edit.blocklist':            { en: 'BLOCKLIST', de: 'SPERRLISTE' },
  'edit.theme':                { en: 'THEME', de: 'DESIGN' },
  'edit.terminal':             { en: 'TERMINAL', de: 'TERMINAL' },
  'edit.inbox':                { en: 'INBOX', de: 'POSTFACH' },
  'edit.subscribers':          { en: 'SUBSCRIBERS', de: 'ABONNENTEN' },
  'edit.password':             { en: 'PASSWORD', de: 'PASSWORT' },
  'edit.logout':               { en: 'LOGOUT', de: 'ABMELDEN' },

  // ── CyberpunkLoader ─────────────────────────────────────────────────
  'loader.bootSequence':       { en: 'NK-SYS [v2.0] // BOOT SEQUENCE', de: 'NK-SYS [v2.0] // STARTSEQUENZ' },
}

/** Get a translated string for a key and locale */
export function t(key: string, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.en ?? key
}
