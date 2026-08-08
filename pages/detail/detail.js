const { HOURS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');
const { post, get } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

Page({
  data: {
    booster: null,
    hours: HOURS,
    servers: ['QQ区', '微信区'],
    platforms: ['手机端', '电脑端'],
    selPlatform: 0,
    selHour: -1,
    selServer: 0,
    hourP: 0,
    total: 0,
    tip: '选择规格后计算',
    gameId: '',
    gameWx: '',
    note: '',
    showPay: false,
    payMethod: '微信支付',
    payAmount: 0,
    balance: '0.00',
    showOk: false,
    paying: false
  },

  onShow() { syncTheme(this); this.loadBalance(); },

  // 拉取用户实际余额，支付弹窗显示真实值
  loadBalance() {
    get('/api/wallet').then((w) => this.setData({ balance: (w.balance || 0).toFixed(2) })).catch(() => {});
  },

  onLoad(options) {
    getCatalog().then((c) => {
      const b = c.boosters.find(x => x.id === Number(options.id)) || c.boosters[0];
      if (!b) {
        wx.showToast({ title: '暂无打手上架', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
        return;
      }
      wx.setNavigationBarTitle({ title: b.name + ' · 护航下单' });
      // 卡片最多显示 3 个标签，避免标签多时竖排/撑爆
      this.setData({ booster: { ...b, tags: (b.tags || []).slice(0, 3) }, hours: c.hours });
      this.updTotal();
    });
  },

  noop() {},

  updTotal() {
    const d = this.data;
    // 价格 = 大神起步价 + 护航时长费（段位模块已移除）
    const total = d.booster.price + d.hourP;
    const parts = [];
    if (d.selHour >= 0) parts.push(d.hours[d.selHour].t);
    parts.push(d.servers[d.selServer]);
    this.setData({
      total,
      payAmount: total,
      tip: parts.join(' · ')
    });
  },

  pickHour(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ selHour: i, hourP: this.data.hours[i].p });
    this.updTotal();
  },

  pickServer(e) { this.setData({ selServer: e.currentTarget.dataset.i }); this.updTotal(); },
  pickPlatform(e) { this.setData({ selPlatform: e.currentTarget.dataset.i }); },

  onGameId(e) { this.setData({ gameId: e.detail.value }); },
  onWx(e) { this.setData({ gameWx: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  confirmOrder() {
    const d = this.data;
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
    if (method === 'balance' && Number(d.balance) < d.payAmount) {
      this.setData({ paying: false });
      wx.hideLoading();
      return wx.showToast({ title: '余额不足，请先充值', icon: 'none' });
    }
    post('/api/orders', {
      type: 'escort',
      boosterId: d.booster.id,
      hourId: d.hours[d.selHour].id,
      server: d.servers[d.selServer],
      platform: d.platforms[d.selPlatform],
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
