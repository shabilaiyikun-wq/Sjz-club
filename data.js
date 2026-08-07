/* ================= 全站共享数据 ================= */

const _rawBoosters = [
  { id: 1, name: '战绩如虎', rank: '战神', score: 4.9, orders: 1523, price: 88,
    modes: ['烽火地带'], tags: ['双倍战绩', '稳上分'],
    desc: '三角洲战神大神 · 擅长烽火地带撤离护航，胜率86%，全程指挥不挂机' },
  { id: 2, name: '北城以北', rank: '大师', score: 4.8, orders: 986, price: 68,
    modes: ['烽火地带'], tags: ['性价比', '包售后'],
    desc: '大师段位 · 烽火地带撤离成功率90%+，可语音教学' },
  { id: 3, name: '夜枭', rank: '王牌', score: 4.9, orders: 2104, price: 108,
    modes: ['烽火地带'], tags: ['秒接单', '全程直播'],
    desc: '王牌打手 · 烽火地带护航大神，接单量榜前三' },
  { id: 4, name: '老猫', rank: '钻石', score: 4.7, orders: 754, price: 58,
    modes: ['烽火地带'], tags: ['新手友好', '有耐心'],
    desc: '钻石段位 · 主打新手带飞，全程耐心指导不掉链子' },
  { id: 5, name: '小A带你飞', rank: '战神', score: 5.0, orders: 3321, price: 128,
    modes: ['烽火地带'], tags: ['全服榜一', '大神认证'],
    desc: '全服榜一 · 战神大神，保段位保胜率，全天在线' },
  { id: 6, name: '刀客', rank: '大师', score: 4.9, orders: 1677, price: 78,
    modes: ['烽火地带'], tags: ['物资找回', '装备保底'],
    desc: '烽火地带金库大神 · 摸金回本率98%，装备丢失包赔' }
];

const BOOSTERS = _rawBoosters.map((b, i) => ({ ...b, initial: b.name[0], ci: i % 4 }));

/* 下单规格：目标段位 / 时长 */
const RANKS_SPEC = [
  { t: '青铜→白金', p: 99 },
  { t: '白金→钻石', p: 188 },
  { t: '钻石→大师', p: 288 },
  { t: '大师→战神', p: 428 }
];

/* 首页套餐卡片：直接复用段位规格，保证首页价格 = 下单页实际价格 */
const PKGS = RANKS_SPEC.map((r, i) => ({
  t: r.t,
  p: '¥' + r.p + '起',
  i: ['🚀', '⚔️', '🔥', '👑'][i]
}));

/* 趣味单 / 种类单：俱乐部主打玩法，明码标价、保底到手 */
const FUN_ORDERS = [
  { id: 1, name: '66元 保688万金币', price: 66, sub: '烽火地带 · 金币保底',
    desc: '支付66元，保底到手688万游戏币，效率单随到随发', tags: ['保底', '热门'] },
  { id: 2, name: '166元 保1888万金币', price: 166, sub: '烽火地带 · 大额保底',
    desc: '保底到手1888万游戏币，可分批发放，量大从优', tags: ['保底'] },
  { id: 3, name: '288元 保3388万金币', price: 288, sub: '烽火地带 · 至尊保底',
    desc: '保底到手3388万游戏币，大神护航加急处理', tags: ['保底', '加急'] },
  { id: 4, name: '十连趣味单', price: 88, sub: '烽火地带 · 连开保底',
    desc: '趣味连开玩法，保底到手888万游戏币', tags: ['趣味', '连开'] },
  { id: 5, name: '金币翻倍券', price: 30, sub: '护航加成 · 趣味玩法',
    desc: '任选一单护航完成后，金币收益翻倍一次', tags: ['趣味'] }
];
const HOURS = [
  { t: '1小时', p: 0, s: '适合体验' },
  { t: '3小时', p: 30, s: '性价比' },
  { t: '全程包段位', p: 60, s: '最热门🔥' }
];

const _rb = [
  { no: 1, n: '小A带你飞', v: '3321', vk: '单', sub: '🏆 大神认证 · 战神' },
  { no: 2, n: '夜枭', v: '2104', vk: '单', sub: '🏆 大神认证 · 王牌' },
  { no: 3, n: '刀客', v: '1677', vk: '单', sub: '🏆 大神认证 · 大师' },
  { no: 4, n: '战绩如虎', v: '1523', vk: '单', sub: '· 战神' },
  { no: 5, n: '北城以北', v: '986', vk: '单', sub: '· 大师' },
  { no: 6, n: '老猫', v: '754', vk: '单', sub: '· 钻石' }
];
const _boss = [
  { no: 1, n: '冲锋号角', v: '12860', vk: '元', sub: '老板消费 · 榜一' },
  { no: 2, n: '吃鸡不吐骨', v: '8420', vk: '元', sub: '老板消费' },
  { no: 3, n: '老六出击', v: '6950', vk: '元', sub: '老板消费' },
  { no: 4, n: '一狙入魂', v: '5120', vk: '元', sub: '老板消费' },
  { no: 5, n: '午夜战神', v: '3680', vk: '元', sub: '老板消费' },
  { no: 6, n: '铁头冲锋', v: '2990', vk: '元', sub: '老板消费' }
];
const RANK_BOOSTER = _rb.map((r, i) => ({ ...r, initial: r.n[0], ci: i % 4 }));
const RANK_BOSS = _boss.map((r, i) => ({ ...r, initial: r.n[0], ci: (i + 2) % 4 }));

module.exports = { BOOSTERS, PKGS, RANKS_SPEC, HOURS, RANK_BOOSTER, RANK_BOSS, FUN_ORDERS };
