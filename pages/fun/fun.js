const { FUN_ORDERS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');
const { post, get } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

Page({
  data: {
    list: FUN_ORDERS.map((f) => ({ ...f, buy_limit: f.buy_limit || f.limit || null })),
    groups: [],
    funSel: 0,
    cur: null,
    qty: 1,
    total: 0,
    servers: ['QQ区', '微信区'],
    platforms: ['手机端', '电脑端'],
    selServer: 0,
    selPlatform: 0,
    gameId: '',
    gameWx: '',
    note: '',
    showOrder: false,
    showPay: false,
    showOk: false,
    payMethod: '微信支付',
    payAmount: 0,
    balance: '0.00',
    paying: false
  },

  noop() {},
  backHome() { wx.switchTab({ url: '/pages/index/index' }); },

  onShow() { syncTheme(this); this.loadBalance(); },

  // 拉取用户实际余额，支付弹窗显示真实值
  loadBalance() {
    get('/api/wallet').then((w) => this.setData({ balance: (w.balance || 0).toFixed(2) })).catch(() => {});
  },

  onLoad() {
    getCatalog()
      .then((c) => this.setData({ list: c.funOrders, groups: this.buildGroups(c.funOrders) }))
      .catch(() => this.setData({ groups: this.buildGroups(this.data.list) }));
  },

  // 分区 tab 切换
  setFunSel(e) { this.setData({ funSel: e.currentTarget.dataset.i }); },

  // 按 category 分区：体验区/常规区/赌约区/赌红区
  buildGroups(list) {
    const groups = [];
    list.forEach((item) => {
      const g = groups.find((x) => x.category === item.category);
      if (g) g.items.push(item);
      else groups.push({ category: item.category, items: [item] });
    });
    return groups;
  },

  updTotal() {
    this.setData({ total: this.data.cur.price * this.data.qty });
  },

  openOrder(e) {
    const cur = this.data.list.find((x) => x.id === Number(e.currentTarget.dataset.id));
    // 兜底：data.js 字段是 limit，后端是 buy_limit，统一成 buy_limit 判断
    if (cur && !cur.buy_limit && cur.limit) cur.buy_limit = cur.limit;
    this.setData({ cur, qty: 1, selServer: 0, gameId: '', gameWx: '', note: '', showOrder: true });
    this.updTotal();
  },

  qtyMinus() {
    if (this.data.qty > 1) { this.setData({ qty: this.data.qty - 1 }); this.updTotal(); }
  },
  qtyPlus() {
    // 有限购（每人一次/每周一次）的玩法锁死数量为 1
    if (this.data.cur && this.data.cur.buy_limit) return;
    if (this.data.qty < 99) { this.setData({ qty: this.data.qty + 1 }); this.updTotal(); }
  },

  setServer(e) { this.setData({ selServer: e.currentTarget.dataset.i }); },
  setPlatform(e) { this.setData({ selPlatform: e.currentTarget.dataset.i }); },
  onGameId(e) { this.setData({ gameId: e.detail.value }); },
  onWx(e) { this.setData({ gameWx: e.detail.value }); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  confirmOrder() {
    const d = this.data;
    if (!d.gameId) return wx.showToast({ title: '请填写游戏ID', icon: 'none' });
    if (!d.gameWx) return wx.showToast({ title: '请填写微信号', icon: 'none' });
    this.setData({ showOrder: false, showPay: true, payAmount: d.total });
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
      type: 'fun',
      productId: d.cur.id,
      qty: d.qty,
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
  closeOrder() { this.setData({ showOrder: false }); },

  onMask(e) {
    if (e.currentTarget.dataset.m === 'pay') this.setData({ showPay: false });
  }
});
