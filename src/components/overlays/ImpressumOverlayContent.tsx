import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { AdminSettings, DecorativeTexts } from '@/lib/types'

interface ImpressumOverlayContentProps {
  adminSettings: AdminSettings | undefined
  onClose: () => void
  decorativeTexts?: DecorativeTexts
}

export function ImpressumOverlayContent({ adminSettings, onClose, decorativeTexts }: ImpressumOverlayContentProps) {
  const streamLabel = decorativeTexts?.impressumStreamLabel ?? '// LEGAL.INFORMATION'
  return (
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
        <div className="data-label mb-2">{streamLabel}</div>
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
              {adminSettings?.contactInfo?.managementName && (
                <p>{adminSettings.contactInfo.managementName}</p>
              )}
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
              {adminSettings?.contactInfo?.managementEmail && (
                <p>E-Mail: {adminSettings.contactInfo.managementEmail}</p>
              )}
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
              {adminSettings?.contactInfo?.managementName && (
                <p>{adminSettings.contactInfo.managementName}</p>
              )}
            </div>
          </motion.div>

          <motion.div
            className="cyber-grid p-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="data-label mb-2">Streitschlichtung / Dispute Resolution</div>
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
        <div className="data-label">{decorativeTexts?.impressumStatusLabel ?? '// SYSTEM.STATUS: [ACTIVE]'}</div>
      </motion.div>

      <Button
        variant="ghost"
        size="sm"
        className="font-mono text-xs"
        onClick={onClose}
      >
        ← Back
      </Button>
    </motion.div>
  )
}
