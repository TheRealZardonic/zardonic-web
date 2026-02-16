/**
 * Privacy Policy Component
 * GDPR-compliant privacy policy for the Zardonic website
 */

import { motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface PrivacyPolicyProps {
  open: boolean
  onClose: () => void
}

export default function PrivacyPolicy({ open, onClose }: PrivacyPolicyProps) {
  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 pt-8 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-4xl bg-card border-2 border-primary/30 relative overflow-hidden"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="h-12 bg-primary/10 border-b border-primary/30 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-primary/70 tracking-wider uppercase">
              Privacy Policy
            </span>
          </div>
          <button onClick={onClose} aria-label="Close privacy policy" className="text-primary/60 hover:text-primary p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 text-sm font-mono">
          <section>
            <h2 className="text-lg font-bold text-primary mb-3">1. Data Controller</h2>
            <p className="text-muted-foreground">
              This website is operated by Zardonic. For data protection inquiries, please use the contact form on this website.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">2. Data Collection</h2>
            <p className="text-muted-foreground mb-2">We collect the following data:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><strong>Analytics Data:</strong> Page views, section views, click events, device type, browser, screen resolution, approximate location (based on timezone), and language preferences</li>
              <li><strong>Form Submissions:</strong> When you use the contact form, we collect your name, email, and message</li>
              <li><strong>Admin Data:</strong> If you are an admin, we store an encrypted password hash for authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">3. Purpose of Data Processing</h2>
            <p className="text-muted-foreground mb-2">We process your data for:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Website analytics to understand visitor behavior and improve user experience</li>
              <li>Responding to contact form submissions</li>
              <li>Admin authentication for content management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">4. Legal Basis (GDPR Art. 6)</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><strong>Legitimate Interest (Art. 6(1)(f)):</strong> Analytics data for website improvement</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> Contact form submissions</li>
              <li><strong>Contract (Art. 6(1)(b)):</strong> Admin authentication for service provision</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">5. Data Storage and Retention</h2>
            <p className="text-muted-foreground mb-2">Your data is stored:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Analytics data: Stored in Vercel KV (Redis) for 30 days, then automatically deleted</li>
              <li>Contact form submissions: Processed via email, not stored permanently</li>
              <li>Admin credentials: Stored securely with encrypted password hashes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">6. Cookies and Local Storage</h2>
            <p className="text-muted-foreground mb-2">
              This website uses browser local storage (not cookies) to store:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Analytics data (anonymous usage statistics)</li>
              <li>Your preferences (theme, section visibility)</li>
              <li>Admin session data (if logged in as admin)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              You can clear this data at any time through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-2">We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><strong>Vercel:</strong> Hosting and serverless functions (Privacy: https://vercel.com/legal/privacy-policy)</li>
              <li><strong>Upstash Redis:</strong> Data storage (Privacy: https://upstash.com/privacy)</li>
              <li><strong>Bandsintown:</strong> Concert/gig information (Privacy: https://www.bandsintown.com/privacy)</li>
              <li><strong>Apple Music/iTunes:</strong> Music release information (Privacy: https://www.apple.com/legal/privacy/)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">8. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interest</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              To exercise these rights, use the contact form or clear your browser data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">9. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>HTTPS encryption for all data transmission</li>
              <li>Password hashing using SHA-256</li>
              <li>Secure cloud storage with Vercel and Upstash</li>
              <li>Regular security updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">10. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Data may be transferred to and processed in countries outside the European Economic Area (EEA), 
              including the United States. We ensure appropriate safeguards are in place through:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Standard Contractual Clauses (SCCs)</li>
              <li>Privacy Shield-certified service providers (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">11. Children's Privacy</h2>
            <p className="text-muted-foreground">
              This website is not directed at children under 16. We do not knowingly collect personal data from children.
              If you believe we have collected data from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. The "last updated" date will be revised accordingly.
              Continued use of the website constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary mb-3">13. Supervisory Authority</h2>
            <p className="text-muted-foreground">
              You have the right to lodge a complaint with a data protection supervisory authority if you believe 
              your data protection rights have been violated.
            </p>
          </section>

          <section className="border-t border-primary/20 pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>Last Updated:</strong> February 16, 2026
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Version:</strong> 1.0
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-primary/20 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
