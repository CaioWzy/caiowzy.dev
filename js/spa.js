(function () {
  if (!window.history || !window.history.pushState || !window.fetch) return;

  var isNavigating = false;

  function updateHeaderState(nextDoc) {
    var currentHeader = document.querySelector('.c-header');
    var nextHeader = nextDoc.querySelector('.c-header');
    if (!currentHeader || !nextHeader) return;

    var curLogo = currentHeader.querySelector('.c-logo__link');
    var nextLogo = nextHeader.querySelector('.c-logo__link');
    if (curLogo && nextLogo) {
      curLogo.className = nextLogo.className;
    }

    var curNav = currentHeader.querySelector('.c-nav__link');
    var nextNav = nextHeader.querySelector('.c-nav__link');
    if (curNav && nextNav) {
      curNav.className = nextNav.className;
    }
  }

  function spaNavigate(url, opts) {
    var options = opts || {};
    var targetUrl;
    try {
      targetUrl = new URL(url, window.location.origin);
    } catch (e) {
      window.location.href = url;
      return;
    }

    if (isNavigating) return;
    isNavigating = true;

    fetch(targetUrl.href, { headers: { 'X-Requested-With': 'spa' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var nextDoc = parser.parseFromString(html, 'text/html');
        var nextWrapper = nextDoc.querySelector('.c-off-canvas-container > .o-wrapper');
        var curWrapper = document.querySelector('.c-off-canvas-container > .o-wrapper');

        if (!nextWrapper || !curWrapper) {
          window.location.href = targetUrl.href;
          return;
        }

        curWrapper.replaceWith(nextWrapper);
        document.title = nextDoc.title;
        updateHeaderState(nextDoc);

        if (options.push !== false) {
          window.history.pushState({ url: targetUrl.href }, '', targetUrl.href);
        }

        if (targetUrl.hash) {
          var anchor = document.getElementById(targetUrl.hash.slice(1));
          if (anchor) anchor.scrollIntoView();
          else window.scrollTo(0, 0);
        } else {
          window.scrollTo(0, 0);
        }

        if (window.initPageEnhancements) window.initPageEnhancements();
        if (window.initRadar) window.initRadar();
        if (window.jQuery && window.jQuery.fn && window.jQuery.fn.fitVids) {
          window.jQuery('.o-wrapper').fitVids({ customSelector: ['iframe[src*="ted.com"]'] });
        }
      })
      .catch(function () {
        window.location.href = targetUrl.href;
      })
      .finally(function () {
        isNavigating = false;
      });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    var link = e.target.closest('a');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;

    var url;
    try {
      url = new URL(link.href);
    } catch (err) {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
      return;
    }

    e.preventDefault();
    spaNavigate(url.href, { push: true });
  });

  window.addEventListener('popstate', function () {
    spaNavigate(window.location.href, { push: false });
  });

  window.spaNavigate = spaNavigate;
})();
