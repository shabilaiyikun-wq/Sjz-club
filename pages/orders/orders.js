const { get, post } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

const STATUS_TEXT = {
  unpaid: '待支付', paid: '待开始', ongoing: '进行中',
  done: '已完成', refunded: '已退款', cancelled: '已取消'
};
const STATUS_COLOR = {
  unpaid: '#f08c00', paid: '#0aa2c0', ongoing: '#2ec5ff',
  done: '#0ca678', refunded: '#e5484d', cancelled: '#9aa4bd'
};

// 后端 spec 是 JSON 对象：趣味单 {qty} → ×N；护航 {booster, hour} → 大神 / 时长；端别 platform 前缀
function fmtSpec(spec) {
  if (!spec) return '';
  const pre = spec.platform ? (spec.platform === '电脑端' ? '💻电脑端 · ' : '📱手机端 · ') : '';
  if (spec.qty) return pre + '×' + spec.qty;
  if (spec.booster || spec.rank) return pre + (spec.booster || spec.rank) + ' / ' + spec.hour;
  return '';
}

Page({
  data: {
    filters: [
      { k: 'all', t: '全部' },
      { k: 'unpaid', t: '待支付' },
      { k: 'paid', t: '待开始' },
      { k: 'ongoing', t: '进行中' },
      { k: 'done', t: '已完成' }
    ],
    filter: 'all',
    list: [],
    loading: false,
    showDetail: false,
    cur: null
  },

  onLoad(opts) {
    if (opts && opts.status && this.data.filters.some((f) => f.k === opts.status)) {
      this.setData({ filter: opts.status });
    }
  },

  onShow() { syncTheme(this); this.load(); },

  onPullDownRefresh() { this.load(true); },

  switchFilter(e) {
    const f = e.currentTarget.dataset.k;
    if (f === this.data.filter) return;
    this.setData({ filter: f, list: [] });
    this.load();
  },

  load(done) {
    this.setData({ loading: true });
    get('/api/orders?type=all&status=' + this.data.filter)
      .then((list) => {
        this.setData({
          list: list.map((o) => ({
            ...o,
            statusText: STATUS_TEXT[o.status] || o.status,
            color: STATUS_COLOR[o.status] || '#9aa4bd',
            specText: fmtSpec(o.spec),
            totalText: (o.total || 0).toFixed(2)
          }))
        });
      })
      .catch((e) => wx.showToast({ title: e.message || '加载失败', icon: 'none' }))
      .then(() => {
        this.setData({ loading: false });
        if (done) wx.stopPullDownRefresh();
      });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showDetail: true, cur: this.data.list.find((o) => o.id == id) });
  },

  closeDetail() { this.setData({ showDetail: false }); },
  noop() {},

  cancelOrder() {
    const cur = this.data.cur;
    if (!cur) return;
    wx.showModal({
      title: '取消订单',
      content: '确定取消这笔订单吗？',
      success: (r) => {
        if (!r.confirm) return;
        post('/api/orders/' + cur.id + '/cancel')
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'success' });
            this.setData({ showDetail: false });
            this.load();
          })
          .catch((e) => wx.showToast({ title: e.message || '取消失败', icon: 'none' }));
      }
    });
  }
});
