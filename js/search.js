(function () {
  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var triggers = document.querySelectorAll('[data-search-open]');
  if (!modal || !input || !resultsEl) return;

  var indexData = null;
  var activeIdx = -1;
  var searchUrl = modal.getAttribute('data-search-url') || '/search.json';

  function loadIndex(cb) {
    if (indexData) return cb(indexData);
    fetch(searchUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        indexData = data;
        cb(indexData);
      })
      .catch(function () {
        indexData = [];
        cb(indexData);
      });
  }

  function openSearch() {
    modal.hidden = false;
    input.value = '';
    activeIdx = -1;
    loadIndex(function () {
      renderResults('');
    });
    setTimeout(function () { input.focus(); }, 0);
  }

  function closeSearch() {
    modal.hidden = true;
    activeIdx = -1;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderResults(query) {
    if (!indexData) return;
    var q = query.trim().toLowerCase();
    var matches = !q
      ? indexData.slice(0, 8)
      : indexData.filter(function (item) {
          var haystack = [
            item.title || '',
            (item.tags || []).join(' '),
            item.radar || '',
            item.excerpt || ''
          ].join(' ').toLowerCase();
          return haystack.indexOf(q) !== -1;
        }).slice(0, 10);

    if (matches.length === 0) {
      resultsEl.innerHTML = "<li class='c-search__empty'>No results found.</li>";
      activeIdx = -1;
      return;
    }

    activeIdx = 0;
    resultsEl.innerHTML = matches.map(function (item, idx) {
      var meta = item.radar || item.date || item.excerpt || '';
      return (
        "<li class='c-search__item" + (idx === 0 ? " is-active" : "") + "' role='option'>" +
          "<a class='c-search__link' href='" + escapeHtml(item.url) + "'>" +
            "<span class='c-search__title'>" + escapeHtml(item.title) + "</span>" +
            (meta ? "<span class='c-search__meta'>" + escapeHtml(meta) + "</span>" : "") +
          "</a>" +
        "</li>"
      );
    }).join('');
  }

  function setActive(newIdx) {
    var items = resultsEl.querySelectorAll('.c-search__item');
    if (!items.length) return;
    activeIdx = (newIdx + items.length) % items.length;
    items.forEach(function (el, idx) {
      el.classList.toggle('is-active', idx === activeIdx);
    });
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  triggers.forEach(function (btn) {
    btn.addEventListener('click', openSearch);
  });

  modal.querySelectorAll('[data-search-close]').forEach(function (el) {
    el.addEventListener('click', closeSearch);
  });

  input.addEventListener('input', function () {
    renderResults(input.value);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(activeIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIdx - 1);
    } else if (e.key === 'Enter') {
      var activeLink = resultsEl.querySelector('.c-search__item.is-active .c-search__link');
      if (activeLink) {
        e.preventDefault();
        window.location.href = activeLink.getAttribute('href');
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    var isTyping = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);

    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      closeSearch();
      return;
    }

    if ((e.key === '/' && !isTyping) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      if (modal.hidden) openSearch();
      else closeSearch();
    }
  });
})();
