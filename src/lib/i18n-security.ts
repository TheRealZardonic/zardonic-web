/**
 * Lightweight i18n utility for the Security Center.
 * Supports English (en) and German (de) with tooltip descriptions.
 */

export type Locale = 'en' | 'de'

export interface TranslationEntry {
  label: string
  tooltip?: string
}

const translations: Record<string, Record<Locale, string>> = {
  // ── Header / general ──────────────────────────────────────────────
  'sec.title':                    { en: 'SECURITY CENTER', de: 'SICHERHEITSZENTRALE' },
  'sec.subtitle':                 { en: 'THREAT MONITOR // INCIDENT LOG', de: 'BEDROHUNGSMONITOR // VORFALLSPROTOKOLL' },
  'sec.loading':                  { en: 'LOADING SECURITY DATA...', de: 'LADE SICHERHEITSDATEN...' },
  'sec.failedToLoad':             { en: 'FAILED TO LOAD', de: 'LADEN FEHLGESCHLAGEN' },
  'sec.noIncidents':              { en: 'NO INCIDENTS RECORDED', de: 'KEINE VORFÄLLE AUFGEZEICHNET' },
  'sec.threatMonitorActive':      { en: 'THREAT MONITOR ACTIVE', de: 'BEDROHUNGSMONITOR AKTIV' },
  'sec.events':                   { en: 'events', de: 'Ereignisse' },
  'sec.gdprNote':                 { en: 'IPs SHA-256 hashed (GDPR)', de: 'IPs SHA-256 gehasht (DSGVO)' },
  'sec.close':                    { en: 'CLOSE', de: 'SCHLIEßEN' },
  'sec.clearAll':                 { en: 'Clear all incidents', de: 'Alle Vorfälle löschen' },
  'sec.clearConfirm':             { en: 'Clear all security incident records? This cannot be undone.', de: 'Alle Sicherheitsvorfälle löschen? Dies kann nicht rückgängig gemacht werden.' },
  'sec.collapse':                 { en: 'COLLAPSE', de: 'EINKLAPPEN' },

  // ── Summary cards ─────────────────────────────────────────────────
  'sec.total':                    { en: 'Total', de: 'Gesamt' },
  'sec.totalTip':                 { en: 'Total number of security incidents recorded', de: 'Gesamtzahl der aufgezeichneten Sicherheitsvorfälle' },
  'sec.honeytoken':               { en: 'Honeytoken', de: 'Honeytoken' },
  'sec.honeytokenTip':            { en: 'Decoy database records accessed by attackers', de: 'Von Angreifern aufgerufene Köder-Datenbankeinträge' },
  'sec.robots':                   { en: 'Robots', de: 'Robots' },
  'sec.robotsTip':                { en: 'Bots violating robots.txt Disallow directives', de: 'Bots, die robots.txt-Disallow-Regeln verletzen' },
  'sec.uniqueIps':                { en: 'Unique IPs', de: 'Eindeutige IPs' },
  'sec.uniqueIpsTip':             { en: 'Number of distinct IP addresses involved', de: 'Anzahl beteiligter unterschiedlicher IP-Adressen' },
  'sec.blocked':                  { en: 'Blocked', de: 'Geblockt' },
  'sec.blockedTip':               { en: 'IPs that were automatically hard-blocked', de: 'Automatisch gesperrte IP-Adressen' },

  // ── Filter tabs ───────────────────────────────────────────────────
  'sec.filterAll':                { en: 'ALL', de: 'ALLE' },
  'sec.filterHoneytoken':         { en: 'HONEYTOKEN', de: 'HONEYTOKEN' },
  'sec.filterRobots':             { en: 'ROBOTS', de: 'ROBOTS' },
  'sec.filterThreat':             { en: 'THREAT', de: 'BEDROHUNG' },
  'sec.filterBlocked':            { en: 'BLOCKED', de: 'GEBLOCKT' },

  // ── Table headers ─────────────────────────────────────────────────
  'sec.colTime':                  { en: 'TIME', de: 'ZEIT' },
  'sec.colType':                  { en: 'TYPE', de: 'TYP' },
  'sec.colTarget':                { en: 'TARGET', de: 'ZIEL' },
  'sec.colMethod':                { en: 'METHOD', de: 'METHODE' },
  'sec.colIpHash':                { en: 'IP HASH', de: 'IP-HASH' },
  'sec.colScore':                 { en: 'SCORE', de: 'SCORE' },
  'sec.colLevel':                 { en: 'LEVEL', de: 'STUFE' },
  'sec.colAction':                { en: 'ACTION', de: 'AKTION' },

  // ── Incident types ────────────────────────────────────────────────
  'sec.typeRobots':               { en: 'ROBOTS.TXT VIOLATION', de: 'ROBOTS.TXT-VERSTOẞ' },
  'sec.typeThreat':               { en: 'THREAT ESCALATION', de: 'BEDROHUNGSESKALATION' },
  'sec.typeBlocked':              { en: 'HARD BLOCK', de: 'HARD BLOCK' },
  'sec.typeHoneytoken':           { en: 'HONEYTOKEN ACCESS', de: 'HONEYTOKEN-ZUGRIFF' },
  'sec.typeSecurityEvent':        { en: 'SECURITY EVENT', de: 'SICHERHEITSEREIGNIS' },

  // ── Countermeasures ───────────────────────────────────────────────
  'sec.cmBlocked':                { en: 'BLOCKED', de: 'GEBLOCKT' },
  'sec.cmTarpitted':              { en: 'TARPITTED', de: 'VERLANGSAMT' },
  'sec.cmRateLimited':            { en: 'RATE LIMITED', de: 'GEDROSSELT' },
  'sec.cmLogged':                 { en: 'LOGGED', de: 'PROTOKOLLIERT' },
  'sec.cmZipBomb':                { en: 'ZIP BOMB', de: 'ZIP-BOMBE' },

  // ── Detail panel ──────────────────────────────────────────────────
  'sec.threatAssessment':         { en: 'Threat Assessment', de: 'Bedrohungseinschätzung' },
  'sec.levelLabel':               { en: 'Level:', de: 'Stufe:' },
  'sec.countermeasure':           { en: 'Countermeasure:', de: 'Gegenmaßnahme:' },
  'sec.details':                  { en: 'Details:', de: 'Details:' },
  'sec.blockExpiry':              { en: 'Block expiry:', de: 'Sperre läuft ab:' },
  'sec.requestDetails':           { en: 'Request Details', de: 'Anfrage-Details' },
  'sec.fullTarget':               { en: 'Full target:', de: 'Vollständiges Ziel:' },
  'sec.method':                   { en: 'Method:', de: 'Methode:' },
  'sec.ipHash':                   { en: 'IP hash:', de: 'IP-Hash:' },
  'sec.userAgent':                { en: 'User agent:', de: 'User-Agent:' },
  'sec.requestContent':           { en: 'Request Content', de: 'Anfrage-Inhalt' },
  'sec.requestBody':              { en: 'Request body:', de: 'Anfragekörper:' },
  'sec.requestHeaders':           { en: 'Headers:', de: 'Header:' },
  'sec.requestPath':              { en: 'Path:', de: 'Pfad:' },
  'sec.noContent':                { en: 'No request content captured', de: 'Kein Anfrageinhalt erfasst' },

  // ── Sorting ───────────────────────────────────────────────────────
  'sec.sortBy':                   { en: 'Sort by', de: 'Sortieren nach' },
  'sec.sortTime':                 { en: 'Time', de: 'Zeit' },
  'sec.sortType':                 { en: 'Type', de: 'Typ' },
  'sec.sortScore':                { en: 'Score', de: 'Score' },
  'sec.sortIp':                   { en: 'IP', de: 'IP' },

  // ── Grouping ──────────────────────────────────────────────────────
  'sec.groupBy':                  { en: 'Group by', de: 'Gruppieren nach' },
  'sec.groupNone':                { en: 'None', de: 'Keine' },
  'sec.groupType':                { en: 'Type', de: 'Typ' },
  'sec.groupIp':                  { en: 'IP Hash', de: 'IP-Hash' },
  'sec.groupLevel':               { en: 'Threat Level', de: 'Bedrohungsstufe' },
  'sec.groupCountermeasure':      { en: 'Countermeasure', de: 'Gegenmaßnahme' },

  // ── Export ────────────────────────────────────────────────────────
  'sec.export':                   { en: 'Export', de: 'Exportieren' },
  'sec.exportJson':               { en: 'Export JSON', de: 'JSON exportieren' },
  'sec.exportCsv':                { en: 'Export CSV', de: 'CSV exportieren' },
  'sec.exportTip':                { en: 'Download security incident data for analysis', de: 'Sicherheitsvorfälle zur Analyse herunterladen' },

  // ── Search ────────────────────────────────────────────────────────
  'sec.search':                   { en: 'Search incidents...', de: 'Vorfälle suchen...' },
  'sec.searchTip':                { en: 'Filter by IP hash, user agent, target, or type', de: 'Filtern nach IP-Hash, User-Agent, Ziel oder Typ' },

  // ── Profile ───────────────────────────────────────────────────────
  'sec.viewProfile':              { en: 'Profile', de: 'Profil' },
  'sec.viewProfileTip':           { en: 'View detailed attacker behavior profile', de: 'Detailliertes Angreifer-Verhaltensprofil anzeigen' },

  // ── Settings dialog ───────────────────────────────────────────────
  'settings.title':               { en: 'SECURITY SETTINGS // SERVER-SIDE CONFIG', de: 'SICHERHEITSEINSTELLUNGEN // SERVERSEITIGE KONFIGURATION' },
  'settings.loading':             { en: 'LOADING SETTINGS...', de: 'LADE EINSTELLUNGEN...' },
  'settings.securityLevel':       { en: 'SECURITY LEVEL', de: 'SICHERHEITSSTUFE' },
  'settings.high':                { en: 'HIGH', de: 'HOCH' },
  'settings.medium':              { en: 'MEDIUM', de: 'MITTEL' },
  'settings.low':                 { en: 'LOW', de: 'NIEDRIG' },
  'settings.defenseModulesActive':{ en: 'defense modules active', de: 'Verteidigungsmodule aktiv' },
  'settings.infoText':            { en: 'These settings are persisted server-side in encrypted storage. Changes take effect immediately and are not included in the public band-data JSON export.', de: 'Diese Einstellungen werden serverseitig in verschlüsseltem Speicher gespeichert. Änderungen wirken sofort und sind nicht im öffentlichen Band-Daten-JSON-Export enthalten.' },
  'settings.defenseModules':      { en: 'DEFENSE MODULES', de: 'VERTEIDIGUNGSMODULE' },
  'settings.parameters':          { en: 'PARAMETERS', de: 'PARAMETER' },
  'settings.tarpitZipRules':      { en: 'TARPIT & ZIP BOMB RULES', de: 'TARPIT- & ZIP-BOMBEN-REGELN' },
  'settings.save':                { en: 'SAVE SETTINGS', de: 'EINSTELLUNGEN SPEICHERN' },
  'settings.saving':              { en: 'SAVING...', de: 'SPEICHERE...' },
  'settings.resetDefaults':       { en: 'RESET DEFAULTS', de: 'STANDARDS ZURÜCKSETZEN' },
  'settings.saved':               { en: 'Security settings saved', de: 'Sicherheitseinstellungen gespeichert' },
  'settings.failedSave':          { en: 'Failed to save', de: 'Speichern fehlgeschlagen' },
  'settings.footer':              { en: 'Settings stored in server-side encrypted storage (not in public JSON)', de: 'Einstellungen in serverseitig verschlüsseltem Speicher gespeichert (nicht im öffentlichen JSON)' },
  'settings.active':              { en: 'ACTIVE', de: 'AKTIV' },
  'settings.disabled':            { en: 'DISABLED', de: 'DEAKTIVIERT' },

  // ── Module labels & descriptions ──────────────────────────────────
  'mod.honeytoken':               { en: 'Honeytoken Detection', de: 'Honeytoken-Erkennung' },
  'mod.honeytokenDesc':           { en: 'Decoy database records that trigger silent alarms on unauthorized access', de: 'Köder-Datenbankeinträge, die bei unbefugtem Zugriff einen stillen Alarm auslösen' },
  'mod.honeytokenTip':            { en: 'Plants fake credentials (admin_backup, db-credentials, etc.) in the database. Any access attempt triggers immediate alerting, attacker profiling, and optional counter-measures.', de: 'Platziert gefälschte Zugangsdaten (admin_backup, db-credentials etc.) in der Datenbank. Jeder Zugriffsversuch löst sofortige Alarmierung, Angreifer-Profiling und optionale Gegenmaßnahmen aus.' },
  'mod.rateLimit':                { en: 'Rate Limiting', de: 'Ratenbegrenzung' },
  'mod.rateLimitDesc':            { en: 'Sliding window rate limit (5 req/10s) with GDPR-compliant IP hashing', de: 'Gleitfenster-Ratenbegrenzung (5 Req/10s) mit DSGVO-konformem IP-Hashing' },
  'mod.rateLimitTip':             { en: 'Enforces 5 requests per 10 seconds per client using SHA-256 hashed IPs. Prevents brute-force attacks and DoS. Fails closed (blocks) if Redis is unavailable.', de: 'Erzwingt 5 Anfragen pro 10 Sekunden pro Client mit SHA-256-gehashten IPs. Verhindert Brute-Force-Angriffe und DoS. Blockiert bei Redis-Ausfall (Fail-Closed).' },
  'mod.robotsTrap':               { en: 'Robots.txt Access Control', de: 'Robots.txt-Zugriffskontrolle' },
  'mod.robotsTrapDesc':           { en: 'Defensive tarpit for bots that ignore Disallow directives', de: 'Defensives Tarpit für Bots, die Disallow-Regeln ignorieren' },
  'mod.robotsTrapTip':            { en: 'Monitors User-Agent strings against robots.txt rules. Bots that violate Disallow directives receive artificial delays (tarpit) and threat score increases.', de: 'Überwacht User-Agent-Strings gegen robots.txt-Regeln. Bots, die Disallow-Regeln verletzen, erhalten künstliche Verzögerungen (Tarpit) und Bedrohungsscore-Erhöhungen.' },
  'mod.threatScoring':            { en: 'Threat Score System', de: 'Bedrohungsbewertungssystem' },
  'mod.threatScoringDesc':        { en: 'Behavioral IDS: assigns threat scores to suspicious request patterns', de: 'Verhaltensbasiertes IDS: weist verdächtigen Anfrage-Mustern Bedrohungs-Scores zu' },
  'mod.threatScoringTip':         { en: 'Tracks suspicious patterns per IP: honeytoken access (+5), suspicious UA (+4), robots violation (+3), missing headers (+2), rate limit (+2), generic accept (+1). Auto-escalates through CLEAN → WARN → TARPIT → BLOCK levels.', de: 'Verfolgt verdächtige Muster pro IP: Honeytoken-Zugriff (+5), verdächtiger UA (+4), Robots-Verstoß (+3), fehlende Header (+2), Rate-Limit (+2), generischer Accept (+1). Eskaliert automatisch durch CLEAN → WARN → TARPIT → BLOCK Stufen.' },
  'mod.hardBlock':                { en: 'Hard Block (Blocklist)', de: 'Hard Block (Sperrliste)' },
  'mod.hardBlockDesc':            { en: 'Permanently block flagged IPs until manually removed or TTL expires', de: 'Markierte IPs dauerhaft sperren bis zur manuellen Entfernung oder TTL-Ablauf' },
  'mod.hardBlockTip':             { en: 'Maintains a persistent blocklist in Redis. Auto-populated when threat score exceeds threshold. Default TTL is 7 days. Blocked IPs receive immediate 403 responses.', de: 'Pflegt eine persistente Sperrliste in Redis. Wird automatisch befüllt wenn der Bedrohungsscore den Schwellenwert überschreitet. Standard-TTL ist 7 Tage. Gesperrte IPs erhalten sofortige 403-Antworten.' },
  'mod.entropy':                  { en: 'Entropy Injection', de: 'Entropie-Injektion' },
  'mod.entropyDesc':              { en: 'Inject noise headers into responses for flagged attacker IPs', de: 'Rausch-Header in Antworten für markierte Angreifer-IPs injizieren' },
  'mod.entropyTip':               { en: 'Adds 200 random garbage headers to responses for known attackers. Wastes attacker bandwidth and confuses automated scanning tools.', de: 'Fügt bekannten Angreifern 200 zufällige Müll-Header hinzu. Verschwendet Angreifer-Bandbreite und verwirrt automatisierte Scan-Tools.' },
  'mod.zipBomb':                  { en: 'Zip Bomb', de: 'Zip-Bombe' },
  'mod.zipBombDesc':              { en: 'Serve compressed junk data to confirmed bots (wastes bot memory/CPU)', de: 'Komprimierte Mülldaten an bestätigte Bots senden (verschwendet Bot-Speicher/CPU)' },
  'mod.zipBombTip':               { en: 'Generates a 10 MB gzip-compressed null-byte payload. When decompressed by bots, it expands massively to exhaust memory/CPU. Only activated for confirmed malicious actors.', de: 'Erzeugt eine 10 MB gzip-komprimierte Null-Byte-Nutzlast. Beim Dekomprimieren durch Bots expandiert sie massiv und erschöpft Speicher/CPU. Nur für bestätigte bösartige Akteure aktiviert.' },
  'mod.alerting':                 { en: 'Real-time Alerting', de: 'Echtzeit-Alarmierung' },
  'mod.alertingDesc':             { en: 'Send Discord/email alerts on critical security events', de: 'Discord/E-Mail-Warnungen bei kritischen Sicherheitsereignissen senden' },
  'mod.alertingTip':              { en: 'Sends color-coded alerts via Discord webhook and/or Resend email API. Includes IP hash, User-Agent, threat score, and HTTP method. Deduplication prevents alert flooding (1 per IP+event per 5 min).', de: 'Sendet farbcodierte Warnungen über Discord-Webhook und/oder Resend-E-Mail-API. Enthält IP-Hash, User-Agent, Bedrohungsscore und HTTP-Methode. Deduplizierung verhindert Alarm-Überflutung (1 pro IP+Ereignis pro 5 Min).' },
  'mod.suspiciousUa':             { en: 'Suspicious UA Blocking', de: 'Verdächtige UA-Blockierung' },
  'mod.suspiciousUaDesc':         { en: 'Block known hacking tools (wfuzz, nikto, sqlmap, etc.) with tarpit delay', de: 'Bekannte Hacking-Tools (wfuzz, nikto, sqlmap etc.) mit Tarpit-Verzögerung blockieren' },
  'mod.suspiciousUaTip':          { en: 'Detects User-Agent strings from known attack tools (wfuzz, nikto, sqlmap, nmap, masscan, etc.) and applies tarpit delays before responding. Increases threat score by +4.', de: 'Erkennt User-Agent-Strings von bekannten Angriffs-Tools (wfuzz, nikto, sqlmap, nmap, masscan etc.) und wendet Tarpit-Verzögerungen an. Erhöht den Bedrohungsscore um +4.' },
  'mod.sessionBinding':           { en: 'Session Binding', de: 'Sitzungsbindung' },
  'mod.sessionBindingDesc':       { en: 'Bind admin sessions to User-Agent + IP subnet to detect hijacking', de: 'Admin-Sitzungen an User-Agent + IP-Subnetz binden zur Hijacking-Erkennung' },
  'mod.sessionBindingTip':        { en: 'Computes a fingerprint from User-Agent + IP /24 subnet for each admin session. If the fingerprint changes mid-session, the session is invalidated (potential hijacking).', de: 'Berechnet einen Fingerabdruck aus User-Agent + IP /24 Subnetz für jede Admin-Sitzung. Ändert sich der Fingerabdruck während der Sitzung, wird sie ungültig (potenzielles Hijacking).' },

  // ── Parameters ────────────────────────────────────────────────────
  'param.autoBlockThreshold':     { en: 'Auto-Block Threshold', de: 'Auto-Block-Schwellenwert' },
  'param.autoBlockThresholdDesc': { en: 'Threat score at which IPs are automatically hard-blocked', de: 'Bedrohungsscore, ab dem IPs automatisch gesperrt werden' },
  'param.autoBlockThresholdTip':  { en: 'When an IP accumulates this many threat points, it is automatically added to the hard blocklist. Default: 12 points. Lower = more aggressive, higher = more tolerant.', de: 'Wenn eine IP so viele Bedrohungspunkte ansammelt, wird sie automatisch auf die Sperrliste gesetzt. Standard: 12 Punkte. Niedriger = aggressiver, höher = toleranter.' },
  'param.maxAlerts':              { en: 'Max Alerts Stored', de: 'Max. gespeicherte Alarme' },
  'param.maxAlertsDesc':          { en: 'Maximum number of security incidents kept in the alert log', de: 'Maximale Anzahl der im Alarmprotokoll gespeicherten Sicherheitsvorfälle' },
  'param.tarpitMin':              { en: 'Tarpit Min Delay', de: 'Tarpit Min. Verzögerung' },
  'param.tarpitMinDesc':          { en: 'Minimum delay applied to flagged requests', de: 'Minimale Verzögerung für markierte Anfragen' },
  'param.tarpitMinTip':           { en: 'The minimum artificial delay (in milliseconds) injected into responses for flagged IPs. Requests are slowed down to waste attacker time.', de: 'Die minimale künstliche Verzögerung (in Millisekunden), die in Antworten für markierte IPs eingefügt wird. Anfragen werden verlangsamt, um Angreifer-Zeit zu verschwenden.' },
  'param.tarpitMax':              { en: 'Tarpit Max Delay', de: 'Tarpit Max. Verzögerung' },
  'param.tarpitMaxDesc':          { en: 'Maximum delay applied to flagged requests', de: 'Maximale Verzögerung für markierte Anfragen' },
  'param.tarpitMaxTip':           { en: 'The maximum artificial delay (in milliseconds). Actual delay is random between min and max to appear more natural.', de: 'Die maximale künstliche Verzögerung (in Millisekunden). Die tatsächliche Verzögerung ist zufällig zwischen Min und Max, um natürlicher zu wirken.' },
  'param.sessionTtl':             { en: 'Session TTL', de: 'Sitzungsdauer' },
  'param.sessionTtlDesc':         { en: 'Admin session lifetime before re-authentication is required', de: 'Admin-Sitzungsdauer vor erneuter Authentifizierung' },
  'param.sessionTtlTip':          { en: 'Time in seconds before the admin session expires and requires re-login. Default: 14400s (4 hours). Lower = more secure, higher = more convenient.', de: 'Zeit in Sekunden bis die Admin-Sitzung abläuft und erneute Anmeldung erfordert. Standard: 14400s (4 Stunden). Niedriger = sicherer, höher = bequemer.' },

  // ── Threat Level Thresholds ────────────────────────────────────────
  'param.thresholds':             { en: 'THREAT LEVEL THRESHOLDS', de: 'BEDROHUNGSSTUFEN-SCHWELLENWERTE' },
  'param.warnThreshold':          { en: 'WARN Threshold', de: 'WARN-Schwellenwert' },
  'param.warnThresholdDesc':      { en: 'Threat score at which WARN level is reached (tarpit applied)', de: 'Bedrohungsscore, ab dem WARN-Stufe erreicht wird (Tarpit wird angewendet)' },
  'param.warnThresholdTip':       { en: 'IPs reaching this score trigger WARN level. Default: 3 points. At WARN level, tarpit delays may be applied if enabled.', de: 'IPs, die diesen Score erreichen, lösen WARN-Stufe aus. Standard: 3 Punkte. Bei WARN-Stufe werden ggf. Tarpit-Verzögerungen angewendet.' },
  'param.tarpitThreshold':        { en: 'TARPIT Threshold', de: 'TARPIT-Schwellenwert' },
  'param.tarpitThresholdDesc':    { en: 'Threat score at which TARPIT level is reached (slower responses)', de: 'Bedrohungsscore, ab dem TARPIT-Stufe erreicht wird (langsamere Antworten)' },
  'param.tarpitThresholdTip':     { en: 'IPs reaching this score trigger TARPIT level. Default: 7 points. At TARPIT level, all responses are artificially delayed.', de: 'IPs, die diesen Score erreichen, lösen TARPIT-Stufe aus. Standard: 7 Punkte. Bei TARPIT-Stufe werden alle Antworten künstlich verzögert.' },

  // ── Threat Reason Points ───────────────────────────────────────────
  'param.reasonPoints':           { en: 'THREAT REASON POINTS', de: 'BEDROHUNGS-PUNKTEWERTE' },
  'param.pointsHoneytoken':       { en: 'Honeytoken Access', de: 'Honeytoken-Zugriff' },
  'param.pointsHoneytokenDesc':   { en: 'Points awarded per honeytoken access event', de: 'Punkte pro Honeytoken-Zugriff' },
  'param.pointsSuspiciousUa':     { en: 'Suspicious User-Agent', de: 'Verdächtiger User-Agent' },
  'param.pointsSuspiciousUaDesc': { en: 'Points awarded for known hacking tool User-Agents', de: 'Punkte für bekannte Hacking-Tool User-Agents' },
  'param.pointsRobotsViolation':  { en: 'Robots.txt Violation', de: 'Robots.txt-Verstoß' },
  'param.pointsRobotsViolationDesc':{ en: 'Points awarded per robots.txt Disallow violation', de: 'Punkte pro robots.txt-Disallow-Verstoß' },
  'param.pointsMissingHeaders':   { en: 'Missing Browser Headers', de: 'Fehlende Browser-Header' },
  'param.pointsMissingHeadersDesc':{ en: 'Points for requests missing standard browser headers', de: 'Punkte für Anfragen ohne Standard-Browser-Header' },
  'param.pointsRateLimit':        { en: 'Rate Limit Exceeded', de: 'Ratenbegrenzung überschritten' },
  'param.pointsRateLimitDesc':    { en: 'Points awarded when rate limit is exceeded', de: 'Punkte bei Überschreitung der Ratenbegrenzung' },
  'param.pointsGenericAccept':    { en: 'Generic Accept Header', de: 'Generischer Accept-Header' },
  'param.pointsGenericAcceptDesc':{ en: 'Points for requests with generic Accept: */* header', de: 'Punkte für Anfragen mit generischem Accept: */* Header' },

  // ── Alert Channels ─────────────────────────────────────────────────
  'param.alertChannels':          { en: 'ALERT CHANNELS', de: 'ALARM-KANÄLE' },
  'param.discordWebhook':         { en: 'Discord Webhook URL', de: 'Discord-Webhook-URL' },
  'param.discordWebhookDesc':     { en: 'Discord webhook URL for security alerts (overrides env var)', de: 'Discord-Webhook-URL für Sicherheitsalarme (überschreibt Umgebungsvariable)' },
  'param.discordWebhookTip':      { en: 'Enter a Discord webhook URL to receive real-time security alerts in a Discord channel. This overrides the DISCORD_WEBHOOK_URL environment variable when set.', de: 'Discord-Webhook-URL eingeben, um Echtzeit-Sicherheitsalarme in einem Discord-Kanal zu erhalten. Überschreibt die DISCORD_WEBHOOK_URL Umgebungsvariable wenn gesetzt.' },
  'param.alertEmail':             { en: 'Alert Email', de: 'Alarm-E-Mail' },
  'param.alertEmailDesc':         { en: 'Email address for security alert notifications (overrides env var)', de: 'E-Mail-Adresse für Sicherheitsalarm-Benachrichtigungen (überschreibt Umgebungsvariable)' },
  'param.alertEmailTip':          { en: 'Enter an email address to receive security alert emails via Resend API. Requires RESEND_API_KEY to be set. This overrides the ADMIN_RESET_EMAIL environment variable when set.', de: 'E-Mail-Adresse eingeben, um Sicherheitsalarm-E-Mails über die Resend-API zu erhalten. Erfordert, dass RESEND_API_KEY gesetzt ist. Überschreibt die ADMIN_RESET_EMAIL Umgebungsvariable wenn gesetzt.' },

  // ── Tarpit & Zip Bomb Rules ───────────────────────────────────────
  'rules.tarpitOnWarn':           { en: 'Tarpit on WARN level', de: 'Tarpit bei WARN-Stufe' },
  'rules.tarpitOnWarnDesc':       { en: 'Apply tarpit delay when threat level reaches WARN', de: 'Tarpit-Verzögerung anwenden wenn Bedrohungsstufe WARN erreicht' },
  'rules.tarpitOnWarnTip':        { en: 'When enabled, IPs that reach WARN threat level (score ≥3) receive artificial response delays. This slows down potential attackers without fully blocking them.', de: 'Wenn aktiviert, erhalten IPs mit WARN-Bedrohungsstufe (Score ≥3) künstliche Antwortverzögerungen. Dies verlangsamt potenzielle Angreifer ohne sie vollständig zu blockieren.' },
  'rules.tarpitOnSuspiciousUa':   { en: 'Tarpit on suspicious User-Agent', de: 'Tarpit bei verdächtigem User-Agent' },
  'rules.tarpitOnSuspiciousUaDesc':{ en: 'Apply tarpit delay for known hacking tools', de: 'Tarpit-Verzögerung für bekannte Hacking-Tools anwenden' },
  'rules.tarpitOnSuspiciousUaTip':{ en: 'Applies tarpit delays to requests from known attack tools (nikto, sqlmap, wfuzz, etc.) regardless of their current threat score.', de: 'Wendet Tarpit-Verzögerungen auf Anfragen von bekannten Angriffs-Tools (nikto, sqlmap, wfuzz etc.) an, unabhängig von ihrem aktuellen Bedrohungsscore.' },
  'rules.tarpitOnRobotsViolation':{ en: 'Tarpit on robots.txt violation', de: 'Tarpit bei robots.txt-Verstoß' },
  'rules.tarpitOnRobotsViolationDesc':{ en: 'Apply tarpit delay for bots ignoring Disallow rules', de: 'Tarpit-Verzögerung für Bots die Disallow-Regeln ignorieren' },
  'rules.zipBombOnBlock':         { en: 'Zip bomb on BLOCK level', de: 'Zip-Bombe bei BLOCK-Stufe' },
  'rules.zipBombOnBlockDesc':     { en: 'Serve zip bomb payload when threat reaches BLOCK level', de: 'Zip-Bomben-Payload senden wenn Bedrohung BLOCK-Stufe erreicht' },
  'rules.zipBombOnBlockTip':      { en: 'When enabled and zip bomb is active, IPs that reach BLOCK level (score ≥12) receive a compressed junk payload instead of normal responses. Extremely aggressive — use with caution.', de: 'Wenn aktiviert und Zip-Bombe aktiv ist, erhalten IPs mit BLOCK-Stufe (Score ≥12) eine komprimierte Müll-Nutzlast statt normaler Antworten. Extrem aggressiv — mit Vorsicht verwenden.' },
  'rules.zipBombOnHoneytoken':    { en: 'Zip bomb on honeytoken access', de: 'Zip-Bombe bei Honeytoken-Zugriff' },
  'rules.zipBombOnHoneytokenDesc':{ en: 'Serve zip bomb when honeytoken records are accessed', de: 'Zip-Bombe senden wenn Honeytoken-Einträge aufgerufen werden' },
  'rules.zipBombOnHoneytokenTip': { en: 'Honeytoken access is a strong indicator of malicious intent. When enabled, accessing decoy database records triggers an immediate zip bomb response.', de: 'Honeytoken-Zugriff ist ein starker Indikator für böswillige Absicht. Wenn aktiviert, löst der Zugriff auf Köder-Datenbankeinträge eine sofortige Zip-Bomben-Antwort aus.' },
  'rules.zipBombOnRepeatOffender':{ en: 'Zip bomb on repeat offenders', de: 'Zip-Bombe bei Wiederholungstätern' },
  'rules.zipBombOnRepeatOffenderDesc':{ en: 'Serve zip bomb to IPs with ≥3 blocked incidents', de: 'Zip-Bombe an IPs mit ≥3 blockierten Vorfällen senden' },
  'rules.zipBombOnRepeatOffenderTip':{ en: 'IPs that have been blocked 3 or more times are considered repeat offenders. When enabled, they receive zip bomb payloads on any subsequent access attempt.', de: 'IPs, die 3 oder mehr Mal gesperrt wurden, gelten als Wiederholungstäter. Wenn aktiviert, erhalten sie bei jedem weiteren Zugriffsversuch Zip-Bomben-Nutzlasten.' },

  // ── SQL Injection Backfire ────────────────────────────────────────
  'settings.sqlBackfire':         { en: 'SQL INJECTION BACKFIRE', de: 'SQL-INJECTION-BACKFIRE' },
  'mod.sqlBackfire':              { en: 'SQL Injection Backfire', de: 'SQL-Injection-Backfire' },
  'mod.sqlBackfireDesc':          { en: 'Return poisoned SQL data that corrupts the attacker\'s scanner database', de: 'Vergiftete SQL-Daten zurückgeben, die die Scanner-Datenbank des Angreifers korrumpieren' },
  'mod.sqlBackfireTip':           { en: 'When a scanner probes for SQL injections, the server responds with SQL commands (DROP TABLE, DELETE, corrupt inserts) embedded in the response body and headers. These payloads target the scanner\'s local analysis database (e.g. sqlmap\'s SQLite session store).', de: 'Wenn ein Scanner nach SQL-Injections sucht, antwortet der Server mit SQL-Befehlen (DROP TABLE, DELETE, korrupte Inserts) in Response-Body und -Headern. Diese Payloads zielen auf die lokale Analyse-Datenbank des Scanners (z.B. sqlmaps SQLite-Session-Store).' },
  'rules.sqlBackfireOnScanner':   { en: 'Backfire on scanner detection', de: 'Backfire bei Scanner-Erkennung' },
  'rules.sqlBackfireOnScannerDesc':{ en: 'Activate when SQL injection patterns are detected in requests', de: 'Aktivieren wenn SQL-Injection-Muster in Anfragen erkannt werden' },
  'rules.sqlBackfireOnHoneytoken':{ en: 'Backfire on honeytoken access', de: 'Backfire bei Honeytoken-Zugriff' },
  'rules.sqlBackfireOnHoneytokenDesc':{ en: 'Return poisoned SQL data when honeytokens are accessed', de: 'Vergiftete SQL-Daten zurückgeben wenn Honeytokens aufgerufen werden' },

  // ── Canary Documents ──────────────────────────────────────────────
  'settings.canaryDocuments':     { en: 'CANARY DOCUMENTS', de: 'CANARY-DOKUMENTE' },
  'mod.canaryDocuments':          { en: 'Canary Documents', de: 'Canary-Dokumente' },
  'mod.canaryDocumentsDesc':      { en: 'Trackable decoy documents in tarpit directories that phone home when opened', de: 'Verfolgbare Köder-Dokumente in Tarpit-Verzeichnissen, die beim Öffnen "nach Hause telefonieren"' },
  'mod.canaryDocumentsTip':       { en: 'Places realistic-looking documents (credentials, DB exports, API keys) in tarpit directories like /admin/backup/. When an attacker downloads and opens them, embedded tracking reveals their real IP, OS, browser, timezone, and screen resolution — even behind proxies (via WebRTC STUN).', de: 'Platziert realistisch aussehende Dokumente (Zugangsdaten, DB-Exporte, API-Keys) in Tarpit-Verzeichnissen wie /admin/backup/. Wenn ein Angreifer sie herunterlädt und öffnet, enthüllt eingebettetes Tracking seine echte IP, OS, Browser, Zeitzone und Bildschirmauflösung — selbst hinter Proxies (via WebRTC STUN).' },
  'rules.canaryPhoneHome':       { en: 'Phone-home on document open', de: 'Nach-Hause-Telefonieren beim Öffnen' },
  'rules.canaryPhoneHomeDesc':   { en: 'Embed tracking callbacks that fire when documents are opened', de: 'Tracking-Callbacks einbetten, die beim Öffnen der Dokumente ausgelöst werden' },
  'rules.canaryFingerprint':     { en: 'Collect browser fingerprint', de: 'Browser-Fingerabdruck sammeln' },
  'rules.canaryFingerprintDesc': { en: 'Gather timezone, screen size, language, WebRTC IP from the opener', de: 'Zeitzone, Bildschirmgröße, Sprache, WebRTC-IP vom Öffner sammeln' },
  'rules.canaryAlert':           { en: 'Alert on canary callback', de: 'Alarm bei Canary-Callback' },
  'rules.canaryAlertDesc':       { en: 'Send Discord/email alert when a canary document phones home', de: 'Discord/E-Mail-Alarm senden wenn ein Canary-Dokument nach Hause telefoniert' },

  // ── Log Poisoning ─────────────────────────────────────────────────
  'settings.logPoisoning':       { en: 'LOG POISONING & CANARY TOKENS', de: 'LOG-POISONING & CANARY-TOKENS' },
  'mod.logPoisoning':            { en: 'Log Poisoning', de: 'Log-Poisoning' },
  'mod.logPoisoningDesc':        { en: 'Inject misleading data into responses to corrupt attacker analysis tools', de: 'Irreführende Daten in Antworten injizieren, um Analyse-Tools des Angreifers zu korrumpieren' },
  'mod.logPoisoningTip':         { en: 'Injects fake server info, internal paths, credentials, and terminal escape sequences into response headers. Attackers who log responses get corrupted data — fake routes to probe, terminal poison that corrupts CLI viewers, and misleading server fingerprints.', de: 'Injiziert gefälschte Server-Infos, interne Pfade, Zugangsdaten und Terminal-Escape-Sequenzen in Response-Header. Angreifer, die Antworten loggen, erhalten korrumpierte Daten — gefälschte Routen zum Sondieren, Terminal-Gift das CLI-Viewer korrumpiert, und irreführende Server-Fingerprints.' },
  'rules.logPoisonFakeHeaders':  { en: 'Fake server headers', de: 'Gefälschte Server-Header' },
  'rules.logPoisonFakeHeadersDesc':{ en: 'Inject misleading X-Powered-By, X-Backend, X-Debug headers', de: 'Irreführende X-Powered-By, X-Backend, X-Debug Header injizieren' },
  'rules.logPoisonTerminal':     { en: 'Terminal escape sequences', de: 'Terminal-Escape-Sequenzen' },
  'rules.logPoisonTerminalDesc': { en: 'Inject ANSI codes that corrupt CLI-based log viewers', de: 'ANSI-Codes injizieren, die CLI-basierte Log-Viewer korrumpieren' },
  'rules.logPoisonFakePaths':    { en: 'Fake internal paths', de: 'Gefälschte interne Pfade' },
  'rules.logPoisonFakePathsDesc':{ en: 'Include fake API routes and debug endpoints in responses', de: 'Gefälschte API-Routen und Debug-Endpunkte in Antworten einbinden' },

  // ── Config Export ─────────────────────────────────────────────────
  'settings.exported':            { en: 'Security config exported to JSON', de: 'Sicherheitskonfiguration als JSON exportiert' },
  'settings.exportJson':          { en: 'EXPORT JSON', de: 'JSON EXPORTIEREN' },

  // ── Tab labels ─────────────────────────────────────────────────────
  'settings.tabModules':          { en: 'MODULES', de: 'MODULE' },
  'settings.tabParameters':       { en: 'PARAMETERS', de: 'PARAMETER' },
  'settings.tabRules':            { en: 'RULES', de: 'REGELN' },
  'settings.tabCountermeasures':  { en: 'COUNTERMEASURES', de: 'GEGENMAẞNAHMEN' },

  // ── Under Attack Mode ──────────────────────────────────────────────
  'mod.underAttack':              { en: 'Under Attack Mode', de: 'Angriffsmodus' },
  'mod.underAttackDesc':          { en: 'Emergency kill-switch — disables all expensive countermeasures and returns minimal 429 responses to save resources', de: 'Notfall-Schalter — deaktiviert alle aufwändigen Gegenmaßnahmen und gibt nur minimale 429-Antworten zurück, um Ressourcen zu sparen' },
  'mod.underAttackTip':           { en: 'Activating this mode immediately stops tarpitting, zip bombs, log poisoning, and canary documents. All requests to tarpit endpoints receive an empty 429 response with Connection: close. Use during active Layer-7 DDoS attacks to minimize Vercel costs. The global circuit breaker in the edge middleware can also activate this automatically.', de: 'Die Aktivierung dieses Modus stoppt sofort Tarpitting, Zip-Bomben, Log-Poisoning und Canary-Dokumente. Alle Anfragen an Tarpit-Endpunkte erhalten eine leere 429-Antwort mit Connection: close. Bei aktiven Layer-7-DDoS-Angriffen verwenden, um Vercel-Kosten zu minimieren. Der globale Circuit Breaker in der Edge Middleware kann dies auch automatisch aktivieren.' },
}

/** Get a translated string for a key and locale */
export function t(key: string, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.en ?? key
}

/** Get tooltip for a key (uses the 'Tip' variant) */
export function tip(key: string, locale: Locale): string | undefined {
  const tipKey = key + 'Tip'
  return translations[tipKey]?.[locale] ?? translations[tipKey]?.en
}

/** Get all available locales */
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
]
