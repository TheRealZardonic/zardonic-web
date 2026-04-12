// Restore persisted theme CSS variables before React mounts to prevent
// the default-colour flash on the loading screen. The 'nk-theme-cache'
// key is written by use-app-theme.ts whenever the admin theme is applied.
// This is strictly-necessary functional data; no consent is required.
//
// On first visit (no cache), apply the DIGICE preset as the default theme so
// cold-start visitors see the correct colours from frame 0.
(function() {
  var _root = document.documentElement;

  // Static fallback: the DIGICE preset (matches AppearanceTab.tsx DIGICIDE preset).
  // These values are applied first so every visitor — including first-timers
  // and private-browsing users — never sees a flash of light/blue defaults.
  var _defaults = {
    '--primary':                 'oklch(0.78 0.03 220)',
    '--primary-foreground':      'oklch(0.82 0.03 210)',
    '--accent':                  'oklch(0.65 0.06 215)',
    '--accent-foreground':       'oklch(0.82 0.03 210)',
    '--background':              'oklch(0.015 0.005 240)',
    '--foreground':              'oklch(0.82 0.03 210)',
    '--card':                    'oklch(0.045 0.008 230)',
    '--card-foreground':         'oklch(0.82 0.03 210)',
    '--popover':                 'oklch(0.045 0.008 230)',
    '--popover-foreground':      'oklch(0.82 0.03 210)',
    '--secondary':               'oklch(0.07 0.01 230)',
    '--secondary-foreground':    'oklch(0.82 0.03 210)',
    '--muted':                   'oklch(0.07 0.01 230)',
    '--muted-foreground':        'oklch(0.40 0.02 220)',
    '--border':                  'oklch(0.10 0.01 225)',
    '--input':                   'oklch(0.10 0.01 225)',
    '--ring':                    'oklch(0.78 0.03 220)',
    '--destructive':             'oklch(0.45 0.18 20)',
    '--destructive-foreground':  'oklch(0.82 0.03 210)',
    // Spotify embed accent (primary hue 220° → 220 - 141 = 79deg)
    '--spotify-hue-rotate':      '79deg',
    '--font-heading':            "'Orbitron', sans-serif",
    '--font-body':               "'Share Tech Mono', monospace",
    '--font-mono':               "'Share Tech Mono', monospace",
  };
  var _dk = Object.keys(_defaults);
  for (var _di = 0; _di < _dk.length; _di++) {
    _root.style.setProperty(_dk[_di], _defaults[_dk[_di]]);
  }

  // Override with persisted values from a previous visit (return visitors
  // get their exact admin-configured theme applied atomically).
  try {
    var _t = localStorage.getItem('nk-theme-cache');
    if (_t) {
      var _vars = JSON.parse(_t);
      if (_vars && typeof _vars === 'object') {
        var _keys = Object.keys(_vars);
        for (var _i = 0; _i < _keys.length; _i++) {
          _root.style.setProperty(_keys[_i], _vars[_keys[_i]]);
        }

        // Preload custom Google Fonts as early as possible so fonts are
        // available before React mounts, preventing a Flash of Unstyled Text
        // (FOUT) where the browser briefly renders the fallback font.
        var _systemFonts = new Set([
          'system-ui','ui-monospace','ui-sans-serif','ui-serif',
          'monospace','sans-serif','serif','cursive','fantasy',
          'SFMono-Regular','Menlo','Monaco','Consolas','Courier New',
          'Georgia','Cambria','Times New Roman','Times','Arial',
          'Helvetica Neue','Helvetica','Share Tech Mono','Orbitron'
        ]);
        var _preloadedFonts = new Set();
        var _fontVarKeys = ['--font-body', '--font-heading', '--font-mono'];
        for (var _fi = 0; _fi < _fontVarKeys.length; _fi++) {
          var _fv = _vars[_fontVarKeys[_fi]];
          if (!_fv) continue;
          // Extract the first font name from a CSS font stack like "'Rajdhani', sans-serif"
          var _fname = _fv.replace(/['"]/g, '').split(',')[0].trim();
          if (!_fname || _systemFonts.has(_fname) || _preloadedFonts.has(_fname)) continue;
          _preloadedFonts.add(_fname);
          var _link = document.createElement('link');
          _link.rel = 'stylesheet';
          _link.href = 'https://fonts.googleapis.com/css2?family=' + _fname.replace(/ /g, '+') + ':wght@300;400;500;700;900&display=swap';
          document.head.appendChild(_link);
        }
      }
    }
  } catch(e) { /* ignore – private browsing or parse error */ }
})();

// Restore the loader type so the correct loading screen variant renders
// from the very first React frame, preventing a flash of the default loader.
// The 'nk-loader-type' key is written by App.tsx when KV settings arrive.
// Default to 'minimal-bar' when no persisted value exists (lightweight, no FOUC).
try {
  var _lt = localStorage.getItem('nk-loader-type') ?? 'minimal-bar';
  document.documentElement.setAttribute('data-loader-type', _lt);
} catch(e) { /* ignore */ }
