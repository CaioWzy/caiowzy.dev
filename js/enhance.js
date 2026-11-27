(function () {
  function initPageEnhancements() {
    var contents = document.querySelectorAll('.c-content');
    if (!contents.length) return;

    contents.forEach(function (container) {
      // Copy buttons for code blocks
      container.querySelectorAll('pre').forEach(function (pre) {
        var code = pre.querySelector('code');
        var target = pre.closest('.highlighter-rouge') || pre;
        if (target.querySelector('.c-copy-btn')) return;

        target.classList.add('c-code-wrap');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'c-copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        btn.textContent = 'copy';

        btn.addEventListener('click', function () {
          var text = (code || pre).innerText;
          if (!navigator.clipboard) return;
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = 'copied';
            btn.classList.add('is-copied');
            setTimeout(function () {
              btn.textContent = 'copy';
              btn.classList.remove('is-copied');
            }, 1500);
          });
        });

        target.appendChild(btn);
      });

      // Anchor links for headings with IDs
      container.querySelectorAll('h2[id], h3[id], h4[id]').forEach(function (heading) {
        if (heading.querySelector('.c-heading-anchor')) return;
        var anchor = document.createElement('a');
        anchor.className = 'c-heading-anchor';
        anchor.href = '#' + heading.id;
        anchor.setAttribute('aria-label', 'Link to ' + heading.textContent.trim());
        anchor.textContent = '#';
        heading.appendChild(anchor);
      });
    });
  }

  window.initPageEnhancements = initPageEnhancements;
  initPageEnhancements();
})();
