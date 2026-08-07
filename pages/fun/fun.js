const { FUN_ORDERS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');
const { post } = require('../../utils/request');

Page({
  data: {
    list: FUN_ORDERS,
    cur: null,
    qty: 1,
    total: 0,
    servers: ['QQ区', '微信区'],
    selServer: 0,
    gameId: '',
    gameWx: '',
    note: '',
    showOrder: false,
    showPay: false,
    showOk: false,
    payMethod: '微信支付',
    payAmount: 0,
    paying: false
  },

  noop() {},
  backHome() { wx.switchTab({ url: '/pages/index/index' }); },

  onLoad() {
    getCatalog().then((c) => this.setData({ list: c.funOrders }));
  },

  updTotal() {
    this.setData({ total: this.data.cur.price * this.data.qty });
  },

  openOrder(e) {
    const cur = this.data.list[e.currentTarget.dataset.idx];
    this.setData({ cur, qty: 1, selServer: 0, gameId: '', gameWx: '', note: '', showOrder: true });
    this.updTotal();
  },

  qtyMinus() {
    if (this.data.qty > 1) { this.setData({ qty: this.data.qty - 1 }); this.updTotal(); }
  },
  qtyPlus() {
    if (this.data.qty < 99) { this.setData({ qty: this.data.qty + 1 }); this.updTotal(); }
  },

  setServer(e) { this.setData({ selServer: e.currentTarget.dataset.i }); },
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
    post('/api/orders', {
      type: 'fun',
      productId: d.cur.id,
      qty: d.qty,
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
  closeOrder() { this.setData({ showOrder: false }); },

  onMask(e) {
    if (e.currentTarget.dataset.m === 'pay') this.setData({ showPay: false });
  }
});
