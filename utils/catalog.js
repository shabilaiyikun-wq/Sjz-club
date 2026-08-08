const fallback = require('../data.js');
const { get } = require('./request');
const { API_BASE } = require('./config');

let cached = null;

/** 图片路径补全绝对 URL（小程序 image 需要完整 URL） */
function fixImg(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return API_BASE + path;
}
/** 遍历 funOrders 把 image 路径补全 */
function fixFunImages(list) {
  return list.map((f) => ({ ...f, image: fixImg(f.image) }));
}

/** API 打手数据补上首字头像装饰（initial/ci），与 data.js 结构一致；头像路径补全，空则用默认图 */
function decorateBoosters(list) {
  const defaultAvatar = fixImg('/images/fun-banner.jpg');
  return list.map((b, i) => ({ ...b, initial: b.name[0], ci: i % 4, avatar: fixImg(b.avatar) || defaultAvatar }));
}
/** API ranks → 前端 {id,t,p} */
function toRanks(list) {
  return list.map((r) => ({ id: r.id, t: r.label, p: r.price }));
}
/** API hours → 前端 {id,t,p,s} */
function toHours(list) {
  return list.map((h) => ({ id: h.id, t: h.label, p: h.price, s: h.tip }));
}
/**
 * 商品目录：GET /api/products 优先，失败时离线兜底到 data.js。
 * 结果全局缓存（getCatalog 幂等，detail 页复用不再重复请求）。
 */
function getCatalog() {
  if (cached) return Promise.resolve(cached);

  return get('/api/products').then((d) => {
    const ranks = toRanks(d.ranks);
    cached = {
      boosters: decorateBoosters(d.boosters),
      funOrders: fixFunImages(d.funOrders),
      ranks,
      hours: toHours(d.hours)
    };
    return cached;
  }).catch(() => {
    cached = {
      boosters: [],
      funOrders: fixFunImages(fallback.FUN_ORDERS.map((f) => ({ ...f, buy_limit: f.limit || null }))),
      ranks: fallback.RANKS_SPEC.map((r, i) => ({ id: i + 1, ...r })),
      hours: fallback.HOURS.map((h, i) => ({ id: i + 1, ...h }))
    };
    return cached;
  });
}

module.exports = { getCatalog };
