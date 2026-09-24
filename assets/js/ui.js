/* 誉友科技 全站交互脚本 - 夜间模式 + 全局体验 */
(function() {
  'use strict';

  var THEME_KEY = 'yuyoo_theme';

  // 读取主题设置：跟随系统 / 浅色 / 深色
  function getTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
  }

  // 初始化主题
  applyTheme(getTheme());

  // 监听系统主题变化
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener || mq.addListener).call(mq, 'change', function() {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(getTheme());
    });
  }

  // 页面加载完成后注入切换按钮（支持点击切换主题 + 拖拽移动位置）
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', '切换夜间模式');
    btn.setAttribute('title', '点击切换主题，拖动可移动位置');
    document.body.appendChild(btn);

    var POS_KEY = 'yuyoo_setting_theme_pos';
    var dragging = false;
    var moved = false;
    var startX = 0, startY = 0, baseX = 0, baseY = 0;

    function setBtnPos(x, y) {
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }

    // 恢复上次保存的按钮位置
    try {
      var saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        setBtnPos(saved.x, saved.y);
      }
    } catch (e) {}

    // 点击切换主题（拖拽后不触发）
    btn.addEventListener('click', function() {
      if (moved) { moved = false; return; }
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });

    // 拖拽移动
    btn.addEventListener('pointerdown', function(e) {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = btn.getBoundingClientRect();
      baseX = rect.left;
      baseY = rect.top;
      btn.classList.add('dragging');
      if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch (err) {} }
      e.preventDefault();
    });

    btn.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      var x = baseX + dx;
      var y = baseY + dy;
      var w = btn.offsetWidth, h = btn.offsetHeight;
      x = Math.max(4, Math.min(x, window.innerWidth - w - 4));
      y = Math.max(4, Math.min(y, window.innerHeight - h - 4));
      setBtnPos(x, y);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove('dragging');
      var rect = btn.getBoundingClientRect();
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(rect.left), y: Math.round(rect.top) }));
      } catch (e) {}
    }
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);
  });
})();
