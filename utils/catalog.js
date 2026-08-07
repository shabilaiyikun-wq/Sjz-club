const fallback = require('../data.js');
const { get } = require('./request');

let cached = null;

/** API 打手数据补上首字头像装饰（initial/ci），与 data.js 结构一致 */
function decorateBoosters(list) {
  return list.map((b, i) => ({ ...b, initial: b.name[0], ci: i % 4 }));
}
/** API ranks → 前端 {id,t,p} */
function toRanks(list) {
  return list.map((r) => ({ id: r.id, t: r.label, p: r.price }));
}
/** API hours → 前端 {id,t,p,s} */
function toHours(list) {
  return list.map((h) => ({ id: h.id, t: h.label, p: h.price, s: h.tip }));
}
/** 首页套餐卡片，由段位规格派生（保证价格一致） */
function mkPkgs(ranks) {
  return ranks.map((r, i) => ({ t: r.t, p: '¥' + r.p + '起', i: ['🚀', '⚔️', '🔥', '👑'][i] }));
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
      funOrders: d.funOrders,
      ranks,
      hours: toHours(d.hours),
      pkgs: mkPkgs(ranks)
    };
    return cached;
  }).catch(() => {
    cached = {
      boosters: fallback.BOOSTERS,
      funOrders: fallback.FUN_ORDERS,
      ranks: fallback.RANKS_SPEC.map((r, i) => ({ id: i + 1, ...r })),
      hours: fallback.HOURS.map((h, i) => ({ id: i + 1, ...h })),
      pkgs: fallback.PKGS
    };
    return cached;
  });
}

module.exports = { getCatalog };
