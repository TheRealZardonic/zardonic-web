import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  X,
  MapPin,
  CalendarBlank,
  Ticket,
  InstagramLogo,
  SpotifyLogo,
  YoutubeLogo,
  ApplePodcastsLogo,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import type { AdminSettings } from '@/lib/types'
import type { CyberpunkOverlayState } from '@/lib/app-types'
import {
  OVERLAY_LOADING_TEXT_INTERVAL_MS,
  OVERLAY_GLITCH_PHASE_DELAY_MS,
  OVERLAY_REVEAL_PHASE_DELAY_MS,
} from '@/lib/config'
import { submitContactForm, contactFormSchema } from '@/lib/contact'
import { useLocale } from '@/contexts/LocaleContext'

const OVERLAY_LOADING_TEXTS = [
  '> ACCESSING PROFILE...',
  '> DECRYPTING DATA...',
  '> IDENTITY VERIFIED',
]

interface CyberpunkOverlayProps {
  overlay: CyberpunkOverlayState | null
  onClose: () => void
  adminSettings: AdminSettings | undefined
}

export default function CyberpunkOverlay({ overlay, onClose, adminSettings }: CyberpunkOverlayProps) {
  const { locale: language, setLocale: setLanguage } = useLocale()
  const [overlayPhase, setOverlayPhase] = useState<'loading' | 'glitch' | 'revealed'>('loading')
  const [loadingText, setLoadingText] = useState(OVERLAY_LOADING_TEXTS[0])

  useEffect(() => {
    if (!overlay) return

    setOverlayPhase('loading')
    setLoadingText(OVERLAY_LOADING_TEXTS[0])

    let idx = 0
    const txtInterval = setInterval(() => {
      idx += 1
      if (idx <= OVERLAY_LOADING_TEXTS.length - 1) {
        setLoadingText(OVERLAY_LOADING_TEXTS[idx])
      }
    }, OVERLAY_LOADING_TEXT_INTERVAL_MS)

    const glitchTimer = setTimeout(() => {
      clearInterval(txtInterval)
      setOverlayPhase('glitch')
    }, OVERLAY_GLITCH_PHASE_DELAY_MS)

    const revealTimer = setTimeout(() => {
      setOverlayPhase('revealed')
    }, OVERLAY_REVEAL_PHASE_DELAY_MS)

    return () => {
      clearInterval(txtInterval)
      clearTimeout(glitchTimer)
      clearTimeout(revealTimer)
    }
  }, [overlay])

  return (
    <AnimatePresence>
      {overlay && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/90 z-[100] backdrop-blur-sm cyberpunk-overlay-bg"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            <motion.div
              initial={{ boxShadow: '0 0 0px rgba(180, 50, 50, 0)' }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                  '0 0 40px rgba(180, 50, 50, 0.4)',
                  '0 0 20px rgba(180, 50, 50, 0.3)',
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative max-w-4xl w-full bg-background/98 border border-primary/30 pointer-events-auto overflow-hidden max-h-[90vh] scanline-effect cyber-card"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary"
                initial={{ opacity: 0, x: -10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              />
              <motion.div
                className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary"
                initial={{ opacity: 0, x: 10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary"
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              />
              <motion.div
                className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary"
                initial={{ opacity: 0, x: 10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              />

              <motion.div
                className="absolute top-2 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <div className="data-label">// SYSTEM.INTERFACE.v2.0</div>
              </motion.div>

              <motion.div
                className="absolute top-0 left-0 right-0 h-1 bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                style={{ transformOrigin: 'right' }}
              />

              {/* 3-phase content loading wrapper */}
              <div className="relative overflow-y-auto max-h-[90vh]">
                {/* Loading phase */}
                {overlayPhase === 'loading' && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <motion.span
                      className="progressive-loading-label text-primary font-mono text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {loadingText}
                    </motion.span>
                  </div>
                )}

                {/* Glitch phase */}
                {overlayPhase === 'glitch' && (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <motion.div
                      className="glitch-effect text-primary font-mono text-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                      transition={{ duration: 0.2 }}
                    >
                      {loadingText}
                    </motion.div>
                  </div>
                )}

                {/* Revealed phase */}
                {overlayPhase === 'revealed' && (
                  <div className="p-8 md:p-12 pt-12">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 text-foreground hover:text-primary hover:bg-primary/10 z-10"
                      onClick={onClose}
                    >
                      <X className="w-6 h-6" />
                    </Button>

                    <AnimatePresence mode="wait">
                      {overlayPhase === 'revealed' && (
                        <>
                          {overlay.type === 'impressum' && (
                            <motion.div
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3, staggerChildren: 0.05 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// LEGAL.INFORMATION.STREAM</div>
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="IMPRESSUM">
                                  IMPRESSUM
                                </h2>
                              </motion.div>

                              {adminSettings?.legalContent?.impressumCustom ? (
                                <div className="cyber-grid p-4">
                                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                    {adminSettings.legalContent.impressumCustom}
                                  </div>
                                </div>
                              ) : (
                              <div className="space-y-6 text-foreground/90">
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-2">Angaben gemäß § 5 DDG</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Augusto Ágreda Álvarez</p>
                                    <p>c/o Online-Impressum.de #6397</p>
                                    <p>Europaring 90</p>
                                    <p>53757 Sankt Augustin</p>
                                    <p>Deutschland</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Kontakt / Contact</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>E-Mail: info@zardonic.net</p>
                                    <p>Website: www.zardonic.net</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-2">Umsatzsteuer-Identifikationsnummer</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:</p>
                                    <p>DE325982176</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-2">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>Federico Augusto Ágreda Álvarez</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.45 }}
                                >
                                  <div className="data-label mb-2">EU-Streitschlichtung</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
                                    <p>The European Commission provides a platform for online dispute resolution (ODR): <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a></p>
                                    <p>Unsere E-Mail-Adresse finden Sie oben im Impressum. / Our e-mail address can be found above in the Impressum.</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <div className="data-label mb-2">Verbraucherstreitbeilegung / Universalschlichtungsstelle</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
                                    <p>We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.55 }}
                                >
                                  <div className="data-label mb-2">Haftung für Inhalte / Liability for Content</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
                                    <p>As a service provider, we are responsible for our own content on these pages in accordance with § 7 (1) DDG and general laws. According to §§ 8 to 10 DDG, however, we are not obliged as a service provider to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.6 }}
                                >
                                  <div className="data-label mb-2">Haftung für Links / Liability for Links</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
                                    <p>Our website contains links to external third-party websites over whose content we have no control. Therefore, we cannot accept any liability for this third-party content. The respective provider or operator of the linked pages is always responsible for the content of the linked pages.</p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.65 }}
                                >
                                  <div className="data-label mb-2">Urheberrecht / Copyright</div>
                                  <div className="space-y-3 font-mono text-sm leading-relaxed">
                                    <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.</p>
                                    <p>The content and works on these pages created by the site operators are subject to copyright law. Duplication, processing, distribution, and any form of exploitation beyond the scope of copyright law require the written consent of the respective author or creator. Downloads and copies of this page are only permitted for private, non-commercial use.</p>
                                  </div>
                                </motion.div>
                              </div>
                              )}

                              <motion.div
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {overlay.type === 'privacy' && (
                            <motion.div
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                className="flex items-center justify-between mb-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div>
                                  <div className="data-label mb-2">// PRIVACY.POLICY.STREAM</div>
                                  <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="PRIVACY POLICY">
                                    {language === 'de' ? 'DATENSCHUTZERKLÄRUNG' : 'PRIVACY POLICY'}
                                  </h2>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant={language === 'en' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setLanguage('en')}
                                    className="font-mono"
                                  >
                                    EN
                                  </Button>
                                  <Button
                                    variant={language === 'de' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setLanguage('de')}
                                    className="font-mono"
                                  >
                                    DE
                                  </Button>
                                </div>
                              </motion.div>

                              {adminSettings?.legalContent?.privacyCustom ? (
                                <div className="cyber-grid p-4">
                                  <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                    {adminSettings.legalContent.privacyCustom}
                                  </div>
                                </div>
                              ) : (
                              <>
                              {language === 'en' ? (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="data-label mb-2">1. Data Protection at a Glance</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">General Information</p>
                                      <p>The following information provides a simple overview of what happens to your personal data when you visit this website. Personal data is any data that can be used to identify you personally. For detailed information on data protection, please refer to our privacy policy listed below.</p>
                                      <p className="font-bold text-primary mt-4">Data Collection on this Website</p>
                                      <p>Data processing on this website is carried out by the website operator: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Your data is collected either because you provide it to us or because it is automatically recorded by our IT systems when you visit the website (e.g., technical data such as your internet browser, operating system, or time of access). This data is collected automatically as soon as you enter our website.</p>
                                      <p className="font-bold text-primary mt-4">What do we use your data for?</p>
                                      <p>Some data is collected to ensure the error-free provision of the website. No data is used for analyzing user behavior or marketing purposes.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                    <div className="data-label mb-2">2. Hosting</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>This website is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you visit our website, your personal data (e.g., IP address) is processed by Vercel on their servers. This may involve the transfer of data to the USA. For more information, see Vercel&apos;s privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></p>
                                      <p>The use of Vercel is based on Art. 6(1)(f) GDPR. We have a legitimate interest in a reliable presentation of our website.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                                    <div className="data-label mb-2">3. General Information &amp; Mandatory Information</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Data Protection</p>
                                      <p>We take the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations (GDPR, BDSG) and this privacy policy.</p>
                                      <p className="font-bold text-primary mt-4">Note on the Responsible Party</p>
                                      <p>The responsible party for data processing on this website is: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>The responsible party is the natural person who alone or jointly with others decides on the purposes and means of the processing of personal data.</p>
                                      <p className="font-bold text-primary mt-4">Storage Duration</p>
                                      <p>Unless a specific storage period is mentioned within this privacy policy, your personal data will remain with us until the purpose for data processing no longer applies. If you assert a legitimate request for deletion or revoke consent for data processing, your data will be deleted unless we have other legally permissible reasons for storing your personal data; in such cases, deletion will take place after these reasons cease to apply.</p>
                                      <p className="font-bold text-primary mt-4">Legal Basis for Processing</p>
                                      <p>Where we obtain consent for processing operations, Art. 6(1)(a) GDPR serves as the legal basis. For processing necessary for the performance of a contract, Art. 6(1)(b) GDPR serves as the legal basis. For processing necessary for compliance with a legal obligation, Art. 6(1)(c) GDPR serves as the legal basis. Where processing is necessary for the purposes of legitimate interests, Art. 6(1)(f) GDPR serves as the legal basis.</p>
                                      <p className="font-bold text-primary mt-4">SSL/TLS Encryption</p>
                                      <p>This site uses SSL/TLS encryption for security reasons and to protect the transmission of confidential content. You can recognize an encrypted connection by the lock icon in your browser&apos;s address bar and by the address starting with &quot;https://&quot;.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                    <div className="data-label mb-2">4. Data Collection on this Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Server Log Files</p>
                                      <p>The hosting provider automatically collects and stores information in server log files that your browser transmits to us. These are: browser type and version, operating system, referrer URL, hostname of the accessing computer, time of the server request, and IP address. This data is not merged with other data sources. This data is collected on the basis of Art. 6(1)(f) GDPR.</p>
                                      <p className="font-bold text-primary mt-4">Local Storage</p>
                                      <p>This website uses the browser&apos;s local storage to save your preferences (e.g., volume settings, edit mode state). This data is stored exclusively on your device and is not transmitted to us. You can clear this data at any time via your browser settings.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                    <div className="data-label mb-2">5. External APIs &amp; Third-Party Services</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Spotify Embed (Client-Side)</p>
                                      <p>This website uses the Spotify iFrame Embed to provide an integrated music player. When the player loads, a direct connection to Spotify servers is established from your browser. Provider: Spotify AB, Regeringsgatan 19, 111 53 Stockholm, Sweden. Spotify may process your IP address, browser information, and usage data. Privacy policy: <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.spotify.com/legal/privacy-policy/</a></p>
                                      <p>The use of Spotify Embed is based on Art. 6(1)(f) GDPR. We have a legitimate interest in presenting our music in an interactive and user-friendly manner.</p>
                                      <p className="font-bold text-primary mt-4">Server-Side APIs</p>
                                      <p>This website also uses server-side proxies to connect to the following third-party APIs. Your IP address is not directly shared with these services; requests are made from our server:</p>
                                      <p className="font-bold text-primary mt-4">Apple Music / iTunes API</p>
                                      <p>We use the Apple iTunes Search API to retrieve music release information and artwork. Provider: Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA. Privacy policy: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.apple.com/legal/privacy/</a></p>
                                      <p className="font-bold text-primary mt-4">Odesli / song.link API</p>
                                      <p>We use the Odesli API to generate cross-platform streaming links (Spotify, YouTube, SoundCloud, etc.). Provider: Odesli, Inc. Privacy policy: <a href="https://odesli.co/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://odesli.co/privacy</a></p>
                                      <p className="font-bold text-primary mt-4">Bandsintown API</p>
                                      <p>We use the Bandsintown API to display upcoming live events and tour dates. Provider: Bandsintown Inc., 24 W 25th St., New York, NY 10010, USA. Privacy policy: <a href="https://corp.bandsintown.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://corp.bandsintown.com/privacy</a></p>
                                      <p>The use of these services is based on Art. 6(1)(f) GDPR. We have a legitimate interest in displaying accurate and up-to-date music and event information.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                                    <div className="data-label mb-2">6. Your Rights</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Under the GDPR, you have the following rights:</p>
                                      <p><span className="text-primary">• Right of Access (Art. 15 GDPR)</span> — You have the right to request information about your personal data processed by us.</p>
                                      <p><span className="text-primary">• Right to Rectification (Art. 16 GDPR)</span> — You have the right to request the correction of inaccurate personal data.</p>
                                      <p><span className="text-primary">• Right to Erasure (Art. 17 GDPR)</span> — You have the right to request the deletion of your personal data.</p>
                                      <p><span className="text-primary">• Right to Restriction (Art. 18 GDPR)</span> — You have the right to request the restriction of the processing of your personal data.</p>
                                      <p><span className="text-primary">• Right to Data Portability (Art. 20 GDPR)</span> — You have the right to receive your personal data in a structured, commonly used, and machine-readable format.</p>
                                      <p><span className="text-primary">• Right to Object (Art. 21 GDPR)</span> — You have the right to object to the processing of your personal data at any time.</p>
                                      <p><span className="text-primary">• Right to Withdraw Consent (Art. 7(3) GDPR)</span> — You have the right to withdraw your consent at any time.</p>
                                      <p><span className="text-primary">• Right to Lodge a Complaint (Art. 77 GDPR)</span> — You have the right to lodge a complaint with a supervisory authority.</p>
                                    </div>
                                  </motion.div>
                                </div>
                              ) : (
                                <div className="space-y-6 text-foreground/90">
                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="data-label mb-2">1. Datenschutz auf einen Blick</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Allgemeine Hinweise</p>
                                      <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.</p>
                                      <p className="font-bold text-primary mt-4">Datenerfassung auf dieser Website</p>
                                      <p>Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>
                                      <p className="font-bold text-primary mt-4">Wofür nutzen wir Ihre Daten?</p>
                                      <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Es werden keine Daten zur Analyse des Nutzerverhaltens oder zu Marketingzwecken verwendet.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                                    <div className="data-label mb-2">2. Hosting</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Wenn Sie unsere Website besuchen, werden Ihre personenbezogenen Daten (z.B. IP-Adresse) auf den Servern von Vercel verarbeitet. Dies kann mit einer Übermittlung von Daten in die USA verbunden sein. Weitere Informationen entnehmen Sie der Datenschutzerklärung von Vercel: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></p>
                                      <p>Die Verwendung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer zuverlässigen Darstellung unserer Website.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                                    <div className="data-label mb-2">3. Allgemeine Hinweise und Pflichtinformationen</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Datenschutz</p>
                                      <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.</p>
                                      <p className="font-bold text-primary mt-4">Hinweis zur verantwortlichen Stelle</p>
                                      <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist: Federico Ágreda Álvarez (ZARDONIC), E-Mail: info@zardonic.com.</p>
                                      <p>Verantwortliche Stelle ist die natürliche Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung personenbezogener Daten entscheidet.</p>
                                      <p className="font-bold text-primary mt-4">Speicherdauer</p>
                                      <p>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung haben; in einem solchen Fall erfolgt die Löschung nach Fortfall dieser Gründe.</p>
                                      <p className="font-bold text-primary mt-4">Rechtsgrundlagen der Verarbeitung</p>
                                      <p>Soweit wir für Verarbeitungsvorgänge eine Einwilligung einholen, dient Art. 6 Abs. 1 lit. a DSGVO als Rechtsgrundlage. Für Verarbeitungen zur Vertragserfüllung dient Art. 6 Abs. 1 lit. b DSGVO. Für Verarbeitungen zur Erfüllung rechtlicher Verpflichtungen dient Art. 6 Abs. 1 lit. c DSGVO. Soweit die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist, dient Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage.</p>
                                      <p className="font-bold text-primary mt-4">SSL- bzw. TLS-Verschlüsselung</p>
                                      <p>Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie am Schloss-Symbol in der Adresszeile Ihres Browsers und daran, dass die Adresse mit &quot;https://&quot; beginnt.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                                    <div className="data-label mb-2">4. Datenerfassung auf dieser Website</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Server-Log-Dateien</p>
                                      <p>Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind: Browsertyp und -version, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse. Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen. Die Erfassung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>
                                      <p className="font-bold text-primary mt-4">Lokaler Speicher (Local Storage)</p>
                                      <p>Diese Website nutzt den lokalen Speicher Ihres Browsers, um Ihre Einstellungen zu speichern (z.B. Lautstärke, Bearbeitungsmodus). Diese Daten werden ausschließlich auf Ihrem Gerät gespeichert und nicht an uns übermittelt. Sie können diese Daten jederzeit über Ihre Browsereinstellungen löschen.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
                                    <div className="data-label mb-2">5. Externe APIs &amp; Drittanbieter-Dienste</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p className="font-bold text-primary">Spotify Embed (Clientseitig)</p>
                                      <p>Diese Website nutzt den Spotify iFrame Embed zur Bereitstellung eines integrierten Musikplayers. Beim Laden des Players wird eine direkte Verbindung zu den Servern von Spotify hergestellt. Anbieter: Spotify AB, Regeringsgatan 19, 111 53 Stockholm, Schweden. Spotify kann dabei Ihre IP-Adresse, Browserinformationen und Nutzungsdaten verarbeiten. Datenschutzerklärung: <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.spotify.com/legal/privacy-policy/</a></p>
                                      <p>Die Nutzung des Spotify Embeds erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer interaktiven und nutzerfreundlichen Darstellung unserer Musik.</p>
                                      <p className="font-bold text-primary mt-4">Serverseitige APIs</p>
                                      <p>Diese Website verwendet zudem serverseitige Proxys zur Verbindung mit folgenden Drittanbieter-APIs. Ihre IP-Adresse wird nicht direkt an diese Dienste weitergegeben; die Anfragen werden von unserem Server gestellt:</p>
                                      <p className="font-bold text-primary mt-4">Apple Music / iTunes API</p>
                                      <p>Wir nutzen die Apple iTunes Search API zum Abrufen von Musikveröffentlichungen und Artwork. Anbieter: Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA. Datenschutzerklärung: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.apple.com/legal/privacy/</a></p>
                                      <p className="font-bold text-primary mt-4">Odesli / song.link API</p>
                                      <p>Wir nutzen die Odesli API zur Erzeugung plattformübergreifender Streaming-Links (Spotify, YouTube, SoundCloud etc.). Anbieter: Odesli, Inc. Datenschutzerklärung: <a href="https://odesli.co/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://odesli.co/privacy</a></p>
                                      <p className="font-bold text-primary mt-4">Bandsintown API</p>
                                      <p>Wir nutzen die Bandsintown API zur Anzeige anstehender Live-Events und Tourdaten. Anbieter: Bandsintown Inc., 24 W 25th St., New York, NY 10010, USA. Datenschutzerklärung: <a href="https://corp.bandsintown.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://corp.bandsintown.com/privacy</a></p>
                                      <p>Die Nutzung dieser Dienste erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an der Darstellung aktueller Musik- und Veranstaltungsinformationen.</p>
                                    </div>
                                  </motion.div>

                                  <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                                    <div className="data-label mb-2">6. Ihre Rechte</div>
                                    <div className="space-y-3 font-mono text-sm leading-relaxed">
                                      <p>Ihnen stehen unter der DSGVO folgende Rechte zu:</p>
                                      <p><span className="text-primary">• Auskunftsrecht (Art. 15 DSGVO)</span> — Sie haben das Recht, Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten zu erhalten.</p>
                                      <p><span className="text-primary">• Recht auf Berichtigung (Art. 16 DSGVO)</span> — Sie haben das Recht, die Berichtigung unrichtiger Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Löschung (Art. 17 DSGVO)</span> — Sie haben das Recht, die Löschung Ihrer personenbezogenen Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Einschränkung (Art. 18 DSGVO)</span> — Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer Daten zu verlangen.</p>
                                      <p><span className="text-primary">• Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</span> — Sie haben das Recht, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.</p>
                                      <p><span className="text-primary">• Widerspruchsrecht (Art. 21 DSGVO)</span> — Sie haben das Recht, jederzeit gegen die Verarbeitung Ihrer personenbezogenen Daten Widerspruch einzulegen.</p>
                                      <p><span className="text-primary">• Recht auf Widerruf (Art. 7 Abs. 3 DSGVO)</span> — Sie haben das Recht, Ihre Einwilligung jederzeit zu widerrufen.</p>
                                      <p><span className="text-primary">• Beschwerderecht (Art. 77 DSGVO)</span> — Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren.</p>
                                    </div>
                                  </motion.div>
                                </div>
                              )}
                              </>
                              )}

                              <motion.div
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {overlay.type === 'contact' && (
                            <motion.div
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// CONTACT.INTERFACE.STREAM</div>
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text="CONTACT">
                                  CONTACT
                                </h2>
                              </motion.div>

                              <div className="space-y-6 text-foreground/90">
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-3">Management</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <>
                                      <p>{adminSettings?.contactInfo?.managementName || 'Federico Augusto Ágreda Álvarez'}</p>
                                      <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.managementEmail || 'info@zardonic.net'}</a></p>
                                    </>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-3">Booking</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.bookingEmail || 'booking@zardonic.net'}</a></p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-3">Press / Media</div>
                                  <div className="space-y-2 font-mono text-sm">
                                    <p>E-Mail: <a href={`mailto:${adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}`} className="text-primary hover:underline">{adminSettings?.contactInfo?.pressEmail || 'press@zardonic.net'}</a></p>
                                  </div>
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-6"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.45 }}
                                >
                                  <div className="data-label mb-4">// CONTACT.FORM</div>
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault()
                                      const form = e.currentTarget
                                      const formData = new FormData(form)
                                      const data = {
                                        name: formData.get('name') as string,
                                        email: formData.get('email') as string,
                                        subject: formData.get('subject') as string,
                                        message: formData.get('message') as string,
                                        _hp: formData.get('_hp') as string ?? '',
                                      }

                                      const validation = contactFormSchema.safeParse(data)
                                      if (!validation.success) {
                                        toast.error(validation.error.issues[0]?.message || 'Please check your input')
                                        return
                                      }

                                      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
                                      if (submitBtn) submitBtn.disabled = true

                                      toast.loading('Sending message...', { id: 'contact-submit' })

                                      const result = await submitContactForm(data)

                                      if (result.success) {
                                        toast.success('Message sent successfully!', { id: 'contact-submit' })
                                        form.reset()
                                      } else {
                                        toast.error(result.error || 'Failed to send message', { id: 'contact-submit' })
                                      }

                                      if (submitBtn) submitBtn.disabled = false
                                    }}
                                    className="space-y-4"
                                  >
                                    {/* Honeypot field — hidden from real users */}
                                    <input type="text" name="_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute opacity-0 h-0 w-0 overflow-hidden pointer-events-none" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formNameLabel || 'Name'}</Label>
                                        <Input name="name" required maxLength={100} placeholder={adminSettings?.contactInfo?.formNamePlaceholder || 'Your name'} className="bg-card border-border font-mono mt-1" />
                                      </div>
                                      <div>
                                        <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formEmailLabel || 'Email'}</Label>
                                        <Input name="email" type="email" required maxLength={254} placeholder={adminSettings?.contactInfo?.formEmailPlaceholder || 'your@email.com'} className="bg-card border-border font-mono mt-1" />
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formSubjectLabel || 'Subject'}</Label>
                                      <Input name="subject" required maxLength={200} placeholder={adminSettings?.contactInfo?.formSubjectPlaceholder || 'Subject'} className="bg-card border-border font-mono mt-1" />
                                    </div>
                                    <div>
                                      <Label className="font-mono text-xs uppercase tracking-wide">{adminSettings?.contactInfo?.formMessageLabel || 'Message'}</Label>
                                      <Textarea name="message" required maxLength={5000} placeholder={adminSettings?.contactInfo?.formMessagePlaceholder || 'Your message...'} className="bg-card border-border font-mono mt-1 min-h-[120px]" />
                                    </div>
                                    <Button type="submit" className="w-full uppercase font-mono hover-glitch cyber-border">
                                      <PaperPlaneTilt className="w-5 h-5 mr-2" />
                                      <span className="hover-chromatic">{adminSettings?.contactInfo?.formButtonText || 'Send Message'}</span>
                                    </Button>
                                  </form>
                                </motion.div>
                              </div>

                              <motion.div
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [ACTIVE]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {overlay.type === 'member' && overlay.data && (
                            <motion.div
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                className="flex flex-col md:flex-row gap-6"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                {overlay.data.image && (
                                  <div className="w-48 h-48 bg-muted relative">
                                    <img
                                      src={overlay.data.image}
                                      alt={overlay.data.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="text-xs text-primary uppercase tracking-widest font-mono mb-2">// MEMBER.PROFILE</div>
                                  <h2 className="text-4xl font-bold uppercase font-mono mb-2 crt-flash-in" data-text={overlay.data.name}>
                                    {overlay.data.name}
                                  </h2>
                                  <p className="text-xl text-muted-foreground font-mono mb-4">{overlay.data.role}</p>
                                  <p className="text-foreground/90 leading-relaxed">{overlay.data.bio}</p>
                                  {overlay.data.instagram && (
                                    <Button asChild variant="outline" className="mt-4 font-mono">
                                      <a href={overlay.data.instagram} target="_blank" rel="noopener noreferrer">
                                        <InstagramLogo className="w-5 h-5 mr-2" weight="fill" />
                                        Follow
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            </motion.div>
                          )}

                          {overlay.type === 'gig' && overlay.data && (
                            <motion.div
                              className="mt-8 space-y-6"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="data-label mb-2">// EVENT.DATA.STREAM</div>
                                {overlay.data.title && (
                                  <p className="text-sm font-mono text-primary uppercase tracking-widest mb-1">{overlay.data.title}</p>
                                )}
                                <h2 className="text-4xl md:text-5xl font-bold uppercase font-mono mb-4 hover-chromatic crt-flash-in" data-text={overlay.data.venue}>
                                  {overlay.data.venue}
                                </h2>
                                {overlay.data.soldOut && (
                                  <span className="inline-block px-3 py-1 text-xs font-mono uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30">SOLD OUT</span>
                                )}
                              </motion.div>

                              <div className="grid md:grid-cols-2 gap-6">
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <div className="data-label mb-2">Location</div>
                                  <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
                                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                                    {overlay.data.location}
                                  </div>
                                  {overlay.data.streetAddress && (
                                    <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
                                      {overlay.data.streetAddress}
                                      {overlay.data.postalCode && `, ${overlay.data.postalCode}`}
                                    </p>
                                  )}
                                </motion.div>

                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 }}
                                >
                                  <div className="data-label mb-2">Date & Time</div>
                                  <div className="flex items-center gap-2 text-xl font-mono hover-chromatic">
                                    <CalendarBlank className="w-5 h-5 text-primary shrink-0" />
                                    {new Date(overlay.data.date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                  {overlay.data.startsAt && (
                                    <p className="text-sm text-muted-foreground font-mono mt-2 ml-7">
                                      Doors: {new Date(overlay.data.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </motion.div>
                              </div>

                              {overlay.data.description && (
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.35 }}
                                >
                                  <div className="data-label mb-2">Info</div>
                                  <p className="text-foreground/90 font-mono text-sm">{overlay.data.description}</p>
                                </motion.div>
                              )}

                              {overlay.data.lineup && overlay.data.lineup.length > 0 && (
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-3">Lineup</div>
                                  <div className="flex flex-wrap gap-2">
                                    {overlay.data.lineup.map((artist: string, i: number) => (
                                      <motion.span
                                        key={i}
                                        className={`px-3 py-1.5 text-sm font-mono border transition-colors ${
                                          artist.toLowerCase() === 'zardonic'
                                            ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                                            : 'bg-card border-border text-foreground/80 hover:border-primary/30'
                                        }`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + i * 0.05 }}
                                      >
                                        {artist}
                                      </motion.span>
                                    ))}
                                  </div>
                                </motion.div>
                              )}

                              {overlay.data.support && !overlay.data.lineup?.length && (
                                <motion.div
                                  className="cyber-grid p-4"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  <div className="data-label mb-2">Support Acts</div>
                                  <p className="text-lg font-mono text-foreground/90 hover-chromatic">{overlay.data.support}</p>
                                </motion.div>
                              )}

                              {overlay.data.ticketUrl && (
                                <motion.div
                                  className="pt-4"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  <Button
                                    asChild
                                    size="lg"
                                    className={`w-full md:w-auto font-mono uppercase tracking-wider hover-noise cyber-border ${overlay.data.soldOut ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    <a href={overlay.data.ticketUrl} target="_blank" rel="noopener noreferrer">
                                      <Ticket className="w-5 h-5 mr-2" />
                                      <span className="hover-chromatic">{overlay.data.soldOut ? 'Sold Out' : 'Get Tickets'}</span>
                                    </a>
                                  </Button>
                                </motion.div>
                              )}

                              <motion.div
                                className="pt-6 border-t border-border"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                              >
                                <div className="data-label">// SYSTEM.STATUS: [{overlay.data.soldOut ? 'SOLD_OUT' : 'ACTIVE'}]</div>
                              </motion.div>
                            </motion.div>
                          )}

                          {overlay.type === 'release' && overlay.data && (
                            <motion.div
                              className="mt-8"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="grid md:grid-cols-[300px_1fr] gap-8">
                                <motion.div
                                  className="aspect-square bg-muted relative cyber-card"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.1 }}
                                >
                                  {overlay.data.artwork && (
                                    <img
                                      src={overlay.data.artwork}
                                      alt={overlay.data.title}
                                      className="w-full h-full object-cover glitch-image"
                                    />
                                  )}
                                </motion.div>

                                <div className="space-y-6">
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    <div className="data-label mb-2">// RELEASE.INFO.STREAM</div>
                                    <h2 className="text-3xl md:text-4xl font-bold uppercase font-mono mb-2 hover-chromatic crt-flash-in" data-text={overlay.data.title}>
                                      {overlay.data.title}
                                    </h2>
                                    <p className="text-xl text-muted-foreground font-mono">{overlay.data.year}</p>
                                  </motion.div>

                                  <motion.div
                                    className="cyber-grid p-4"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="data-label mb-3">Stream & Download</div>
                                    <div className="flex flex-wrap gap-4">
                                      {overlay.data.spotify && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.spotify} target="_blank" rel="noopener noreferrer">
                                            <SpotifyLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">Spotify</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.youtube && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.youtube} target="_blank" rel="noopener noreferrer">
                                            <YoutubeLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">YouTube</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.soundcloud && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.soundcloud} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">SoundCloud</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.bandcamp && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.bandcamp} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Bandcamp</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.appleMusic && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.appleMusic} target="_blank" rel="noopener noreferrer">
                                            <ApplePodcastsLogo className="w-5 h-5 mr-2" weight="fill" />
                                            <span className="hover-chromatic">Apple Music</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.deezer && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.deezer} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Deezer</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.tidal && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.tidal} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Tidal</span>
                                          </a>
                                        </Button>
                                      )}
                                      {overlay.data.amazonMusic && (
                                        <Button asChild variant="outline" className="font-mono">
                                          <a href={overlay.data.amazonMusic} target="_blank" rel="noopener noreferrer">
                                            <span className="hover-chromatic">Amazon Music</span>
                                          </a>
                                        </Button>
                                      )}
                                    </div>
                                  </motion.div>

                                  <motion.div
                                    className="pt-4 border-t border-border"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    <div className="data-label">// MEDIA.STATUS: [AVAILABLE]</div>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
