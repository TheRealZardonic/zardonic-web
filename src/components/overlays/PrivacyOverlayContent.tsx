import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { AdminSettings, DecorativeTexts } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

interface PrivacyOverlayContentProps {
  adminSettings: AdminSettings | undefined
  artistName?: string
  decorativeTexts?: DecorativeTexts
}

export function PrivacyOverlayContent({ adminSettings, artistName, decorativeTexts }: PrivacyOverlayContentProps) {
  const { locale: language, setLocale: setLanguage } = useLocale()
  const streamLabel = decorativeTexts?.privacyStreamLabel ?? '// PRIVACY.POLICY'

  const dataController = adminSettings?.contactInfo?.managementName || artistName || ''

  return (
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
          <div className="data-label mb-2">{streamLabel}</div>
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
                  <p>{`Data processing on this website is carried out by the website operator${dataController ? `: ${dataController}` : ''}.`}</p>
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
                  <p>{`The responsible party for data processing on this website is${dataController ? `: ${dataController}` : ' the site operator'}.`}</p>
                  <p>The responsible party is the natural person who alone or jointly with others decides on the purposes and means of the processing of personal data.</p>
                  <p className="font-bold text-primary mt-4">Storage Duration</p>
                  <p>Unless a specific storage period is mentioned within this privacy policy, your personal data will remain with us until the purpose for data processing no longer applies. If you assert a legitimate request for deletion or revoke consent for data processing, your data will be deleted unless we have other legally permissible reasons for storing your personal data; in such cases, deletion will take place after these reasons cease to apply.</p>
                  <p className="font-bold text-primary mt-4">Legal Basis for Processing</p>
                  <p>Where we obtain consent for processing operations, Art. 6(1)(a) GDPR serves as the legal basis. For processing necessary for the performance of a contract, Art. 6(1)(b) GDPR serves as the legal basis. For processing necessary for compliance with a legal obligation, Art. 6(1)(c) GDPR serves as the legal basis. Where processing is necessary for the purposes of legitimate interests, Art. 6(1)(f) GDPR serves as the legal basis.</p>
                </div>
              </motion.div>

              <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <div className="data-label mb-2">4. Data Collection on this Website</div>
                <div className="space-y-3 font-mono text-sm leading-relaxed">
                  <p className="font-bold text-primary">Cookies</p>
                  <p>Our website uses a technically necessary cookie to manage your session securely (HttpOnly, SameSite). We do not use third-party tracking cookies or advertising cookies. The legal basis is Art. 6(1)(f) GDPR (legitimate interest in secure session management).</p>
                  <p className="font-bold text-primary mt-4">Contact Form</p>
                  <p>When you submit a message via our contact form, the data entered in the input mask is transmitted to us and stored for the purpose of processing the request. Your data will not be passed on without your consent. The legal basis for processing this data is Art. 6(1)(a) GDPR (consent) or Art. 6(1)(b) GDPR (pre-contractual measures). The data will be deleted after processing the request is complete.</p>
                  <p className="font-bold text-primary mt-4">Newsletter</p>
                  <p>If you subscribe to our newsletter, we will use the email address you provided to send you the newsletter. The legal basis is Art. 6(1)(a) GDPR. You can unsubscribe at any time by contacting us or using any unsubscribe link. Your data will be deleted immediately upon unsubscription.</p>
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
                  <p>{`Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber${dataController ? `: ${dataController}` : ''}.`}</p>
                  <p>Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben. Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).</p>
                  <p className="font-bold text-primary mt-4">Wofür nutzen wir Ihre Daten?</p>
                  <p>Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu gewährleisten. Andere Daten können zur Analyse Ihres Nutzerverhaltens verwendet werden.</p>
                </div>
              </motion.div>

              <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <div className="data-label mb-2">2. Hosting</div>
                <div className="space-y-3 font-mono text-sm leading-relaxed">
                  <p>Diese Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA gehostet. Beim Besuch unserer Website werden Ihre personenbezogenen Daten (z.B. IP-Adresse) durch Vercel auf deren Servern verarbeitet. Dies kann eine Übermittlung von Daten in die USA beinhalten. Weitere Informationen finden Sie in der Datenschutzerklärung von Vercel: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://vercel.com/legal/privacy-policy</a></p>
                  <p>Die Nutzung von Vercel erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir haben ein berechtigtes Interesse an einer zuverlässigen Darstellung unserer Website.</p>
                </div>
              </motion.div>

              <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                <div className="data-label mb-2">3. Allgemeine Hinweise und Pflichtinformationen</div>
                <div className="space-y-3 font-mono text-sm leading-relaxed">
                  <p className="font-bold text-primary">Datenschutz</p>
                  <p>Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften (DSGVO, BDSG) sowie dieser Datenschutzerklärung.</p>
                  <p className="font-bold text-primary mt-4">Hinweis zur verantwortlichen Stelle</p>
                  <p>{`Verantwortlich für die Datenverarbeitung auf dieser Website ist${dataController ? `: ${dataController}` : ' der Websitebetreiber'}.`}</p>
                  <p>Die verantwortliche Stelle entscheidet allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten.</p>
                  <p className="font-bold text-primary mt-4">Speicherdauer</p>
                  <p>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer personenbezogenen Daten haben; im letztgenannten Fall erfolgt die Löschung nach Fortfall dieser Gründe.</p>
                  <p className="font-bold text-primary mt-4">Rechtsgrundlagen der Verarbeitung</p>
                  <p>Soweit wir Ihre Einwilligung zur Verarbeitung eingeholt haben, ist Art. 6 Abs. 1 lit. a DSGVO die Rechtsgrundlage. Für die Verarbeitung zur Vertragserfüllung ist Art. 6 Abs. 1 lit. b DSGVO die Rechtsgrundlage. Bei der Verarbeitung zur Erfüllung einer rechtlichen Verpflichtung ist Art. 6 Abs. 1 lit. c DSGVO die Rechtsgrundlage. Für Verarbeitungen zum Zweck berechtigter Interessen ist Art. 6 Abs. 1 lit. f DSGVO die Rechtsgrundlage.</p>
                </div>
              </motion.div>

              <motion.div className="cyber-grid p-4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <div className="data-label mb-2">4. Datenerfassung auf dieser Website</div>
                <div className="space-y-3 font-mono text-sm leading-relaxed">
                  <p className="font-bold text-primary">Cookies</p>
                  <p>Unsere Website verwendet ein technisch notwendiges Cookie zur sicheren Sitzungsverwaltung (HttpOnly, SameSite). Wir setzen keine Tracking-Cookies oder Werbe-Cookies Dritter ein. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherer Sitzungsverwaltung).</p>
                  <p className="font-bold text-primary mt-4">Kontaktformular</p>
                  <p>Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) oder Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen). Die Daten werden nach abschließender Bearbeitung Ihrer Anfrage gelöscht.</p>
                  <p className="font-bold text-primary mt-4">Newsletter</p>
                  <p>Wenn Sie den Newsletter abonnieren, verwenden wir Ihre angegebene E-Mail-Adresse zum Versand. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Sie können sich jederzeit durch Kontaktaufnahme oder über einen Abmeldelink abmelden. Ihre Daten werden nach der Abmeldung unverzüglich gelöscht.</p>
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
        <div className="data-label">{decorativeTexts?.privacyStatusLabel ?? '// SYSTEM.STATUS: [ACTIVE]'}</div>
      </motion.div>
    </motion.div>
  )
}
