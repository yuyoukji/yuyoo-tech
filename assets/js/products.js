// H5 数据入口 - 从共享层取数，暴露既有全局变量（页面无需改动）
// 依赖：本文件前需先引入 <script src="../shared/data.js">（浏览器端会挂 window.YUYOO_SHARED）
(function () {
  var shared = (typeof module !== 'undefined' && module.exports)
    ? require('../../shared/data.js')
    : window.YUYOO_SHARED;

  if (!shared) {
    console.error('[誉友] shared/data.js 未加载，请在本文件前引入 ../shared/data.js');
    return;
  }

  // H5 页面在 pages/ 子目录，图片前缀回到站点根
  shared.setImgPrefix('../assets/img/products/');

  // 展开为既有全局变量，保持页面兼容
  window.YUYOO_IMG_BASE = '../assets/img/products/';
  window.YUYOO_CATEGORIES = shared.getCategories();
  window.YUYOO_PRODUCTS = shared.getProducts();
  window.YUYOO_BANNERS = shared.getBanners();
  window.YUYOO_getProductById = shared.getProductById;
  window.YUYOO_getByCategory = shared.getByCategory;
})();

// 产品图片加载失败兜底：返回品牌 SVG 占位图（多个页面 onerror 均引用本函数）
window.yuyooProductImage = function (name) {
  var safe = String(name || '产品图片').replace(/[<>&"]/g, '');
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">' +
    '<rect width="640" height="360" fill="#f0f1f3"/>' +
    '<rect width="640" height="5" fill="#ff7a18"/>' +
    '<text x="320" y="168" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="30" text-anchor="middle">💻</text>' +
    '<text x="320" y="208" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="16" fill="#8a93a0" text-anchor="middle">' + safe + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};
