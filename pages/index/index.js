const { BOOSTERS, PKGS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');

Page({
  data: {
    announce: '今晚8点 大神集结 · 全程护航 · 不掉分保段位，安全上分不封号，先验号后付款',
    homeBoosters: BOOSTERS.slice(0, 4),
    pkgs: PKGS
  },

  onLoad() {
    getCatalog().then((c) => {
      this.setData({ homeBoosters: c.boosters.slice(0, 4), pkgs: c.pkgs });
    });
  },

  goOrder() { wx.switchTab({ url: '/pages/order/order' }); },
  goRank() { wx.switchTab({ url: '/pages/rank/rank' }); },
  goFun() { wx.navigateTo({ url: '/pages/fun/fun' }); },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  },

  /* 套餐卡片：直连下单页并预选对应段位 */
  openPkg(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=1&rank=' + e.currentTarget.dataset.idx });
  },

  onSign() { wx.showToast({ title: '已连续签到3天，+5积分', icon: 'none' }); },
  onContact() { wx.showToast({ title: '客服在线，平均30秒响应', icon: 'none' }); },
  onCharge() { wx.showToast({ title: '演示版暂未接入充值', icon: 'none' }); }
});
