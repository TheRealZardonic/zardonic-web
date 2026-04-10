// Restore persisted theme CSS variables before React mounts to prevent
// the default-colour flash on the loading screen. The 'nk-theme-cache'
// key is written by use-app-theme.ts whenever the admin theme is applied.
// This is strictly-necessary functional data; no consent is required.
try {
  var _t = localStorage.getItem('nk-theme-cache');
  if (_t) {
    var _vars = JSON.parse(_t);
    if (_vars && typeof _vars === 'object') {
      var _root = document.documentElement;
      var _keys = Object.keys(_vars);
      for (var _i = 0; _i < _keys.length; _i++) {
        _root.style.setProperty(_keys[_i], _vars[_keys[_i]]);
      }
    }
  }
} catch(e) { /* ignore – private browsing or parse error */ }

// Restore the loader type so the correct loading screen variant renders
// from the very first React frame, preventing a flash of the default loader.
// The 'nk-loader-type' key is written by App.tsx when KV settings arrive.
try {
  var _lt = localStorage.getItem('nk-loader-type');
  if (_lt) {
    document.documentElement.setAttribute('data-loader-type', _lt);
  }
} catch(e) { /* ignore */ }
