const fs = require('fs');
let code = fs.readFileSync('/app/src/App.tsx', 'utf8');

// Entfernen des falschen Imports
code = code.replace(/import \{ loadSiteData, loadAdminSettings \} from '@\/lib\/sanity\.loader'\n/g, '');

// Ersetzen des Effects
const replacement = `
  const { data: kvSiteData, isLoading: isSiteDataLoading } = useKV<SiteData>('zd-cms:site')
  const { data: kvAdminSettings, isLoading: isAdminSettingsLoading } = useKV<AdminSettings>('admin:settings')

  useEffect(() => {
    if (!isSiteDataLoading && kvSiteData) {
      setSiteData(kvSiteData)
    }
  }, [kvSiteData, isSiteDataLoading])

  useEffect(() => {
    if (!isAdminSettingsLoading && kvAdminSettings) {
      setAdminSettings(kvAdminSettings)
    }
  }, [kvAdminSettings, isAdminSettingsLoading])
`;

code = code.replace(/useEffect\(\(\) => \{\s*let mounted = true\s*Promise\.all\(\[loadSiteData\(\), loadAdminSettings\(\)\]\)\s*\.then\(\(\[data, settings\]\) => \{\s*if \(mounted\) \{\s*setSiteData\(data as SiteData\)\s*setAdminSettings\(settings\)\s*\}\s*\}\)\s*\.catch\(err => \{\s*console\.error\('Failed to load Sanity data:', err\)\s*\}\)\s*return \(\) => \{ mounted = false \}\s*\}, \[\]\)/g, replacement.trim());

fs.writeFileSync('/app/src/App.tsx', code);
