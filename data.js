/* ================= 全站共享数据 ================= */

/* 下单规格：目标段位 / 时长 */
const RANKS_SPEC = [
  { t: '青铜→白金', p: 99 },
  { t: '白金→钻石', p: 188 },
  { t: '钻石→大师', p: 288 },
  { t: '大师→战神', p: 428 }
];

/* 趣味单 / 种类单：源自俱乐部报价单，按「体验区/常规区/赌约区/赌红区」分区，明码标价、保底到手 */
const FUN_IMG = '/images/fun-banner.jpg';
const FUN_ORDERS = [
  { id: 1, name: '66保888w', price: 66, sub: '体验区 · 每人限一次', category: '体验区', limit: 'once',
    desc: '66元保底888万金币，每人限购一次，先付后赔', tags: ['体验', '保底'], image: FUN_IMG },
  { id: 2, name: '88保888w', price: 88, sub: '体验区 · 每周一次', category: '体验区', limit: 'weekly',
    desc: '88元保底888万金币，每周限一次', tags: ['体验', '保底'], image: FUN_IMG },
  { id: 3, name: '108保1200w', price: 108, sub: '体验区 · 每人限一次', category: '体验区', limit: 'once',
    desc: '108元保底1200万金币，每人限购一次', tags: ['体验', '保底'], image: FUN_IMG },
  { id: 4, name: '158保1400w', price: 158, sub: '体验区 · 每周一次', category: '体验区', limit: 'weekly',
    desc: '158元保底1400万金币，每周限一次', tags: ['体验', '保底'], image: FUN_IMG },

  { id: 5, name: '66保666w', price: 66, sub: '常规区 · 金币保底', category: '常规区',
    desc: '66元保底666万金币，随到随发', tags: ['保底', '热门'], image: FUN_IMG },
  { id: 6, name: '99保988w', price: 99, sub: '常规区 · 金币保底', category: '常规区',
    desc: '99元保底988万金币，随到随发', tags: ['保底'], image: FUN_IMG },
  { id: 7, name: '148保1699w', price: 148, sub: '常规区 · 金币保底', category: '常规区',
    desc: '148元保底1699万金币', tags: ['保底'], image: FUN_IMG },
  { id: 8, name: '198保1988w', price: 198, sub: '常规区 · 大额保底', category: '常规区',
    desc: '198元保底1988万金币，量大从优', tags: ['保底', '加急'], image: FUN_IMG },

  { id: 9, name: '单局118', price: 118, sub: '赌约区 · 600w起 最高保底1399w', category: '赌约区',
    desc: '单局600万起，最高保底1399万，打够结单', tags: ['赌约'], image: FUN_IMG },
  { id: 10, name: '单局198', price: 198, sub: '赌约区 · 800w起 最高保底1899w', category: '赌约区',
    desc: '单局800万起，最高保底1899万，打够结单', tags: ['赌约'], image: FUN_IMG },
  { id: 11, name: '单局488', price: 488, sub: '赌约区 · 1000w起 最高保底2999w', category: '赌约区',
    desc: '单局1000万起，最高保底2999万，打够结单', tags: ['赌约'], image: FUN_IMG },

  { id: 12, name: '单局六格大红', price: 198, sub: '赌红区 · 提前出保底1000w 最高18888w', category: '赌红区',
    desc: '单局六格大红198，提前出保底1000万，最高保底18888万，打够结单', tags: ['赌红', '大红'], image: FUN_IMG },
  { id: 13, name: '单局九格大红', price: 589, sub: '赌红区 · 提前出保底3888w 最高48888w', category: '赌红区',
    desc: '单局九格大红589，提前出保底3888万，最高保底48888万，打够结单', tags: ['赌红', '大红'], image: FUN_IMG },
  { id: 14, name: '出油单', price: 299, sub: '赌红区 · 提前出保底1888w 最高2466w', category: '赌红区',
    desc: '出油单299，提前出保底1888万，最高保底2466万，打够结单', tags: ['赌红'], image: FUN_IMG },
  { id: 15, name: '单局三幻神', price: 328, sub: '赌红区 · 提前出保底1999w 最高3666w', category: '赌红区',
    desc: '单局三幻神之一328，提前出保底1999万，最高保底3666万，打够结单', tags: ['赌红', '幻神'], image: FUN_IMG }
];
const HOURS = [
  { t: '1小时', p: 0, s: '适合体验' },
  { t: '3小时', p: 30, s: '性价比' },
  { t: '全程包段位', p: 60, s: '最热门🔥' }
];

module.exports = { RANKS_SPEC, HOURS, FUN_ORDERS };
