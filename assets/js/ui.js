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

  // 页面加载完成后注入切换按钮
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', '切换夜间模式');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
    document.body.appendChild(btn);
  });
})();
