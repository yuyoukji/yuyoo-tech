/* 誉友科技 手机端底部导航栏 - 首页 / 产品中心 / 公司介绍 / 我的
 * 仅在 4 个 tab 页面注入（按文件名匹配），非 tab 页调用无副作用。
 * 样式定义于 assets/css/app.css，激活态按当前页面文件名判定。
 */
(function () {
  'use strict';

  var TABS = [
    { id: '418843', name: '首页',     icon: '🏠' },
    { id: '419940', name: '产品中心', icon: '📦' },
    { id: '420306', name: '公司介绍', icon: '🏢' },
    { id: '418848', name: '我的',     icon: '👤' }
  ];

  function currentTab() {
    var file = (location.pathname || '').split('/').pop() || '';
    for (var i = 0; i < TABS.length; i++) {
      if (file.indexOf(TABS[i].id) === 0) return TABS[i].id;
    }
    return null;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var active = currentTab();
    if (!active) return;

    var bar = document.createElement('nav');
    bar.className = 'tabbar';
    bar.setAttribute('aria-label', '主导航');
    var html = '';
    TABS.forEach(function (t) {
      var on = t.id === active;
      html += '<a class="tab-item' + (on ? ' active' : '') + '" href="' + t.id + '.html" aria-current="' + (on ? 'page' : 'false') + '">' +
        '<span class="tab-icon">' + t.icon + '</span>' +
        '<span class="tab-label">' + t.name + '</span>' +
        '</a>';
    });
    bar.innerHTML = html;
    document.body.appendChild(bar);
    document.body.classList.add('has-tabbar');
  });
})();