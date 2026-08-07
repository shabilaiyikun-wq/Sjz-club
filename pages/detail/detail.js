const { BOOSTERS, RANKS_SPEC, HOURS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');
const { post } = require('../../utils/request');

Page({
  data: {
    booster: null,
    ranks: RANKS_SPEC,
    hours: HOURS,
    servers: ['QQ区', '微信区'],
    selRank: -1,
    selHour: -1,
    selServer: 0,
    rankP: 0,
    hourP: 0,
    total: 0,
    tip: '选择规格后计算',
    gameId: '',
    gameWx: '',
    note: '',
    showPay: false,
    payMethod: '微信支付',
    payAmount: 0,
    showOk: false,
    paying: false
  },

  onLoad(options) {
    getCatalog().then((c) => {
      const b = c.boosters.find(x => x.id === Number(options.id)) || c.boosters[0];
      wx.setNavigationBarTitle({ title: b.name + ' · 护航下单' });
      const data = { booster: b, ranks: c.ranks, hours: c.hours };
      // 从首页套餐卡片进入时，预选对应段位
      if (options.rank !== undefined && c.ranks[Number(options.rank)]) {
        data.selRank = Number(options.rank);
        data.rankP = c.ranks[data.selRank].p;
      }
      this.setData(data);
      this.updTotal();
    });
  },

  noop() {},

  updTotal() {
    const d = this.data;
    const total = d.booster.price + d.rankP + d.hourP;
    const parts = [];
    if (d.selRank >= 0) parts.push(d.ranks[d.selRank].t);
    if (d.selHour >= 0) parts.push(d.hours[d.selHour].t);
    if (parts.length) parts.push(d.servers[d.selServer]);
    this.setData({
      total,
      payAmount: total,
      tip: parts.length ? parts.join(' · ') : '大神起步价'
    });
  },

  pickRank(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ selRank: i, rankP: this.data.ranks[i].p });
    this.updTotal();
  },

  pickHour(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ selHour: i, hourP: this.data.hours[i].p });
    this.updTotal();
  },

  pickServer(e) { this.setData({ selServer: e.currentTarget.dataset.i }); this.updTotal(); },

  onGameId(e) { this.setData({ gameId: e.detail.value }); },
  onWx(e) { this.setData({ gameWx: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  confirmOrder() {
    const d = this.data;
    if (d.selRank < 0) return wx.showToast({ title: '请先选择目标段位', icon: 'none' });
    if (d.selHour < 0) return wx.showToast({ title: '请先选择护航时长', icon: 'none' });
    if (!d.gameId) return wx.showToast({ title: '请填写游戏ID', icon: 'none' });
    if (!d.gameWx) return wx.showToast({ title: '请填写微信号，方便大神联系', icon: 'none' });
    this.setData({ showPay: true, payAmount: d.total });
  },

  pickPay(e) { this.setData({ payMethod: e.currentTarget.dataset.m }); },

  doPay() {
    const d = this.data;
    if (d.paying) return;
    this.setData({ paying: true });
    wx.showLoading({ title: '提交中', mask: true });
    const method = d.payMethod === '余额支付' ? 'balance' : 'wx';
    post('/api/orders', {
      type: 'escort',
      rankId: d.ranks[d.selRank].id,
      hourId: d.hours[d.selHour].id,
      server: d.servers[d.selServer],
      gameId: d.gameId,
      wx: d.gameWx,
      note: d.note
    })
      .then((order) => post('/api/pay', { orderId: order.id, method }))
      .then(() => {
        wx.hideLoading();
        this.setData({ showPay: false, showOk: true, paying: false });
      })
      .catch((e) => {
        wx.hideLoading();
        this.setData({ paying: false });
        wx.showToast({ title: e.message || '下单失败', icon: 'none' });
      });
  },

  hideOk() { this.setData({ showOk: false }); },

  backHome() {
    this.setData({ showOk: false });
    wx.switchTab({ url: '/pages/index/index' });
  },

  onMask(e) {
    if (e.currentTarget.dataset.m === 'pay') this.setData({ showPay: false });
  }
});
