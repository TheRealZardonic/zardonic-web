interface FooterProps {
  brandName?: string
  copyrightYear?: number
  imprintLink?: string
  privacyLink?: string
  additionalLinks?: { label: string; href: string }[]
}

export default function Footer({
  brandName = '{{BAND_NAME}}',
  copyrightYear = new Date().getFullYear(),
  imprintLink = '#imprint',
  privacyLink = '#privacy',
  additionalLinks = []
}: FooterProps) {
  return (
    <footer className="py-12 px-4 border-t border-border zardonic-theme-noise-effect">
      <div className="container mx-auto text-center space-y-4">
        <div className="flex justify-center gap-6 flex-wrap">
          <a
            href={imprintLink}
            className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono zardonic-theme-hover-chromatic cursor-pointer"
          >
            Impressum
          </a>
          <a
            href={privacyLink}
            className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono zardonic-theme-hover-chromatic cursor-pointer"
          >
            Privacy Policy
          </a>
          {additionalLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide font-mono zardonic-theme-hover-chromatic cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p className="text-sm text-muted-foreground uppercase tracking-wide font-mono zardonic-theme-hover-chromatic">
          © {copyrightYear} {brandName}
        </p>
      </div>
    </footer>
  )
}
