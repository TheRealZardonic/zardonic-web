// Restore persisted theme CSS variables before React mounts to prevent
// the default-colour flash on the loading screen. The 'nk-theme-cache'
// key is written by use-app-theme.ts whenever the admin theme is applied.
// This is strictly-necessary functional data; no consent is required.
//
// On first visit (no cache), apply the site's default dark theme so even
// cold-start visitors see the correct colours from frame 0.
(function() {
  var _root = document.documentElement;

  // Static fallback: the site's default dark oklch theme (matches the
  // "Neon Red" preset in ThemeCustomizerDialog and use-app-theme.ts).
  // These values are applied first so every visitor — including first-timers
  // and private-browsing users — never sees a flash of light/blue defaults.
  var _defaults = {
    '--primary':                 'oklch(0.50 0.22 25)',
    '--primary-foreground':      'oklch(0.98 0 0)',
    '--accent':                  'oklch(0.60 0.24 25)',
    '--accent-foreground':       'oklch(0.98 0 0)',
    '--background':              'oklch(0.05 0 0)',
    '--foreground':              'oklch(0.95 0 0)',
    '--card':                    'oklch(0.08 0 0)',
    '--card-foreground':         'oklch(0.95 0 0)',
    '--popover':                 'oklch(0.08 0 0)',
    '--popover-foreground':      'oklch(0.95 0 0)',
    '--secondary':               'oklch(0.15 0 0)',
    '--secondary-foreground':    'oklch(0.95 0 0)',
    '--muted':                   'oklch(0.12 0 0)',
    '--muted-foreground':        'oklch(0.55 0 0)',
    '--border':                  'oklch(0.20 0 0)',
    '--input':                   'oklch(0.20 0 0)',
    '--ring':                    'oklch(0.50 0.22 25)',
    '--destructive':             'oklch(0.55 0.22 25)',
    '--destructive-foreground':  'oklch(0.98 0 0)',
    // Spotify embed accent (primary hue 25° → 25 - 141 = -116deg)
    '--spotify-hue-rotate':      '-116deg',
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
      }
    }
  } catch(e) { /* ignore – private browsing or parse error */ }
})();

// Restore the loader type so the correct loading screen variant renders
// from the very first React frame, preventing a flash of the default loader.
// The 'nk-loader-type' key is written by App.tsx when KV settings arrive.
try {
  var _lt = localStorage.getItem('nk-loader-type');
  if (_lt) {
    document.documentElement.setAttribute('data-loader-type', _lt);
  }
} catch(e) { /* ignore */ }
