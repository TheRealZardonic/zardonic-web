/**
 * Global i18n utility for the site.
 * Supports 8 locales: en, de, ru, it, es, pt, ja, ko.
 */

export type Locale = 'en' | 'de' | 'ru' | 'it' | 'es' | 'pt' | 'ja' | 'ko'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '' },
  { code: 'de', label: 'Deutsch',    flag: '' },
  { code: 'ru', label: 'Русский',    flag: '' },
  { code: 'it', label: 'Italiano',   flag: '' },
  { code: 'es', label: 'Español',    flag: '' },
  { code: 'pt', label: 'Português',  flag: '' },
  { code: 'ja', label: '日本語',      flag: '' },
  { code: 'ko', label: '한국어',      flag: '' },
]

const translations: Record<string, Record<Locale, string>> = {
  // ── Footer ──────────────────────────────────────────────────────────
  'footer.section':            { en: 'FOOTER_SECTION', de: 'FOOTER_BEREICH', ru: 'СЕКЦИЯ_ПОДВАЛА', it: 'SEZIONE_PIÈ_DI_PAGINA', es: 'SECCIÓN_PIE_DE_PÁGINA', pt: 'SECÇÃO_RODAPÉ', ja: 'フッター_セクション', ko: '푸터_섹션' },
  'footer.protocol':           { en: 'PROTOCOL: HELLFIRE', de: 'PROTOKOLL: HELLFIRE', ru: 'ПРОТОКОЛ: HELLFIRE', it: 'PROTOCOLLO: HELLFIRE', es: 'PROTOCOLO: HELLFIRE', pt: 'PROTOCOLO: HELLFIRE', ja: 'プロトコル: HELLFIRE', ko: '프로토콜: HELLFIRE' },
  'footer.defaultGenres':      { en: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', de: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', ru: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', it: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', es: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', pt: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', ja: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO', ko: 'HARD TECHNO · CYBERPUNK · DNB · DARK ELECTRO' },
  'footer.label':              { en: 'LABEL: {0}', de: 'LABEL: {0}', ru: 'ЛЕЙБЛ: {0}', it: 'ETICHETTA: {0}', es: 'SELLO: {0}', pt: 'SELO: {0}', ja: 'レーベル: {0}', ko: '레이블: {0}' },
  'footer.copyright':          { en: '© {0} All rights reserved.', de: '© {0} Alle Rechte vorbehalten.', ru: '© {0} Все права защищены.', it: '© {0} Tutti i diritti riservati.', es: '© {0} Todos los derechos reservados.', pt: '© {0} Todos os direitos reservados.', ja: '© {0} 全著作権所有。', ko: '© {0} 모든 권리 보유.' },
  'footer.impressum':          { en: 'IMPRESSUM', de: 'IMPRESSUM', ru: 'IMPRESSUM', it: 'IMPRESSUM', es: 'IMPRESSUM', pt: 'IMPRESSUM', ja: 'IMPRESSUM', ko: 'IMPRESSUM' },
  'footer.datenschutz':        { en: 'PRIVACY POLICY', de: 'DATENSCHUTZ', ru: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ', it: 'PRIVACY', es: 'POLÍTICA DE PRIVACIDAD', pt: 'POLÍTICA DE PRIVACIDADE', ja: 'プライバシーポリシー', ko: '개인정보 처리방침' },
  'footer.admin':              { en: 'ADMIN', de: 'ADMIN', ru: 'ADMIN', it: 'ADMIN', es: 'ADMIN', pt: 'ADMIN', ja: 'ADMIN', ko: 'ADMIN' },
  'footer.adminLogin':         { en: 'Admin login', de: 'Admin-Login', ru: 'Вход администратора', it: 'Accesso amministratore', es: 'Acceso de administrador', pt: 'Login de administrador', ja: '管理者ログイン', ko: '관리자 로그인' },
  'footer.backToTop':          { en: 'BACK TO TOP', de: 'NACH OBEN', ru: 'НАВЕРХ', it: 'TORNA SU', es: 'VOLVER ARRIBA', pt: 'VOLTAR AO TOPO', ja: '上に戻る', ko: '맨 위로' },

  // ── Navigation ──────────────────────────────────────────────────────
  'nav.home':                  { en: 'HOME', de: 'STARTSEITE', ru: 'ГЛАВНАЯ', it: 'HOME', es: 'INICIO', pt: 'INÍCIO', ja: 'ホーム', ko: '홈' },
  'nav.news':                  { en: 'NEWS', de: 'NEUIGKEITEN', ru: 'НОВОСТИ', it: 'NOTIZIE', es: 'NOTICIAS', pt: 'NOTÍCIAS', ja: 'ニュース', ko: '뉴스' },
  'nav.biography':             { en: 'BIOGRAPHY', de: 'BIOGRAFIE', ru: 'БИОГРАФИЯ', it: 'BIOGRAFIA', es: 'BIOGRAFÍA', pt: 'BIOGRAFIA', ja: '経歴', ko: '바이오그래피' },
  'nav.music':                 { en: 'MUSIC', de: 'MUSIK', ru: 'МУЗЫКА', it: 'MUSICA', es: 'MÚSICA', pt: 'MÚSICA', ja: '音楽', ko: '음악' },
  'nav.gallery':               { en: 'GALLERY', de: 'GALERIE', ru: 'ГАЛЕРЕЯ', it: 'GALLERIA', es: 'GALERÍA', pt: 'GALERIA', ja: 'ギャラリー', ko: '갤러리' },
  'nav.gigs':                  { en: 'GIGS', de: 'AUFTRITTE', ru: 'КОНЦЕРТЫ', it: 'CONCERTI', es: 'CONCIERTOS', pt: 'CONCERTOS', ja: 'ライブ', ko: '공연' },
  'nav.releases':              { en: 'RELEASES', de: 'VERÖFFENTLICHUNGEN', ru: 'РЕЛИЗЫ', it: 'USCITE', es: 'LANZAMIENTOS', pt: 'LANÇAMENTOS', ja: 'リリース', ko: '릴리즈' },
  'nav.media':                 { en: 'MEDIA', de: 'MEDIEN', ru: 'МЕДИА', it: 'MEDIA', es: 'MEDIA', pt: 'MEDIA', ja: 'メディア', ko: '미디어' },
  'nav.connect':               { en: 'CONNECT', de: 'VERBINDEN', ru: 'КОНТАКТ', it: 'CONTATTA', es: 'CONTACTO', pt: 'CONTACTO', ja: 'コンタクト', ko: '연결' },
  'nav.closePlayer':           { en: 'Close music player', de: 'Musik-Player schließen', ru: 'Закрыть плеер', it: 'Chiudi il lettore musicale', es: 'Cerrar el reproductor de música', pt: 'Fechar o leitor de música', ja: '音楽プレイヤーを閉じる', ko: '음악 플레이어 닫기' },
  'nav.openPlayer':            { en: 'Open music player', de: 'Musik-Player öffnen', ru: 'Открыть плеер', it: 'Apri il lettore musicale', es: 'Abrir el reproductor de música', pt: 'Abrir o leitor de música', ja: '音楽プレイヤーを開く', ko: '음악 플레이어 열기' },

  // ── CookieBanner ────────────────────────────────────────────────────
  'cookie.notice':             { en: 'SYSTEM_NOTICE', de: 'SYSTEM_HINWEIS', ru: 'СИСТЕМНОЕ_УВЕДОМЛЕНИЕ', it: 'AVVISO_DI_SISTEMA', es: 'AVISO_DEL_SISTEMA', pt: 'AVISO_DO_SISTEMA', ja: 'システム通知', ko: '시스템_알림' },
  'cookie.text':               { en: 'This website uses technically necessary local storage (Local Storage, IndexedDB) for settings and image caching. No tracking cookies are set. For more information, see our privacy policy.', de: 'Diese Website verwendet technisch notwendige lokale Speicherung (Local Storage, IndexedDB) für Einstellungen und Bildcaching. Es werden keine Tracking-Cookies gesetzt. Weitere Informationen finden Sie in unserer Datenschutzerklärung.', ru: 'Этот сайт использует технически необходимое локальное хранилище (Local Storage, IndexedDB) для настроек и кэширования изображений. Файлы отслеживания не устанавливаются. Подробнее в нашей политике конфиденциальности.', it: 'Questo sito web utilizza la memorizzazione locale tecnicamente necessaria (Local Storage, IndexedDB) per impostazioni e cache delle immagini. Non vengono impostati cookie di tracciamento. Per ulteriori informazioni, consultare la nostra informativa sulla privacy.', es: 'Este sitio web utiliza almacenamiento local técnicamente necesario (Local Storage, IndexedDB) para configuraciones y caché de imágenes. No se establecen cookies de seguimiento. Para más información, consulte nuestra política de privacidad.', pt: 'Este website utiliza armazenamento local tecnicamente necessário (Local Storage, IndexedDB) para definições e cache de imagens. Não são definidos cookies de rastreamento. Para mais informações, consulte a nossa política de privacidade.', ja: 'このウェブサイトは、設定および画像のキャッシュのために技術的に必要なローカルストレージ（Local Storage、IndexedDB）を使用しています。トラッキングクッキーは設定されていません。詳細については、プライバシーポリシーをご覧ください。', ko: '이 웹사이트는 설정 및 이미지 캐싱을 위해 기술적으로 필요한 로컬 스토리지(Local Storage, IndexedDB)를 사용합니다. 추적 쿠키는 설정되지 않습니다. 자세한 내용은 개인정보 처리방침을 참조하십시오.' },
  'cookie.decline':            { en: 'DECLINE', de: 'ABLEHNEN', ru: 'ОТКЛОНИТЬ', it: 'RIFIUTA', es: 'RECHAZAR', pt: 'RECUSAR', ja: '拒否', ko: '거절' },
  'cookie.accept':             { en: 'ACCEPT', de: 'AKZEPTIEREN', ru: 'ПРИНЯТЬ', it: 'ACCETTA', es: 'ACEPTAR', pt: 'ACEITAR', ja: '承認', ko: '수락' },
  'cookie.title':              { en: 'PRIVACY & DATA', de: 'DATENSCHUTZ & COOKIES', ru: 'КОНФИДЕНЦИАЛЬНОСТЬ', it: 'PRIVACY & DATI', es: 'PRIVACIDAD & DATOS', pt: 'PRIVACIDADE & DADOS', ja: 'プライバシーとデータ', ko: '개인정보 및 데이터' },
  'cookie.bannerText':         { en: 'We use optional analytics to improve this site. Essential storage (image cache, settings) is always active. See our', de: 'Wir verwenden optionale Analyse-Tools zur Verbesserung dieser Seite. Notwendiger Speicher (Bild-Cache, Einstellungen) ist immer aktiv. Siehe unsere', ru: 'Мы используем необязательную аналитику для улучшения сайта. Основное хранилище (кэш изображений, настройки) всегда активно. Смотрите нашу', it: 'Utilizziamo analisi opzionali per migliorare questo sito. Lo storage essenziale (cache immagini, impostazioni) è sempre attivo. Vedi la nostra', es: 'Usamos análisis opcionales para mejorar este sitio. El almacenamiento esencial (caché de imágenes, configuraciones) siempre está activo. Consulta nuestra', pt: 'Usamos análises opcionais para melhorar este site. O armazenamento essencial (cache de imagens, definições) está sempre ativo. Consulte a nossa', ja: 'このサイトを改善するためにオプションのアナリティクスを使用しています。必須ストレージ（画像キャッシュ、設定）は常にアクティブです。', ko: '이 사이트를 개선하기 위해 선택적 분석을 사용합니다. 필수 저장소(이미지 캐시, 설정)는 항상 활성화되어 있습니다.' },
  'cookie.privacyPolicyLink':  { en: 'Privacy Policy.', de: 'Datenschutzerklärung.', ru: 'Политику конфиденциальности.', it: 'Informativa sulla privacy.', es: 'Política de privacidad.', pt: 'Política de Privacidade.', ja: 'プライバシーポリシー。', ko: '개인정보 처리방침.' },
  'cookie.privacyPrefs':       { en: 'PRIVACY PREFERENCES', de: 'DATENSCHUTZ-EINSTELLUNGEN', ru: 'НАСТРОЙКИ КОНФИДЕНЦИАЛЬНОСТИ', it: 'PREFERENZE PRIVACY', es: 'PREFERENCIAS DE PRIVACIDAD', pt: 'PREFERÊNCIAS DE PRIVACIDADE', ja: 'プライバシー設定', ko: '개인정보 설정' },
  'cookie.essentialLabel':     { en: 'Technically Necessary', de: 'Technisch notwendig', ru: 'Технически необходимое', it: 'Tecnicamente necessario', es: 'Técnicamente necesario', pt: 'Tecnicamente necessário', ja: '技術的に必要', ko: '기술적으로 필요' },
  'cookie.alwaysOn':           { en: 'ALWAYS ON', de: 'IMMER AN', ru: 'ВСЕГДА ВКЛ', it: 'SEMPRE ATTIVO', es: 'SIEMPRE ACTIVO', pt: 'SEMPRE ATIVO', ja: '常に有効', ko: '항상 켜짐' },
  'cookie.analyticsLabel':     { en: 'Analytics (optional)', de: 'Analytik (optional)', ru: 'Аналитика (необязательно)', it: 'Analisi (opzionale)', es: 'Análisis (opcional)', pt: 'Análise (opcional)', ja: 'アナリティクス（任意）', ko: '분석 (선택)' },
  'cookie.analyticsDesc':      { en: 'Tracks page views, section views and heatmap clicks to improve user experience. No personal data is stored.', de: 'Erfasst Seitenaufrufe, Abschnittsansichten und Heatmap-Klicks zur Verbesserung der Benutzererfahrung. Keine personenbezogenen Daten werden gespeichert.', ru: 'Отслеживает просмотры страниц, разделов и клики для улучшения пользовательского опыта. Личные данные не сохраняются.', it: 'Traccia visualizzazioni di pagina, sezioni e clic heatmap per migliorare l\'esperienza utente. Nessun dato personale viene memorizzato.', es: 'Rastrea vistas de página, secciones y clics de mapa de calor para mejorar la experiencia. No se almacenan datos personales.', pt: 'Rastreia visualizações de página, secções e cliques de mapa de calor para melhorar a experiência. Nenhum dado pessoal é armazenado.', ja: 'ページビュー、セクションビュー、ヒートマップクリックを追跡してユーザー体験を改善します。個人データは保存されません。', ko: '사용자 경험을 개선하기 위해 페이지 뷰, 섹션 뷰, 히트맵 클릭을 추적합니다. 개인 데이터는 저장되지 않습니다.' },
  'cookie.analyticsBasis':     { en: 'Legal basis: Art. 6(1)(a) GDPR (consent)', de: 'Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)', ru: 'Правовое основание: ст. 6(1)(а) GDPR (согласие)', it: 'Base giuridica: Art. 6(1)(a) GDPR (consenso)', es: 'Base legal: Art. 6(1)(a) RGPD (consentimiento)', pt: 'Base legal: Art. 6.º(1)(a) RGPD (consentimento)', ja: '法的根拠：GDPR第6条第1項(a)（同意）', ko: '법적 근거: GDPR 제6조 제1항 (a) (동의)' },
  'cookie.essentialDesc':      { en: 'Image caching (IndexedDB), locale preference, admin session. No consent required — Art. 6(1)(f) GDPR / TTDSG § 25(2).', de: 'Bild-Caching (IndexedDB), Spracheinstellung, Admin-Session. Keine Einwilligung erforderlich — Art. 6 Abs. 1 lit. f DSGVO / § 25 Abs. 2 TTDSG.', ru: 'Кэш изображений (IndexedDB), настройка языка, сессия администратора. Согласие не требуется — ст. 6(1)(f) GDPR / TTDSG § 25(2).', it: 'Cache immagini (IndexedDB), preferenza lingua, sessione admin. Nessun consenso richiesto — Art. 6(1)(f) GDPR / TTDSG § 25(2).', es: 'Caché de imágenes (IndexedDB), preferencia de idioma, sesión de administrador. Sin consentimiento requerido — Art. 6(1)(f) RGPD / TTDSG § 25(2).', pt: 'Cache de imagens (IndexedDB), preferência de idioma, sessão de administrador. Sem consentimento necessário — Art. 6.º(1)(f) RGPD / TTDSG § 25(2).', ja: '画像キャッシュ（IndexedDB）、ロケール設定、管理セッション。同意不要 — GDPR第6条第1項(f) / TTDSG § 25(2)。', ko: '이미지 캐싱(IndexedDB), 언어 설정, 관리 세션. 동의 불필요 — GDPR 제6조 제1항 (f) / TTDSG § 25(2).' },
  'cookie.cookieText':         { en: 'We use browser storage to analyze site usage and improve your experience. Your data is processed anonymously.', de: 'Wir verwenden Browser-Speicher zur Analyse der Nutzung und Verbesserung Ihres Erlebnisses. Ihre Daten werden anonymisiert verarbeitet.', ru: 'Мы используем хранилище браузера для анализа использования сайта и улучшения вашего опыта. Ваши данные обрабатываются анонимно.', it: "Utilizziamo la memoria del browser per analizzare l'utilizzo del sito e migliorare la tua esperienza. I tuoi dati vengono elaborati in modo anonimo.", es: 'Usamos el almacenamiento del navegador para analizar el uso del sitio y mejorar tu experiencia. Tus datos se procesan de forma anónima.', pt: 'Usamos o armazenamento do browser para analisar o uso do site e melhorar a sua experiência. Os seus dados são processados de forma anónima.', ja: 'ブラウザストレージを使用してサイトの利用状況を分析し、エクスペリエンスを向上させます。データは匿名で処理されます。', ko: '브라우저 저장소를 사용하여 사이트 사용 현황을 분석하고 경험을 개선합니다. 귀하의 데이터는 익명으로 처리됩니다.' },
  'cookie.acceptAll':          { en: 'Accept All', de: 'Alle akzeptieren', ru: 'Принять всё', it: 'Accetta tutto', es: 'Aceptar todo', pt: 'Aceitar tudo', ja: 'すべて承認', ko: '모두 수락' },
  'cookie.rejectAll':          { en: 'Reject All', de: 'Alle ablehnen', ru: 'Отклонить всё', it: 'Rifiuta tutto', es: 'Rechazar todo', pt: 'Rejeitar tudo', ja: 'すべて拒否', ko: '모두 거부' },
  'cookie.essentialOnly':      { en: 'Essential Only', de: 'Nur Essenzielle', ru: 'Только основные', it: 'Solo essenziali', es: 'Solo esenciales', pt: 'Apenas essenciais', ja: '必須のみ', ko: '필수만' },
  'cookie.customize':          { en: 'Customize', de: 'Anpassen', ru: 'Настроить', it: 'Personalizza', es: 'Personalizar', pt: 'Personalizar', ja: 'カスタマイズ', ko: '사용자 설정' },
  'cookie.savePrefs':          { en: 'Save Preferences', de: 'Einstellungen speichern', ru: 'Сохранить настройки', it: 'Salva preferenze', es: 'Guardar preferencias', pt: 'Guardar preferências', ja: '設定を保存', ko: '설정 저장' },
  'cookie.managePrefs':        { en: 'Cookie Preferences', de: 'Cookie-Einstellungen', ru: 'Настройки cookie', it: 'Preferenze cookie', es: 'Preferencias de cookies', pt: 'Preferências de cookies', ja: 'Cookie設定', ko: '쿠키 설정' },
  'cookie.closeDetails':       { en: 'Close preferences', de: 'Einstellungen schließen', ru: 'Закрыть настройки', it: 'Chiudi preferenze', es: 'Cerrar preferencias', pt: 'Fechar preferências', ja: '設定を閉じる', ko: '설정 닫기' },
  'cookie.on':                 { en: 'ON', de: 'AN', ru: 'ВКЛ', it: 'ON', es: 'ON', pt: 'ON', ja: 'オン', ko: '켜짐' },
  'cookie.off':                { en: 'OFF', de: 'AUS', ru: 'ВЫКЛ', it: 'OFF', es: 'OFF', pt: 'OFF', ja: 'オフ', ko: '꺼짐' },

  // ── Hero ────────────────────────────────────────────────────────────
  'hero.sysLabel':             { en: 'SYS: NK-MAIN', de: 'SYS: NK-MAIN', ru: 'SYS: NK-MAIN', it: 'SYS: NK-MAIN', es: 'SYS: NK-MAIN', pt: 'SYS: NK-MAIN', ja: 'SYS: NK-MAIN', ko: 'SYS: NK-MAIN' },
  'hero.online':               { en: 'ONLINE', de: 'ONLINE', ru: 'ONLINE', it: 'ONLINE', es: 'ONLINE', pt: 'ONLINE', ja: 'ONLINE', ko: 'ONLINE' },
  'hero.freq':                 { en: 'FREQ: 140-180', de: 'FREQ: 140-180', ru: 'FREQ: 140-180', it: 'FREQ: 140-180', es: 'FREQ: 140-180', pt: 'FREQ: 140-180', ja: 'FREQ: 140-180', ko: 'FREQ: 140-180' },
  'hero.mode':                 { en: 'MODE: HARD', de: 'MODE: HARD', ru: 'MODE: HARD', it: 'MODE: HARD', es: 'MODE: HARD', pt: 'MODE: HARD', ja: 'MODE: HARD', ko: 'MODE: HARD' },
  'hero.logoAlt':              { en: 'Logo', de: 'Logo', ru: 'Логотип', it: 'Logo', es: 'Logo', pt: 'Logótipo', ja: 'ロゴ', ko: '로고' },
  'hero.titleAlt':             { en: 'NEUROKLAST', de: 'NEUROKLAST', ru: 'NEUROKLAST', it: 'NEUROKLAST', es: 'NEUROKLAST', pt: 'NEUROKLAST', ja: 'NEUROKLAST', ko: 'NEUROKLAST' },
  'hero.editInfo':             { en: 'Edit Info', de: 'Info bearbeiten', ru: 'Редактировать информацию', it: 'Modifica Info', es: 'Editar Info', pt: 'Editar Info', ja: '情報を編集', ko: '정보 편집' },
  'hero.enter':                { en: 'ENTER', de: 'EINTRETEN', ru: 'ВОЙТИ', it: 'ENTRA', es: 'ENTRAR', pt: 'ENTRAR', ja: '入る', ko: '입장' },
  'hero.listenNow':            { en: 'LISTEN NOW', de: 'JETZT HÖREN', ru: 'СЛУШАТЬ СЕЙЧАС', it: 'ASCOLTA ORA', es: 'ESCUCHA AHORA', pt: 'OUVIR AGORA', ja: '今すぐ聴く', ko: '지금 듣기' },
  'hero.tourDates':            { en: 'TOUR DATES', de: 'TOURDATEN', ru: 'ДАТЫ ТУРА', it: 'DATE DEL TOUR', es: 'FECHAS DE GIRA', pt: 'DATAS DE DIGRESSÃO', ja: 'ツアー日程', ko: '투어 일정' },
  'hero.merch':                { en: 'MERCH', de: 'MERCH', ru: 'МЕРЧ', it: 'MERCH', es: 'MERCH', pt: 'MERCH', ja: 'マーチ', ko: '머치' },
  'hero.uploadImage':          { en: 'Upload Hero Image', de: 'Hero-Bild hochladen', ru: 'Загрузить изображение Hero', it: 'Carica immagine Hero', es: 'Subir imagen Hero', pt: 'Carregar imagem Hero', ja: 'ヒーロー画像をアップロード', ko: '히어로 이미지 업로드' },
  'hero.editLinks':            { en: 'Edit Links', de: 'Links bearbeiten', ru: 'Редактировать ссылки', it: 'Modifica link', es: 'Editar enlaces', pt: 'Editar links', ja: 'リンクを編集', ko: '링크 편집' },
  'hero.scrollSection':        { en: 'Scroll to section', de: 'Zum Abschnitt scrollen', ru: 'Прокрутить к разделу', it: 'Scorri alla sezione', es: 'Desplazar a la sección', pt: 'Rolar para a secção', ja: 'セクションにスクロール', ko: '섹션으로 스크롤' },
  'hero.externalUrl':          { en: 'External URL', de: 'Externe URL', ru: 'Внешний URL', it: 'URL esterno', es: 'URL externo', pt: 'URL externo', ja: '外部URL', ko: '외부 URL' },
  'hero.sectionId':            { en: 'Section ID', de: 'Abschnitts-ID', ru: 'ID раздела', it: 'ID sezione', es: 'ID de sección', pt: 'ID da secção', ja: 'セクションID', ko: '섹션 ID' },
  'hero.urlPlaceholder':       { en: 'https://...', de: 'https://...', ru: 'https://...', it: 'https://...', es: 'https://...', pt: 'https://...', ja: 'https://...', ko: 'https://...' },
  'hero.linksEditor':          { en: '// HERO.LINKS.EDITOR', de: '// HERO.LINKS.EDITOR', ru: '// HERO.LINKS.EDITOR', it: '// HERO.LINKS.EDITOR', es: '// HERO.LINKS.EDITOR', pt: '// HERO.LINKS.EDITOR', ja: '// HERO.LINKS.EDITOR', ko: '// HERO.LINKS.EDITOR' },
  'hero.buttonLabel':          { en: 'Button label', de: 'Schaltflächen-Beschriftung', ru: 'Метка кнопки', it: 'Etichetta pulsante', es: 'Etiqueta del botón', pt: 'Etiqueta do botão', ja: 'ボタンラベル', ko: '버튼 레이블' },
  'hero.newLink':              { en: 'New Link', de: 'Neuer Link', ru: 'Новая ссылка', it: 'Nuovo link', es: 'Nuevo enlace', pt: 'Novo link', ja: '新しいリンク', ko: '새 링크' },
  'hero.addLink':              { en: 'Add Link', de: 'Link hinzufügen', ru: 'Добавить ссылку', it: 'Aggiungi link', es: 'Agregar enlace', pt: 'Adicionar link', ja: 'リンクを追加', ko: '링크 추가' },
  'hero.save':                 { en: 'Save', de: 'Speichern', ru: 'Сохранить', it: 'Salva', es: 'Guardar', pt: 'Guardar', ja: '保存', ko: '저장' },

  // ── NewsSection ─────────────────────────────────────────────────────
  'news.defaultTitle':         { en: 'NEWS', de: 'NEUIGKEITEN', ru: 'НОВОСТИ', it: 'NOTIZIE', es: 'NOTICIAS', pt: 'NOTÍCIAS', ja: 'ニュース', ko: '뉴스' },
  'news.link':                 { en: 'LINK', de: 'LINK', ru: 'ССЫЛКА', it: 'LINK', es: 'ENLACE', pt: 'LINK', ja: 'リンク', ko: '링크' },
  'news.readMore':             { en: 'CLICK TO READ MORE', de: 'KLICKEN UM MEHR ZU LESEN', ru: 'НАЖМИТЕ ДЛЯ ЧТЕНИЯ', it: 'CLICCA PER LEGGERE DI PIÙ', es: 'CLICK PARA LEER MÁS', pt: 'CLIQUE PARA LER MAIS', ja: 'クリックして続きを読む', ko: '더 읽으려면 클릭' },
  'news.noNews':               { en: 'No news yet.', de: 'Noch keine Neuigkeiten.', ru: 'Новостей пока нет.', it: 'Nessuna notizia ancora.', es: 'Sin noticias aún.', pt: 'Sem notícias ainda.', ja: 'まだニュースはありません。', ko: '아직 뉴스가 없습니다.' },
  'news.showLess':             { en: 'Show Less', de: 'Weniger anzeigen', ru: 'Показать меньше', it: 'Mostra meno', es: 'Mostrar menos', pt: 'Mostrar menos', ja: '表示を減らす', ko: '덜 보기' },
  'news.showMore':             { en: 'Show More ({0} more)', de: 'Mehr anzeigen ({0} weitere)', ru: 'Показать больше ({0} ещё)', it: 'Mostra altro ({0} in più)', es: 'Mostrar más ({0} más)', pt: 'Mostrar mais ({0} mais)', ja: 'もっと見る (あと{0}件)', ko: '더 보기 ({0}개 더)' },
  'news.share':                { en: 'SHARE', de: 'TEILEN', ru: 'ПОДЕЛИТЬСЯ', it: 'CONDIVIDI', es: 'COMPARTIR', pt: 'PARTILHAR', ja: 'シェア', ko: '공유' },
  'news.copied':               { en: 'COPIED', de: 'KOPIERT', ru: 'СКОПИРОВАНО', it: 'COPIATO', es: 'COPIADO', pt: 'COPIADO', ja: 'コピー済み', ko: '복사됨' },
  'news.openLink':             { en: 'OPEN LINK', de: 'LINK ÖFFNEN', ru: 'ОТКРЫТЬ ССЫЛКУ', it: 'APRI LINK', es: 'ABRIR ENLACE', pt: 'ABRIR LINK', ja: 'リンクを開く', ko: '링크 열기' },
  'news.entry':                { en: 'NEWS ENTRY', de: 'NACHRICHTEN-EINTRAG', ru: 'ЗАПИСЬ НОВОСТЕЙ', it: 'VOCE NOTIZIE', es: 'ENTRADA DE NOTICIAS', pt: 'ENTRADA DE NOTÍCIA', ja: 'ニュースエントリ', ko: '뉴스 항목' },
  'news.version':              { en: 'NK-NEWS v1.0', de: 'NK-NEWS v1.0', ru: 'NK-NEWS v1.0', it: 'NK-NEWS v1.0', es: 'NK-NEWS v1.0', pt: 'NK-NEWS v1.0', ja: 'NK-NEWS v1.0', ko: 'NK-NEWS v1.0' },
  'news.editTitle':            { en: 'EDIT NEWS', de: 'NEUIGKEITEN BEARBEITEN', ru: 'РЕДАКТИРОВАТЬ НОВОСТЬ', it: 'MODIFICA NOTIZIE', es: 'EDITAR NOTICIAS', pt: 'EDITAR NOTÍCIAS', ja: 'ニュースを編集', ko: '뉴스 편집' },
  'news.addTitle':             { en: 'ADD NEWS', de: 'NEUIGKEIT HINZUFÜGEN', ru: 'ДОБАВИТЬ НОВОСТЬ', it: 'AGGIUNGI NOTIZIA', es: 'AGREGAR NOTICIA', pt: 'ADICIONAR NOTÍCIA', ja: 'ニュースを追加', ko: '뉴스 추가' },

  // ── BiographySection ────────────────────────────────────────────────
  'bio.defaultTitle':          { en: 'BIOGRAPHY', de: 'BIOGRAFIE', ru: 'БИОГРАФИЯ', it: 'BIOGRAFIA', es: 'BIOGRAFÍA', pt: 'BIOGRAFIA', ja: '経歴', ko: '바이오그래피' },
  'bio.editButton':            { en: 'Edit Bio', de: 'Bio bearbeiten', ru: 'Редактировать биографию', it: 'Modifica Bio', es: 'Editar Bio', pt: 'Editar Bio', ja: '経歴を編集', ko: '바이오 편집' },

  // ── GigsSection ─────────────────────────────────────────────────────
  'gigs.defaultTitle':         { en: 'UPCOMING GIGS', de: 'ANSTEHENDE AUFTRITTE', ru: 'ПРЕДСТОЯЩИЕ КОНЦЕРТЫ', it: 'PROSSIMI CONCERTI', es: 'PRÓXIMAS ACTUACIONES', pt: 'PRÓXIMOS CONCERTOS', ja: 'ライブ情報', ko: '다가오는 공연' },
  'gigs.noGigs':               { en: 'No upcoming gigs scheduled.', de: 'Keine anstehenden Auftritte geplant.', ru: 'Концертов не запланировано.', it: 'Nessun concerto in programma.', es: 'No hay actuaciones programadas.', pt: 'Sem concertos agendados.', ja: '予定されているライブはありません。', ko: '예정된 공연이 없습니다.' },
  'gigs.tickets':              { en: 'TICKETS', de: 'TICKETS', ru: 'БИЛЕТЫ', it: 'BIGLIETTI', es: 'ENTRADAS', pt: 'BILHETES', ja: 'チケット', ko: '티켓' },
  'gigs.addGig':               { en: 'Add Gig', de: 'Auftritt hinzufügen', ru: 'Добавить концерт', it: 'Aggiungi concerto', es: 'Agregar actuación', pt: 'Adicionar concerto', ja: 'ライブを追加', ko: '공연 추가' },
  'gigs.sync':                 { en: 'Sync Gigs', de: 'Auftritte synchronisieren', ru: 'Синхронизировать концерты', it: 'Sincronizza concerti', es: 'Sincronizar actuaciones', pt: 'Sincronizar concertos', ja: 'ライブを同期', ko: '공연 동기화' },
  'gigs.support':              { en: 'Support:', de: 'Support:', ru: 'Поддержка:', it: 'Supporto:', es: 'Soporte:', pt: 'Suporte:', ja: 'サポート:', ko: '서포트:' },
  'gigs.showLess':             { en: 'Show Less', de: 'Weniger anzeigen', ru: 'Показать меньше', it: 'Mostra meno', es: 'Mostrar menos', pt: 'Mostrar menos', ja: '表示を減らす', ko: '덜 보기' },
  'gigs.seeMore':              { en: 'See More', de: 'Mehr sehen', ru: 'Посмотреть больше', it: 'Vedi altro', es: 'Ver más', pt: 'Ver mais', ja: 'もっと見る', ko: '더 보기' },

  // ── ReleasesSection ─────────────────────────────────────────────────
  'releases.defaultTitle':     { en: 'RELEASES', de: 'VERÖFFENTLICHUNGEN', ru: 'РЕЛИЗЫ', it: 'USCITE', es: 'LANZAMIENTOS', pt: 'LANÇAMENTOS', ja: 'リリース', ko: '릴리즈' },
  'releases.noReleases':       { en: 'No releases yet.', de: 'Noch keine Veröffentlichungen.', ru: 'Релизов пока нет.', it: 'Nessuna uscita ancora.', es: 'Sin lanzamientos aún.', pt: 'Sem lançamentos ainda.', ja: 'まだリリースはありません。', ko: '아직 릴리즈가 없습니다.' },
  'releases.addRelease':       { en: 'Add Release', de: 'Release hinzufügen', ru: 'Добавить релиз', it: 'Aggiungi uscita', es: 'Agregar lanzamiento', pt: 'Adicionar lançamento', ja: 'リリースを追加', ko: '릴리즈 추가' },
  'releases.syncAndEnrich':    { en: 'Sync & Enrich', de: 'Synchronisieren & Anreichern', ru: 'Синхронизировать и обогатить', it: 'Sincronizza e arricchisci', es: 'Sincronizar y enriquecer', pt: 'Sincronizar e enriquecer', ja: '同期・補完', ko: '동기화 및 보강' },
  'releases.showLess':         { en: 'Show Less', de: 'Weniger anzeigen', ru: 'Показать меньше', it: 'Mostra meno', es: 'Mostrar menos', pt: 'Mostrar menos', ja: '表示を減らす', ko: '덜 보기' },
  'releases.showAll':          { en: 'Show All', de: 'Alle anzeigen', ru: 'Показать все', it: 'Mostra tutto', es: 'Mostrar todo', pt: 'Mostrar tudo', ja: 'すべて表示', ko: '모두 보기' },

  // ── ContactInboxDialog ──────────────────────────────────────────────
  'inbox.title':               { en: 'INBOX', de: 'POSTFACH', ru: 'ВХОДЯЩИЕ', it: 'POSTA IN ARRIVO', es: 'BANDEJA DE ENTRADA', pt: 'CAIXA DE ENTRADA', ja: '受信トレイ', ko: '받은 편지함' },
  'inbox.loading':             { en: 'Loading...', de: 'Laden...', ru: 'Загрузка...', it: 'Caricamento...', es: 'Cargando...', pt: 'A carregar...', ja: '読み込み中...', ko: '로딩 중...' },
  'inbox.noMessages':          { en: 'No messages', de: 'Keine Nachrichten', ru: 'Нет сообщений', it: 'Nessun messaggio', es: 'Sin mensajes', pt: 'Sem mensagens', ja: 'メッセージなし', ko: '메시지 없음' },
  'inbox.deleteMessage':       { en: 'Delete message', de: 'Nachricht löschen', ru: 'Удалить сообщение', it: 'Elimina messaggio', es: 'Eliminar mensaje', pt: 'Eliminar mensagem', ja: 'メッセージを削除', ko: '메시지 삭제' },

  // ── Contact ─────────────────────────────────────────────────────────
  'contact.defaultTitle':      { en: 'CONTACT', de: 'KONTAKT', ru: 'КОНТАКТ', it: 'CONTATTO', es: 'CONTACTO', pt: 'CONTACTO', ja: 'コンタクト', ko: '연락처' },
  'contact.description':       { en: 'Get in touch with us.', de: 'Nimm Kontakt mit uns auf.', ru: 'Свяжитесь с нами.', it: 'Mettiti in contatto con noi.', es: 'Contáctanos.', pt: 'Entre em contacto connosco.', ja: 'お問い合わせください。', ko: '저희에게 연락하세요.' },
  'contact.nameLabel':         { en: 'NAME', de: 'NAME', ru: 'ИМЯ', it: 'NOME', es: 'NOMBRE', pt: 'NOME', ja: '名前', ko: '이름' },
  'contact.namePlaceholder':   { en: 'Your name...', de: 'Dein Name...', ru: 'Ваше имя...', it: 'Il tuo nome...', es: 'Tu nombre...', pt: 'O seu nome...', ja: 'お名前...', ko: '이름...' },
  'contact.emailLabel':        { en: 'EMAIL', de: 'E-MAIL', ru: 'ЭЛЕКТРОННАЯ ПОЧТА', it: 'EMAIL', es: 'CORREO ELECTRÓNICO', pt: 'E-MAIL', ja: 'メール', ko: '이메일' },
  'contact.emailPlaceholder':  { en: 'your@email.com', de: 'deine@email.com', ru: 'ваша@почта.com', it: 'tua@email.com', es: 'tu@email.com', pt: 'o.seu@email.com', ja: 'your@email.com', ko: 'your@email.com' },
  'contact.subjectLabel':      { en: 'SUBJECT', de: 'BETREFF', ru: 'ТЕМА', it: 'OGGETTO', es: 'ASUNTO', pt: 'ASSUNTO', ja: '件名', ko: '제목' },
  'contact.subjectPlaceholder': { en: 'Subject...', de: 'Betreff...', ru: 'Тема...', it: 'Oggetto...', es: 'Asunto...', pt: 'Assunto...', ja: '件名...', ko: '제목...' },
  'contact.messageLabel':      { en: 'MESSAGE', de: 'NACHRICHT', ru: 'СООБЩЕНИЕ', it: 'MESSAGGIO', es: 'MENSAJE', pt: 'MENSAGEM', ja: 'メッセージ', ko: '메시지' },
  'contact.messagePlaceholder': { en: 'Your message...', de: 'Deine Nachricht...', ru: 'Ваше сообщение...', it: 'Il tuo messaggio...', es: 'Tu mensaje...', pt: 'A sua mensagem...', ja: 'メッセージ...', ko: '메시지...' },
  'contact.send':              { en: 'SEND MESSAGE', de: 'NACHRICHT SENDEN', ru: 'ОТПРАВИТЬ СООБЩЕНИЕ', it: 'INVIA MESSAGGIO', es: 'ENVIAR MENSAJE', pt: 'ENVIAR MENSAGEM', ja: 'メッセージを送る', ko: '메시지 보내기' },
  'contact.sending':           { en: 'SENDING...', de: 'WIRD GESENDET...', ru: 'ОТПРАВКА...', it: 'INVIO...', es: 'ENVIANDO...', pt: 'A ENVIAR...', ja: '送信中...', ko: '전송 중...' },
  'contact.success':           { en: 'Message sent successfully!', de: 'Nachricht erfolgreich gesendet!', ru: 'Сообщение успешно отправлено!', it: 'Messaggio inviato con successo!', es: '¡Mensaje enviado con éxito!', pt: 'Mensagem enviada com sucesso!', ja: 'メッセージが送信されました！', ko: '메시지가 성공적으로 전송되었습니다!' },
  'contact.sendError':         { en: 'Failed to send message. Please try again.', de: 'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.', ru: 'Не удалось отправить сообщение. Пожалуйста, попробуйте снова.', it: 'Invio del messaggio fallito. Riprova.', es: 'Error al enviar el mensaje. Por favor, inténtalo de nuevo.', pt: 'Falha ao enviar mensagem. Por favor, tente novamente.', ja: 'メッセージの送信に失敗しました。もう一度お試しください。', ko: '메시지 전송에 실패했습니다. 다시 시도해 주세요.' },
  'contact.newMessage':        { en: 'SEND ANOTHER', de: 'WEITERE SENDEN', ru: 'ОТПРАВИТЬ ЕЩЁ', it: 'INVIA UN ALTRO', es: 'ENVIAR OTRO', pt: 'ENVIAR OUTRO', ja: 'もう一件送る', ko: '다른 메시지 보내기' },
  'contact.settings':          { en: 'CONTACT SETTINGS', de: 'KONTAKT-EINSTELLUNGEN', ru: 'НАСТРОЙКИ КОНТАКТА', it: 'IMPOSTAZIONI CONTATTO', es: 'CONFIGURACIÓN DE CONTACTO', pt: 'DEFINIÇÕES DE CONTACTO', ja: 'コンタクト設定', ko: '연락처 설정' },
  'contact.titleLabel':        { en: 'Section Title', de: 'Abschnittstitel', ru: 'Заголовок раздела', it: 'Titolo sezione', es: 'Título de sección', pt: 'Título da secção', ja: 'セクションタイトル', ko: '섹션 제목' },
  'contact.titlePlaceholder':  { en: 'CONTACT', de: 'KONTAKT', ru: 'КОНТАКТ', it: 'CONTATTO', es: 'CONTACTO', pt: 'CONTACTO', ja: 'コンタクト', ko: '연락처' },
  'contact.emailForward':      { en: 'Forward to Email', de: 'Weiterleiten an E-Mail', ru: 'Переслать на email', it: 'Inoltra a email', es: 'Reenviar a email', pt: 'Encaminhar para email', ja: 'メールに転送', ko: '이메일로 전달' },
  'contact.emailForwardPlaceholder': { en: 'admin@example.com', de: 'admin@example.com', ru: 'admin@example.com', it: 'admin@example.com', es: 'admin@example.com', pt: 'admin@example.com', ja: 'admin@example.com', ko: 'admin@example.com' },
  'contact.descriptionLabel':  { en: 'Description', de: 'Beschreibung', ru: 'Описание', it: 'Descrizione', es: 'Descripción', pt: 'Descrição', ja: '説明', ko: '설명' },
  'contact.descriptionPlaceholder': { en: 'Get in touch...', de: 'Kontaktiere uns...', ru: 'Свяжитесь с нами...', it: 'Mettiti in contatto...', es: 'Contáctanos...', pt: 'Entre em contacto...', ja: 'お問い合わせ...', ko: '연락하기...' },
  'contact.successLabel':      { en: 'Success Message', de: 'Erfolgsnachricht', ru: 'Сообщение об успехе', it: 'Messaggio di successo', es: 'Mensaje de éxito', pt: 'Mensagem de sucesso', ja: '成功メッセージ', ko: '성공 메시지' },
  'contact.successPlaceholder': { en: 'Thanks for reaching out!', de: 'Danke für deine Nachricht!', ru: 'Спасибо за обращение!', it: 'Grazie per averci contattato!', es: '¡Gracias por contactarnos!', pt: 'Obrigado pelo contacto!', ja: 'お問い合わせありがとうございます！', ko: '연락해 주셔서 감사합니다!' },
  'contact.closePanel':        { en: 'CLOSE', de: 'SCHLIESSEN', ru: 'ЗАКРЫТЬ', it: 'CHIUDI', es: 'CERRAR', pt: 'FECHAR', ja: '閉じる', ko: '닫기' },
  'contact.editSection':       { en: 'EDIT SECTION', de: 'ABSCHNITT BEARBEITEN', ru: 'РЕДАКТИРОВАТЬ РАЗДЕЛ', it: 'MODIFICA SEZIONE', es: 'EDITAR SECCIÓN', pt: 'EDITAR SECÇÃO', ja: 'セクションを編集', ko: '섹션 편집' },
  'contact.formFieldLabels':   { en: 'Form Field Labels', de: 'Formularfeld-Beschriftungen', ru: 'Метки полей формы', it: 'Etichette dei campi del modulo', es: 'Etiquetas de campos del formulario', pt: 'Etiquetas dos campos do formulário', ja: 'フォームフィールドラベル', ko: '양식 필드 레이블' },
  'contact.nameLabelField':    { en: 'Name Label', de: 'Name-Beschriftung', ru: 'Метка имени', it: 'Etichetta nome', es: 'Etiqueta de nombre', pt: 'Etiqueta do nome', ja: '名前ラベル', ko: '이름 레이블' },
  'contact.namePlaceholderField': { en: 'Name Placeholder', de: 'Name-Platzhalter', ru: 'Заполнитель имени', it: 'Segnaposto nome', es: 'Marcador de posición de nombre', pt: 'Marcador do nome', ja: '名前プレースホルダー', ko: '이름 플레이스홀더' },
  'contact.emailLabelField':   { en: 'Email Label', de: 'E-Mail-Beschriftung', ru: 'Метка email', it: 'Etichetta email', es: 'Etiqueta de email', pt: 'Etiqueta do email', ja: 'メールラベル', ko: '이메일 레이블' },
  'contact.emailPlaceholderField': { en: 'Email Placeholder', de: 'E-Mail-Platzhalter', ru: 'Заполнитель email', it: 'Segnaposto email', es: 'Marcador de posición de email', pt: 'Marcador do email', ja: 'メールプレースホルダー', ko: '이메일 플레이스홀더' },
  'contact.subjectLabelField': { en: 'Subject Label', de: 'Betreff-Beschriftung', ru: 'Метка темы', it: 'Etichetta oggetto', es: 'Etiqueta de asunto', pt: 'Etiqueta do assunto', ja: '件名ラベル', ko: '제목 레이블' },
  'contact.subjectPlaceholderField': { en: 'Subject Placeholder', de: 'Betreff-Platzhalter', ru: 'Заполнитель темы', it: 'Segnaposto oggetto', es: 'Marcador de posición de asunto', pt: 'Marcador do assunto', ja: '件名プレースホルダー', ko: '제목 플레이스홀더' },
  'contact.messageLabelField': { en: 'Message Label', de: 'Nachrichten-Beschriftung', ru: 'Метка сообщения', it: 'Etichetta messaggio', es: 'Etiqueta de mensaje', pt: 'Etiqueta da mensagem', ja: 'メッセージラベル', ko: '메시지 레이블' },
  'contact.messagePlaceholderField': { en: 'Message Placeholder', de: 'Nachrichten-Platzhalter', ru: 'Заполнитель сообщения', it: 'Segnaposto messaggio', es: 'Marcador de posición de mensaje', pt: 'Marcador da mensagem', ja: 'メッセージプレースホルダー', ko: '메시지 플레이스홀더' },
  'contact.submitButtonField': { en: 'Submit Button Text', de: 'Schaltfläche Senden Text', ru: 'Текст кнопки отправки', it: 'Testo pulsante invio', es: 'Texto del botón de envío', pt: 'Texto do botão de envio', ja: '送信ボタンテキスト', ko: '제출 버튼 텍스트' },

  // ── Media ────────────────────────────────────────────────────────────
  'media.openArchive':         { en: 'OPEN MEDIA ARCHIVE', de: 'MEDIENARCHIV ÖFFNEN', ru: 'ОТКРЫТЬ МЕДИААРХИВ', it: 'APRI ARCHIVIO MEDIA', es: 'ABRIR ARCHIVO MULTIMEDIA', pt: 'ABRIR ARQUIVO DE MEDIA', ja: 'メディアアーカイブを開く', ko: '미디어 아카이브 열기' },
  'media.pressKits':           { en: '// PRESS KITS · LOGOS · ASSETS', de: '// PRESSEMAPPEN · LOGOS · ASSETS', ru: '// ПРЕСС-КИТЫ · ЛОГОТИПЫ · РЕСУРСЫ', it: '// PRESS KIT · LOGHI · RISORSE', es: '// KITS DE PRENSA · LOGOS · RECURSOS', pt: '// KITS DE IMPRENSA · LOGOS · RECURSOS', ja: '// プレスキット · ロゴ · アセット', ko: '// 프레스 킷 · 로고 · 에셋' },
  'media.filesAvailable':      { en: '{0} FILE{1} AVAILABLE // PRESS KITS · LOGOS · ASSETS', de: '{0} DATEI{1} VERFÜGBAR // PRESSEMAPPEN · LOGOS · ASSETS', ru: '{0} ФАЙЛ{1} ДОСТУПНО // ПРЕСС-КИТЫ · ЛОГОТИПЫ', it: '{0} FILE{1} DISPONIBILI // PRESS KIT · LOGHI', es: '{0} ARCHIVO{1} DISPONIBLE // KITS DE PRENSA', pt: '{0} FICHEIRO{1} DISPONÍVEL // KITS DE IMPRENSA', ja: '{0}個のファイルが利用可能 // プレスキット', ko: '{0}개 파일 사용 가능 // 프레스 킷' },
  'media.clickToAccess':       { en: 'CLICK TO ACCESS', de: 'KLICKEN ZUM ÖFFNEN', ru: 'НАЖМИТЕ ДЛЯ ДОСТУПА', it: 'CLICCA PER ACCEDERE', es: 'CLICK PARA ACCEDER', pt: 'CLIQUE PARA ACEDER', ja: 'クリックしてアクセス', ko: '클릭하여 접근' },
  'media.noFiles':             { en: 'NO FILES AVAILABLE', de: 'KEINE DATEIEN VERFÜGBAR', ru: 'НЕТ ДОСТУПНЫХ ФАЙЛОВ', it: 'NESSUN FILE DISPONIBILE', es: 'SIN ARCHIVOS DISPONIBLES', pt: 'SEM FICHEIROS DISPONÍVEIS', ja: 'ファイルなし', ko: '파일 없음' },

  // ── Social buttons ────────────────────────────────────────────────────
  'social.merchShop':          { en: 'Merch Shop', de: 'Merch-Shop', ru: 'Магазин мерча', it: 'Negozio Merch', es: 'Tienda de Merch', pt: 'Loja de Merch', ja: 'マーチショップ', ko: '머치 샵' },
  'social.contactButton':      { en: 'Contact', de: 'Kontakt', ru: 'Контакт', it: 'Contatto', es: 'Contacto', pt: 'Contacto', ja: 'コンタクト', ko: '연락처' },
  'social.editLinks':          { en: 'Edit Links', de: 'Links bearbeiten', ru: 'Редактировать ссылки', it: 'Modifica link', es: 'Editar enlaces', pt: 'Editar links', ja: 'リンクを編集', ko: '링크 편집' },

  // ── Newsletter ──────────────────────────────────────────────────────
  'newsletter.title':          { en: 'STAY CONNECTED', de: 'BLEIB VERBUNDEN', ru: 'ОСТАВАЙСЯ НА СВЯЗИ', it: 'RESTA CONNESSO', es: 'PERMANECE CONECTADO', pt: 'FICA LIGADO', ja: 'つながり続ける', ko: '연결 유지' },
  'newsletter.description':    { en: 'Get the latest news, releases and gig updates.', de: 'Erhalte die neuesten News, Releases und Gig-Updates.', ru: 'Получай последние новости, релизы и обновления о концертах.', it: 'Ricevi le ultime notizie, uscite e aggiornamenti sui concerti.', es: 'Recibe las últimas noticias, lanzamientos y actualizaciones de conciertos.', pt: 'Recebe as últimas notícias, lançamentos e actualizações de concertos.', ja: '最新ニュース、リリース、ライブ情報を受け取る。', ko: '최신 뉴스, 릴리즈 및 공연 업데이트를 받아보세요.' },
  'newsletter.placeholder':    { en: 'your@email.com', de: 'deine@email.com', ru: 'ваша@почта.com', it: 'tua@email.com', es: 'tu@email.com', pt: 'o.seu@email.com', ja: 'your@email.com', ko: 'your@email.com' },
  'newsletter.subscribe':      { en: 'SUBSCRIBE', de: 'ABONNIEREN', ru: 'ПОДПИСАТЬСЯ', it: 'ISCRIVITI', es: 'SUSCRIBIRSE', pt: 'SUBSCREVER', ja: '登録する', ko: '구독하기' },
  'newsletter.signupError':    { en: 'Error signing up', de: 'Fehler beim Anmelden', ru: 'Ошибка при регистрации', it: "Errore durante l'iscrizione", es: 'Error al registrarse', pt: 'Erro ao subscrever', ja: '登録エラー', ko: '가입 오류' },
  'newsletter.networkError':   { en: 'Network error. Please try again later.', de: 'Netzwerkfehler. Bitte versuche es später erneut.', ru: 'Ошибка сети. Пожалуйста, попробуйте позже.', it: 'Errore di rete. Riprova più tardi.', es: 'Error de red. Por favor, inténtalo más tarde.', pt: 'Erro de rede. Por favor, tente novamente mais tarde.', ja: 'ネットワークエラー。後でもう一度お試しください。', ko: '네트워크 오류. 나중에 다시 시도하세요.' },
  'newsletter.success':        { en: "✓ You're in! Check your emails.", de: '✓ Du bist dabei! Check deine E-Mails.', ru: '✓ Вы подписаны! Проверьте почту.', it: '✓ Sei dentro! Controlla le tue email.', es: '✓ ¡Ya estás! Revisa tus emails.', pt: '✓ Estás dentro! Verifica o teu email.', ja: '✓ 登録完了！メールをご確認ください。', ko: '✓ 등록됐습니다! 이메일을 확인하세요.' },
  'newsletter.unsubscribe':    { en: 'You can unsubscribe at any time.', de: 'Du kannst dich jederzeit abmelden.', ru: 'Вы можете отписаться в любое время.', it: "Puoi annullare l'iscrizione in qualsiasi momento.", es: 'Puedes darte de baja en cualquier momento.', pt: 'Podes cancelar a subscrição a qualquer momento.', ja: 'いつでも登録解除できます。', ko: '언제든지 구독을 취소할 수 있습니다.' },

  // ── ErrorFallback ───────────────────────────────────────────────────
  'error.title':               { en: 'Runtime Error', de: 'Laufzeitfehler', ru: 'Ошибка выполнения', it: 'Errore di esecuzione', es: 'Error de ejecución', pt: 'Erro de execução', ja: '実行時エラー', ko: '런타임 오류' },
  'error.description':         { en: 'Something unexpected happened while running the application.', de: 'Beim Ausführen der Anwendung ist ein unerwarteter Fehler aufgetreten.', ru: 'Произошла непредвиденная ошибка при запуске приложения.', it: "Qualcosa di inatteso è accaduto durante l'esecuzione dell'applicazione.", es: 'Algo inesperado ocurrió mientras se ejecutaba la aplicación.', pt: 'Algo inesperado aconteceu enquanto a aplicação estava a correr.', ja: 'アプリケーションの実行中に予期しないエラーが発生しました。', ko: '애플리케이션 실행 중 예기치 않은 오류가 발생했습니다.' },
  'error.details':             { en: 'Error Details:', de: 'Fehlerdetails:', ru: 'Подробности ошибки:', it: 'Dettagli errore:', es: 'Detalles del error:', pt: 'Detalhes do erro:', ja: 'エラー詳細:', ko: '오류 세부사항:' },
  'error.tryAgain':            { en: 'Try Again', de: 'Erneut versuchen', ru: 'Попробовать снова', it: 'Riprova', es: 'Intentar de nuevo', pt: 'Tentar novamente', ja: 'もう一度試す', ko: '다시 시도' },

  // ── Gallery ─────────────────────────────────────────────────────────
  'gallery.defaultTitle':      { en: 'GALLERY', de: 'GALERIE', ru: 'ГАЛЕРЕЯ', it: 'GALLERIA', es: 'GALERÍA', pt: 'GALERIA', ja: 'ギャラリー', ko: '갤러리' },
  'gallery.subtitle':          { en: 'Visual identity', de: 'Visuelle Identität', ru: 'Визуальная идентичность', it: 'Identità visiva', es: 'Identidad visual', pt: 'Identidade visual', ja: 'ビジュアルアイデンティティ', ko: '시각적 정체성' },
  'gallery.noImages':          { en: 'No images found in gallery', de: 'Keine Bilder in der Galerie gefunden', ru: 'Изображений в галерее нет', it: 'Nessuna immagine trovata nella galleria', es: 'No se encontraron imágenes en la galería', pt: 'Sem imagens na galeria', ja: 'ギャラリーに画像がありません', ko: '갤러리에 이미지가 없습니다' },

  // ── Partners ────────────────────────────────────────────────────────
  'partners.defaultTitle':     { en: 'PARTNERS & FRIENDS', de: 'PARTNER & FREUNDE', ru: 'ПАРТНЁРЫ И ДРУЗЬЯ', it: 'PARTNER & AMICI', es: 'SOCIOS Y AMIGOS', pt: 'PARCEIROS E AMIGOS', ja: 'パートナー＆フレンズ', ko: '파트너 & 친구들' },

  // ── EditControls ────────────────────────────────────────────────────
  'edit.export':               { en: 'EXPORT', de: 'EXPORT', ru: 'ЭКСПОРТ', it: 'ESPORTA', es: 'EXPORTAR', pt: 'EXPORTAR', ja: 'エクスポート', ko: '내보내기' },
  'edit.import':               { en: 'IMPORT', de: 'IMPORT', ru: 'ИМПОРТ', it: 'IMPORTA', es: 'IMPORTAR', pt: 'IMPORTAR', ja: 'インポート', ko: '가져오기' },
  'edit.config':               { en: 'CONFIG', de: 'KONFIG', ru: 'КОНФИГ', it: 'CONFIG', es: 'CONFIG', pt: 'CONFIG', ja: '設定', ko: '구성' },
  'edit.analytics':            { en: 'ANALYTICS', de: 'ANALYTIK', ru: 'АНАЛИТИКА', it: 'ANALISI', es: 'ANÁLISIS', pt: 'ANÁLISE', ja: 'アナリティクス', ko: '애널리틱스' },
  'edit.security':             { en: 'SECURITY', de: 'SICHERHEIT', ru: 'БЕЗОПАСНОСТЬ', it: 'SICUREZZA', es: 'SEGURIDAD', pt: 'SEGURANÇA', ja: 'セキュリティ', ko: '보안' },
  'edit.blocklist':            { en: 'BLOCKLIST', de: 'SPERRLISTE', ru: 'БЛОК-ЛИСТ', it: 'LISTA NERA', es: 'LISTA DE BLOQUEO', pt: 'LISTA DE BLOQUEIO', ja: 'ブロックリスト', ko: '차단 목록' },
  'edit.theme':                { en: 'THEME', de: 'DESIGN', ru: 'ТЕМА', it: 'TEMA', es: 'TEMA', pt: 'TEMA', ja: 'テーマ', ko: '테마' },
  'edit.terminal':             { en: 'TERMINAL', de: 'TERMINAL', ru: 'ТЕРМИНАЛ', it: 'TERMINALE', es: 'TERMINAL', pt: 'TERMINAL', ja: 'ターミナル', ko: '터미널' },
  'edit.inbox':                { en: 'INBOX', de: 'POSTFACH', ru: 'ВХОДЯЩИЕ', it: 'POSTA IN ARRIVO', es: 'BANDEJA DE ENTRADA', pt: 'CAIXA DE ENTRADA', ja: '受信トレイ', ko: '받은 편지함' },
  'edit.subscribers':          { en: 'SUBSCRIBERS', de: 'ABONNENTEN', ru: 'ПОДПИСЧИКИ', it: 'ABBONATI', es: 'SUSCRIPTORES', pt: 'SUBSCRITORES', ja: '購読者', ko: '구독자' },
  'edit.password':             { en: 'PASSWORD', de: 'PASSWORT', ru: 'ПАРОЛЬ', it: 'PASSWORD', es: 'CONTRASEÑA', pt: 'PALAVRA-PASSE', ja: 'パスワード', ko: '비밀번호' },
  'edit.logout':               { en: 'LOGOUT', de: 'ABMELDEN', ru: 'ВЫЙТИ', it: 'DISCONNETTERSI', es: 'CERRAR SESIÓN', pt: 'SAIR', ja: 'ログアウト', ko: '로그아웃' },

  // ── CyberpunkLoader ─────────────────────────────────────────────────
  'loader.bootSequence':       { en: 'NK-SYS [v2.0] // BOOT SEQUENCE', de: 'NK-SYS [v2.0] // STARTSEQUENZ', ru: 'NK-SYS [v2.0] // ПОСЛЕДОВАТЕЛЬНОСТЬ ЗАГРУЗКИ', it: 'NK-SYS [v2.0] // SEQUENZA DI AVVIO', es: 'NK-SYS [v2.0] // SECUENCIA DE ARRANQUE', pt: 'NK-SYS [v2.0] // SEQUÊNCIA DE ARRANQUE', ja: 'NK-SYS [v2.0] // 起動シーケンス', ko: 'NK-SYS [v2.0] // 부팅 시퀀스' },

  // ── Admin Panel Tabs ─────────────────────────────────────────────────
  'admin.tabOverview':         { en: 'Overview', de: 'Übersicht', ru: 'Обзор', it: 'Panoramica', es: 'Resumen', pt: 'Visão geral', ja: '概要', ko: '개요' },
  'admin.tabContent':          { en: 'Content', de: 'Inhalte', ru: 'Контент', it: 'Contenuto', es: 'Contenido', pt: 'Conteúdo', ja: 'コンテンツ', ko: '콘텐츠' },
  'admin.tabAppearance':       { en: 'Appearance', de: 'Erscheinungsbild', ru: 'Внешний вид', it: 'Aspetto', es: 'Apariencia', pt: 'Aparência', ja: '外観', ko: '외관' },
  'admin.tabBackground':       { en: 'Background', de: 'Hintergrund', ru: 'Фон', it: 'Sfondo', es: 'Fondo', pt: 'Plano de fundo', ja: '背景', ko: '배경' },
  'admin.tabSections':         { en: 'Sections', de: 'Abschnitte', ru: 'Разделы', it: 'Sezioni', es: 'Secciones', pt: 'Secções', ja: 'セクション', ko: '섹션' },
  'admin.tabSectionConfig':    { en: 'Section Config', de: 'Abschnitts-Konfiguration', ru: 'Конфигурация разделов', it: 'Config sezione', es: 'Config de sección', pt: 'Config de secção', ja: 'セクション設定', ko: '섹션 설정' },
  'admin.tabSecurity':         { en: 'Security', de: 'Sicherheit', ru: 'Безопасность', it: 'Sicurezza', es: 'Seguridad', pt: 'Segurança', ja: 'セキュリティ', ko: '보안' },
  'admin.tabAnalytics':        { en: 'Analytics', de: 'Analytik', ru: 'Аналитика', it: 'Analisi', es: 'Análisis', pt: 'Análise', ja: 'アナリティクス', ko: '애널리틱스' },
  'admin.tabData':             { en: 'Data', de: 'Daten', ru: 'Данные', it: 'Dati', es: 'Datos', pt: 'Dados', ja: 'データ', ko: '데이터' },
  'admin.tabTranslations':     { en: 'Translations', de: 'Übersetzungen', ru: 'Переводы', it: 'Traduzioni', es: 'Traducciones', pt: 'Traduções', ja: '翻訳', ko: '번역' },

  // ── i18n / Translation Manager ──────────────────────────────────────
  'i18n.exportTitle':          { en: 'Export Translations', de: 'Übersetzungen exportieren', ru: 'Экспортировать переводы', it: 'Esporta traduzioni', es: 'Exportar traducciones', pt: 'Exportar traduções', ja: '翻訳をエクスポート', ko: '번역 내보내기' },
  'i18n.importTitle':          { en: 'Import Translations', de: 'Übersetzungen importieren', ru: 'Импортировать переводы', it: 'Importa traduzioni', es: 'Importar traducciones', pt: 'Importar traduções', ja: '翻訳をインポート', ko: '번역 가져오기' },
  'i18n.exportDesc':           { en: 'Download all translation keys as a JSON file for editing.', de: 'Alle Übersetzungsschlüssel als JSON-Datei herunterladen.', ru: 'Скачать все ключи перевода в виде JSON-файла для редактирования.', it: 'Scarica tutte le chiavi di traduzione come file JSON per la modifica.', es: 'Descarga todas las claves de traducción como archivo JSON para editar.', pt: 'Transferir todas as chaves de tradução como ficheiro JSON para edição.', ja: 'すべての翻訳キーをJSONファイルとしてダウンロード。', ko: '모든 번역 키를 JSON 파일로 다운로드하여 편집하세요.' },
  'i18n.importDesc':           { en: 'Upload a translation JSON file to add or override translations.', de: 'JSON-Datei mit Übersetzungen hochladen, um Übersetzungen hinzuzufügen oder zu überschreiben.', ru: 'Загрузить JSON-файл с переводами для добавления или замены переводов.', it: 'Carica un file JSON di traduzione per aggiungere o sovrascrivere le traduzioni.', es: 'Sube un archivo JSON de traducción para agregar o reemplazar traducciones.', pt: 'Carregue um ficheiro JSON de tradução para adicionar ou substituir traduções.', ja: '翻訳JSONファイルをアップロードして翻訳を追加または上書きします。', ko: '번역 JSON 파일을 업로드하여 번역을 추가하거나 재정의하세요.' },
  'i18n.exportButton':         { en: 'Export JSON', de: 'JSON exportieren', ru: 'Экспорт JSON', it: 'Esporta JSON', es: 'Exportar JSON', pt: 'Exportar JSON', ja: 'JSONをエクスポート', ko: 'JSON 내보내기' },
  'i18n.importButton':         { en: 'Import JSON', de: 'JSON importieren', ru: 'Импорт JSON', it: 'Importa JSON', es: 'Importar JSON', pt: 'Importar JSON', ja: 'JSONをインポート', ko: 'JSON 가져오기' },
  'i18n.importSuccess':        { en: 'Translations imported successfully!', de: 'Übersetzungen erfolgreich importiert!', ru: 'Переводы успешно импортированы!', it: 'Traduzioni importate con successo!', es: '¡Traducciones importadas con éxito!', pt: 'Traduções importadas com sucesso!', ja: '翻訳が正常にインポートされました！', ko: '번역이 성공적으로 가져와졌습니다!' },
  'i18n.importError':          { en: 'Invalid translation file format.', de: 'Ungültiges Übersetzungsdateiformat.', ru: 'Неверный формат файла перевода.', it: 'Formato del file di traduzione non valido.', es: 'Formato de archivo de traducción no válido.', pt: 'Formato de ficheiro de tradução inválido.', ja: '無効な翻訳ファイル形式。', ko: '유효하지 않은 번역 파일 형식.' },
  'i18n.resetButton':          { en: 'Reset to Defaults', de: 'Auf Standard zurücksetzen', ru: 'Сбросить к значениям по умолчанию', it: 'Ripristina impostazioni predefinite', es: 'Restablecer valores predeterminados', pt: 'Repor predefinições', ja: 'デフォルトにリセット', ko: '기본값으로 재설정' },
}

/** Get a translated string for a key and locale */
export function t(key: string, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.en ?? key
}

/** Return a deep copy of all translations for JSON export */
export function getTranslations(): Record<string, Record<string, string>> {
  return structuredClone(translations) as Record<string, Record<string, string>>
}

/**
 * Format a file count with correct singular/plural for the media section.
 * e.g. formatFileCount(1, 'en') → '1 FILE AVAILABLE'
 *      formatFileCount(3, 'de') → '3 DATEIEN VERFÜGBAR'
 */
export function formatFileCount(count: number, locale: Locale): string {
  if (locale === 'de') {
    const plural = count !== 1 ? 'EN' : ''
    return `${count} DATEI${plural} VERFÜGBAR // PRESSEMAPPEN · LOGOS · ASSETS`
  }
  const plural = count !== 1 ? 'S' : ''
  return `${count} FILE${plural} AVAILABLE // PRESS KITS · LOGOS · ASSETS`
}
