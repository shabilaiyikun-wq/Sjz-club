const { FUN_ORDERS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');
const { API_BASE } = require('../../utils/config');
const { post } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

// 点单须知弹窗：已读标记，只在首次进入时展示
const NOTICE_KEY = 'df_notice_v1';

Page({
  data: {
    announce: '今晚8点 大神集结 · 全程护航 · 不掉分保段位，安全上分不封号，先验号后付款',
    imgBase: API_BASE,
    showKf: false,
    showNotice: false,
    noticeItems: [
      '1. 未成年禁止下单，若已结单，概不退款',
      '2. 打手双倒老板兜底算炸单：巴克什航天炸弹加60w保底，监狱加80万',
      '3. 老板私自丢东西导致卡单，本单直接结单；不听打手指挥导致炸单、故意死亡，本单直接结单',
      '4. 除约单外，老板自选地图',
      '5. 老板有任何需求（不想要、称呼等），及时与客服沟通，我们尽量满足',
      '',
      '本俱乐部采用先付后赔，婉拒口头存单',
      '单局不满意可换人，单局撤离成功不可换',
      '存单有效期为30天，期限内未取单默认为送单'
    ],
    showFortune: false,
    fortuneUsed: false,
    fortune: null,
    homeBoosters: [],
    funGroups: [],
    funSel: 0
  },

  onShow() {
    syncTheme(this);
    // 点单须知：首次进入弹出，点击任意处关闭
    if (!wx.getStorageSync(NOTICE_KEY)) this.setData({ showNotice: true });
  },

  onLoad() {
    getCatalog()
      .then((c) => {
        this.setData({ homeBoosters: c.boosters.slice(0, 4), funGroups: this.buildFunGroups(c.funOrders) });
      })
      .catch(() => this.setData({ funGroups: this.buildFunGroups(FUN_ORDERS) }));
  },

  // 趣味单分区 tab 切换
  setFunSel(e) { this.setData({ funSel: e.currentTarget.dataset.i }); },

  // 趣味单按分区分组：体验区/常规区/赌约区/赌红区
  buildFunGroups(list) {
    const groups = [];
    list.forEach((item) => {
      const g = groups.find((x) => x.category === item.category);
      if (g) g.items.push(item);
      else groups.push({ category: item.category, items: [item] });
    });
    return groups;
  },

  goOrder() { wx.switchTab({ url: '/pages/order/order' }); },
  goRank() { wx.navigateTo({ url: '/pages/rank/rank' }); },
  goFun() { wx.switchTab({ url: '/pages/fun/fun' }); },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  },

  /* 客服弹窗 */
  openKf() { this.setData({ showKf: true }); },
  closeKf() { this.setData({ showKf: false }); },

  /* 今日运势（每天一次，后端限频） */
  fortune() {
    post('/api/fortune')
      .then((d) => {
        this.setData({ showFortune: true, fortuneUsed: d.used, fortune: d.fortune });
      })
      .catch((e) => wx.showToast({ title: e.message || '获取失败', icon: 'none' }));
  },
  closeFortune() { this.setData({ showFortune: false }); },
  closeNotice() { this.setData({ showNotice: false }); wx.setStorageSync(NOTICE_KEY, 1); },
  noop() {}
});
