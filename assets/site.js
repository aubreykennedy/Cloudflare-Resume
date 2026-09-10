/* shared helpers: mobile nav, html escaping, api access */
(function () {
  'use strict';
  const btn = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (btn && links) {
    btn.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  window.Site = {
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    // image_key -> URL. Uploaded art lives in R2 behind /art/…, originals in /images/…
    imageUrl(key) { return '/' + String(key).replace(/^\/+/, ''); },
    async getJSON(url) {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    },
  };
})();
