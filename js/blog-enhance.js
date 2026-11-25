/* ==========================================================================
   Lightweight Blog Enhancements for Hexo Butterfly 5.3.5
   - Smooth reading progress bar on post pages
   - Keyboard search shortcut (Ctrl/Cmd+K and '/')
   - Accessible Dark/Light theme quick toggle in top navbar
   - One-click Copy Article Link button with toast feedback
   - Active navigation item highlight
   Compatible with both normal page loads and PJAX navigation.
   ========================================================================== */

(function () {
  'use strict';

  var TOAST_ID = 'blog-toast';
  var PROGRESS_ID = 'blog-reading-progress';
  var THEME_BTN_ID = 'nav-theme-toggle';
  var toastTimer = null;
  var progressCleanup = null;

  var ICON_SUN =
    '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>' +
    '</svg>';

  var ICON_MOON =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
    '</svg>';

  var ICON_LINK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>' +
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>' +
    '</svg>';

  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="20 6 9 17 4 12"></polyline>' +
    '</svg>';

  function showToast(message) {
    var toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-show');
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('Copy command failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  /* 1. Smooth Reading Progress Bar (Post pages only) */
  function initReadingProgress() {
    if (progressCleanup) {
      progressCleanup();
      progressCleanup = null;
    }

    var existing = document.getElementById(PROGRESS_ID);
    var isPost =
      document.getElementById('body-wrap') &&
      document.getElementById('body-wrap').classList.contains('post') &&
      document.getElementById('article-container');

    if (!isPost) {
      if (existing) existing.remove();
      return;
    }

    var bar = existing;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = PROGRESS_ID;
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var article = document.getElementById('article-container');
    var ticking = false;

    function updateProgress() {
      ticking = false;
      var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      var articleRect = article.getBoundingClientRect();
      var articleTop = articleRect.top + scrollTop;
      var articleHeight = article.offsetHeight;
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var scrollable = Math.max(1, articleHeight - viewportH * 0.45);
      var raw = (scrollTop - (articleTop - 80)) / scrollable;
      var ratio = Math.max(0, Math.min(1, raw));

      bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      if (scrollTop > 40) {
        bar.classList.add('is-visible');
      } else {
        bar.classList.remove('is-visible');
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateProgress);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateProgress();

    progressCleanup = function () {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }

  /* 2. Accessible Dark / Light Mode Quick Toggle in Navbar */
  function syncThemeButton(btn) {
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    var label = isDark ? '切换为浅色模式' : '切换为深色模式';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function triggerThemeToggle() {
    var nativeBtn = document.getElementById('darkmode');
    if (nativeBtn) {
      nativeBtn.click();
      return;
    }
    var willDark = document.documentElement.getAttribute('data-theme') !== 'dark';
    if (window.btf) {
      if (willDark && typeof window.btf.activateDarkMode === 'function') {
        window.btf.activateDarkMode();
      } else if (!willDark && typeof window.btf.activateLightMode === 'function') {
        window.btf.activateLightMode();
      }
      if (window.btf.saveToLocal && typeof window.btf.saveToLocal.set === 'function') {
        window.btf.saveToLocal.set('theme', willDark ? 'dark' : 'light', 2);
      }
    } else {
      document.documentElement.setAttribute('data-theme', willDark ? 'dark' : 'light');
    }
  }

  function initNavbarThemeToggle() {
    var menus = document.getElementById('menus');
    if (!menus) return;

    var btn = document.getElementById(THEME_BTN_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = THEME_BTN_ID;
      btn.type = 'button';
      btn.innerHTML = ICON_SUN + ICON_MOON;
      btn.addEventListener('click', function () {
        triggerThemeToggle();
        syncThemeButton(btn);
      });

      var toggleMenu = document.getElementById('toggle-menu');
      if (toggleMenu && toggleMenu.parentNode === menus) {
        menus.insertBefore(btn, toggleMenu);
      } else {
        menus.appendChild(btn);
      }
    }
    syncThemeButton(btn);
  }

  /* 3. Search Shortcut Hint + Ctrl/Cmd+K & '/' Keybinding */
  function initSearchShortcutHint() {
    var searchTrigger = document.querySelector('#search-button > .search');
    if (!searchTrigger || searchTrigger.querySelector('.nav-search-kbd')) return;

    var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
    var kbd = document.createElement('kbd');
    kbd.className = 'nav-search-kbd';
    kbd.textContent = isMac ? '⌘K' : 'Ctrl K';
    searchTrigger.appendChild(kbd);
  }

  function isEditableTarget(el) {
    if (!el) return false;
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      el.isContentEditable
    );
  }

  function toggleLocalSearch() {
    var dialog = document.querySelector('#local-search .search-dialog');
    var isOpen = dialog && window.getComputedStyle(dialog).display !== 'none';
    if (isOpen) {
      var closeBtn = document.querySelector('#local-search .search-close-button');
      if (closeBtn) closeBtn.click();
      return;
    }
    var trigger =
      document.querySelector('#search-button > .search') ||
      document.getElementById('search-button');
    if (trigger) trigger.click();
  }

  function bindGlobalKeyShortcuts() {
    if (window.__blogEnhanceKeysBound) return;
    window.__blogEnhanceKeysBound = true;

    document.addEventListener('keydown', function (e) {
      var key = (e.key || '').toLowerCase();

      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && !e.altKey && key === 'k') {
        var trigger = document.querySelector('#search-button > .search');
        if (!trigger) return;
        e.preventDefault();
        toggleLocalSearch();
        return;
      }

      // '/' when not typing in an editable element
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isEditableTarget(document.activeElement)
      ) {
        var dialog = document.querySelector('#local-search .search-dialog');
        var isOpen = dialog && window.getComputedStyle(dialog).display !== 'none';
        var searchTrigger = document.querySelector('#search-button > .search');
        if (!isOpen && searchTrigger) {
          e.preventDefault();
          searchTrigger.click();
        }
      }
    });
  }

  /* 4. One-Click Copy Article Link Button */
  function createCopyLinkButton(extraClass) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'blog-copy-link-btn' + (extraClass ? ' ' + extraClass : '');
    btn.setAttribute('aria-label', '复制本文链接');
    btn.innerHTML = ICON_LINK + '<span>复制链接</span>';

    var resetTimer = null;
    btn.addEventListener('click', function () {
      var url = window.location.href.split('#')[0];
      copyText(url).then(
        function () {
          btn.classList.add('is-copied');
          btn.innerHTML = ICON_CHECK + '<span>已复制</span>';
          showToast('已复制文章链接');
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.innerHTML = ICON_LINK + '<span>复制链接</span>';
          }, 2000);
        },
        function () {
          showToast('复制失败，请手动复制地址栏链接');
        }
      );
    });

    return btn;
  }

  function initCopyLinkButtons() {
    var bodyWrap = document.getElementById('body-wrap');
    if (!bodyWrap || !bodyWrap.classList.contains('post')) return;

    // Footer tag_share bar
    var tagShare = document.querySelector('#post .tag_share');
    if (tagShare && !tagShare.querySelector('.blog-copy-link-btn')) {
      tagShare.appendChild(createCopyLinkButton('blog-copy-link-btn--footer'));
    }

    // Header post-meta strip
    var postMeta = document.querySelector('#post-info #post-meta');
    if (postMeta && !postMeta.querySelector('.blog-copy-link-btn')) {
      postMeta.appendChild(createCopyLinkButton('blog-copy-link-btn--meta'));
    }
  }

  /* 5. Active Navigation Route Highlight */
  function initActiveNavLink() {
    var path = window.location.pathname || '/';
    var links = document.querySelectorAll('#nav .menus_item > a.site-page');
    links.forEach(function (link) {
      link.classList.remove('is-active');
      var href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;
      var normalizedHref = href.endsWith('/') ? href : href + '/';
      var normalizedPath = path.endsWith('/') ? path : path + '/';
      if (normalizedHref === '/') {
        if (normalizedPath === '/' || /^\/page\/\d+\/$/.test(normalizedPath)) {
          link.classList.add('is-active');
        }
      } else if (normalizedPath.indexOf(normalizedHref) === 0) {
        link.classList.add('is-active');
      }
    });
  }

  /* Watch data-theme attribute mutations so navbar toggle stays synced */
  function observeThemeAttribute() {
    if (window.__blogEnhanceThemeObserver) return;
    window.__blogEnhanceThemeObserver = new MutationObserver(function () {
      syncThemeButton(document.getElementById(THEME_BTN_ID));
    });
    window.__blogEnhanceThemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  function initAll() {
    initNavbarThemeToggle();
    initSearchShortcutHint();
    initActiveNavLink();
    initReadingProgress();
    initCopyLinkButtons();
    bindGlobalKeyShortcuts();
    observeThemeAttribute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.addEventListener('pjax:complete', initAll);
})();
