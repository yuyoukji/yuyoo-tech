// 誉友科技 - 共享产品数据层（H5 / 小程序 双端单一来源）
// 图片路径：小程序用 /assets/...，H5 页面在子目录用 ../assets/...
// 通过 IMG_PREFIX 环境区分，默认小程序绝对路径

var IMG_PREFIX = '/assets/img/products/';

function setImgPrefix(p) { IMG_PREFIX = p; }
function img(name) { return IMG_PREFIX + name; }

var CATEGORIES = [
  { id: 'dev',   name: '软件开发' },
  { id: 'app',   name: 'APP开发' },
  { id: 'weapp', name: '小程序' },
  { id: 'cloud', name: '云服务' },
  { id: 'data',  name: '数据服务' },
  { id: 'ops',   name: '运维支持' }
];

var PRODUCTS = [
  { id:'yy-erp',   name:'誉友ERP管理系统', slogan:'企业资源 一体化管理', category:'dev',   image:'dev.jpg',      imgSize:'1120x640', imgFormat:'JPEG', imgSizeKB:147, bgReady:true, desc:'进销存+财务+生产一体化企业管理系统' },
  { id:'yy-crm',   name:'誉友CRM客户系统', slogan:'客户管理 销售提效',   category:'dev',   image:'software.jpg', imgSize:'1120x640', imgFormat:'JPEG', imgSizeKB:172, bgReady:true, desc:'客户跟进、订单管理、数据分析全流程' },
  { id:'yy-weapp', name:'微信小程序开发', slogan:'轻量触达 即用即走',   category:'weapp', image:'weapp.jpg',    imgSize:'1120x640', imgFormat:'JPEG', imgSizeKB:146, bgReady:true, desc:'电商/展示/预约类小程序定制开发' },
  { id:'yy-app',   name:'移动APP开发',    slogan:'原生体验 跨端兼容',   category:'app',   image:'app.jpg',      imgSize:'1120x640', imgFormat:'JPEG', imgSizeKB:170, bgReady:true, desc:'iOS/Android 原生与跨端方案' },
  { id:'yy-cloud', name:'云服务器部署',   slogan:'弹性扩容 稳定可靠',   category:'cloud', image:'cloud.jpg',    imgSize:'1120x640', imgFormat:'JPEG', imgSizeKB:120, bgReady:true, desc:'上云架构设计+部署+运维托管' }
];

var BANNERS = [
  { image:'banner-code.jpg',   title:'数字化转型 赋能企业', sub:'软件开发 云服务 数据驱动' },
  { image:'banner-cloud.jpg',  title:'誉友ERP 管理提效',    sub:'进销存+财务 一体化方案' },
  { image:'banner-mobile.jpg', title:'小程序·APP定制',     sub:'轻量触达 即用即走' }
];

function getProducts() {
  return PRODUCTS.map(function(p){ return Object.assign({}, p, { image: img(p.image) }); });
}
function getCategories() { return CATEGORIES.slice(); }
function getBanners() {
  return BANNERS.map(function(b){ return Object.assign({}, b, { image: img(b.image) }); });
}
function getProductById(id) {
  return getProducts().find(function(p){ return p.id === id; }) || null;
}
function getByCategory(catId) {
  return catId === 'all' ? getProducts() : getProducts().filter(function(p){ return p.category === catId; });
}

// 商品详情扩展参数（亮点 / 技术栈 / 行业实践），与 H5 详情页保持一致
var DETAILS = {
  'yy-erp': {
    highlights: ['进销存一体化：采购、销售、库存数据实时同步', '财务协同：业务单据自动生成财务凭证，对账高效', '数据报表：多维度经营分析，决策有据可依'],
    specs: [['后端架构','Spring Boot + MyBatis Plus'],['前端框架','Vue 3 + Element Plus'],['数据库','MySQL 8.0 + Redis'],['部署方式','Docker + Nginx 容器化'],['接口规范','RESTful API + JWT 鉴权']],
    desc: '誉友ERP采用前后端分离架构，支持私有化部署与 SaaS 云端两种模式，内置权限管理、审批流引擎与开放 API，可灵活对接第三方系统。',
    practice: [['适用行业','制造业、贸易、零售连锁'],['典型案例','某制造企业：库存周转率提升 35%'],['交付方式','源码交付 / SaaS 订阅'],['售后服务','一年免费维护，终身技术支持']]
  },
  'yy-crm': {
    highlights: ['客户全景视图：客户信息、跟进记录、合同订单一页统览', '销售流程管理：线索-商机-跟进-成交全流程可视化', '数据洞察：销售漏斗、业绩排行、复购分析智能报表'],
    specs: [['后端架构','Spring Boot + MyBatis Plus'],['前端框架','Vue 3 + Element Plus'],['数据库','MySQL 8.0 + Redis'],['部署方式','Docker + Nginx 容器化'],['接口规范','RESTful API + JWT 鉴权']],
    desc: '誉友CRM采用前后端分离架构，支持移动端协同办公，内置客户分群、跟进提醒、目标管理等功能，帮助销售团队高效转化每一笔商机。',
    practice: [['适用行业','制造、零售、SaaS 服务'],['典型案例','某贸易公司：线索转化率提升 28%'],['交付方式','私有化部署 / SaaS 订阅'],['售后服务','一年免费维护，终身技术支持']]
  },
  'yy-weapp': {
    highlights: ['行业模板：电商、预约、展示类模板开箱即用', '自定义配置：品牌配色、页面模块灵活配置', '全流程服务：设计-开发-审核-上线一站式交付'],
    specs: [['开发框架','原生 WXML / Taro 跨端'],['后端服务','Java / Node.js 微服务'],['数据存储','MySQL + Redis'],['部署方式','微信云托管 / 自有服务器'],['集成能力','微信支付、订阅消息、开放数据']],
    desc: '覆盖微信生态全链路能力，支持电商、预约、展示等主流场景，最快 1 天完成模板上线，定制开发提供源码交付。',
    practice: [['适用行业','零售、服务、教育、餐饮'],['典型案例','某连锁门店：预约小程序上线 3 个月覆盖 2 万用户'],['交付方式','模板 / 源码定制'],['售后服务','一年免费维护，终身技术支持']]
  },
  'yy-app': {
    highlights: ['原生体验：iOS / Android 原生双端开发', '跨端方案：Flutter / uni-app 一套代码多端运行', '全流程交付：UI 设计-开发-测试-上架应用商店'],
    specs: [['开发语言','Swift / Kotlin、Dart'],['跨端框架','Flutter / uni-app'],['后端接口','RESTful API'],['数据存储','MySQL + Redis + 对象存储'],['部署方式','应用商店 + 自有服务器']],
    desc: '提供原生与跨端两种开发方案，覆盖电商、社交、工具等多类应用场景，严格遵循应用商店规范，助力产品快速上线。',
    practice: [['适用行业','电商、社交、工具类'],['典型案例','某零售品牌：APP 上线 6 个月日活突破 5 万'],['交付方式','源码交付'],['售后服务','一年免费维护，终身技术支持']]
  },
  'yy-cloud': {
    highlights: ['架构设计：上云架构规划与高可用方案设计', '安全加固：等保安全、数据备份与容灾演练', '运维托管：7x24 小时监控与故障快速响应'],
    specs: [['云平台','阿里云 / 腾讯云 / 华为云'],['容器方案','Docker + K8s'],['监控体系','Prometheus + Grafana'],['安全防护','WAF + DDoS 防护 + 数据加密'],['部署方式','一键编排 / 灰度发布']],
    desc: '提供从云架构设计、迁移上云到运维托管的完整服务，涵盖容器化、自动化监控与安全加固，保障业务稳定在线。',
    practice: [['适用行业','互联网、制造、政企客户'],['典型案例','某政企项目：系统可用性达 99.99%'],['交付方式','项目制交付'],['售后服务','7x24 运维支持']]
  }
};
function getDetail(id) { return DETAILS[id] || null; }

// CommonJS 导出（小程序 require 与 H5 同步脚本均兼容）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, PRODUCTS, BANNERS, DETAILS, setImgPrefix, img, getProducts, getCategories, getBanners, getProductById, getByCategory, getDetail };
}

// H5 浏览器端全局暴露（assets/js/products.js 依赖 window.YUYOO_SHARED 取数）
if (typeof window !== 'undefined' && !window.YUYOO_SHARED) {
  window.YUYOO_SHARED = {
    CATEGORIES: CATEGORIES,
    PRODUCTS: PRODUCTS,
    BANNERS: BANNERS,
    DETAILS: DETAILS,
    setImgPrefix: setImgPrefix,
    img: img,
    getProducts: getProducts,
    getCategories: getCategories,
    getBanners: getBanners,
    getProductById: getProductById,
    getByCategory: getByCategory,
    getDetail: getDetail
  };
}
