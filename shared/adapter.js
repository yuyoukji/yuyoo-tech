// 誉友科技 - 跨平台适配器（抹平 H5 与小程序 API 差异）
// H5 页面通过 <script src="../shared/adapter.js"> 引入，小程序通过 require 引入

var isMini = (typeof wx !== 'undefined') && !!wx.setStorageSync;

var adapter = {
  isMiniProgram: isMini,

  // 存储
  getStorage: function(key, def) {
    var v = isMini ? wx.getStorageSync(key) : (window.localStorage ? window.localStorage.getItem(key) : null);
    if (v === '' || v === null || v === undefined) return def !== undefined ? def : null;
    if (isMini) return v;
    try { return JSON.parse(v); } catch (e) { return v; }
  },
  setStorage: function(key, value) {
    if (isMini) { wx.setStorageSync(key, value); }
    else if (window.localStorage) { window.localStorage.setItem(key, JSON.stringify(value)); }
  },
  removeStorage: function(key) {
    if (isMini) { wx.removeStorageSync(key); }
    else if (window.localStorage) { window.localStorage.removeItem(key); }
  },

  // 导航
  navigateTo: function(url) {
    if (isMini) { wx.navigateTo({ url: url }); }
    else { window.location.href = url; }
  },
  switchTab: function(url) {
    if (isMini) { wx.switchTab({ url: url }); }
    else {
      // H5 预览器：tab 页映射到 index.html 的 hash
      var map = { '/pages/home/home':'home','/pages/category/category':'category','/pages/company/company':'company','/pages/mine/mine':'mine' };
      window.location.href = 'index.html#' + (map[url] || url);
    }
  },
  navigateBack: function() {
    if (isMini) { wx.navigateBack({ delta: 1 }); }
    else { window.history.back(); }
  },

  // 提示
  toast: function(title, icon) {
    if (isMini) { wx.showToast({ title: title || '', icon: icon || 'none', duration: 1500 }); }
    else {
      var el = document.getElementById('yy-toast');
      if (!el) {
        el = document.createElement('div'); el.id = 'yy-toast';
        el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:16px 28px;border-radius:12px;font-size:15px;z-index:9999;transition:opacity 0.3s;';
        document.body.appendChild(el);
      }
      el.textContent = title; el.style.opacity = '1';
      setTimeout(function(){ el.style.opacity = '0'; }, 1500);
    }
  },

  // 登录态
  getUser: function() { return this.getStorage('yuyoo_user', null); },
  setUser: function(u) { this.setStorage('yuyoo_user', u); },
  clearUser: function() { this.removeStorage('yuyoo_user'); },

  // 收藏
  getFavs: function() { return this.getStorage('yuyoo_favs', []); },
  setFavs: function(a) { this.setStorage('yuyoo_favs', a); },
  isFav: function(id) { return this.getFavs().some(function(f){ return f.id === id; }); },
  toggleFav: function(p) {
    var favs = this.getFavs();
    var idx = favs.findIndex(function(f){ return f.id === p.id; });
    if (idx > -1) { favs.splice(idx, 1); } else { favs.unshift(p); }
    this.setFavs(favs);
    return idx === -1;
  },

  // 工具
  maskPhone: function(p) { return p && p.length === 11 ? p.slice(0,3) + '****' + p.slice(7) : p; }
};

// CommonJS 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = adapter;
}
// H5 全局暴露
if (typeof window !== 'undefined') {
  window.YYAdapter = adapter;
}
