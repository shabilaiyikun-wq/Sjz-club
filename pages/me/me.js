const { get, ensureLogin } = require('../../utils/request');

// 后端状态 → 我的页分类
const STATUS_KEY = {
  unpaid: '待开始', paid: '待开始', ongoing: '进行中',
  done: '已完成', refunded: '售后', cancelled: '售后'
};

Page({
  data: {
    nickname: '神秘老板',
    initial: '神',
    balance: '0.00',
    orders: [
      { t: '待开始', v: 0, c: '#ffb84d' },
      { t: '进行中', v: 0, c: '#2ec5ff' },
      { t: '已完成', v: 0, c: '#2fd68b' },
      { t: '售后', v: 0, c: '#ff4d5e' }
    ],
    menu: [
      { t: '全部订单', icon: '📋', ic: 'ic1', toast: '暂无订单' },
      { t: '我的优惠券', icon: '🎫', ic: 'ic2', toast: '暂无优惠券' },
      { t: '邀请有礼', icon: '🤝', ic: 'ic3', toast: '邀请好友，双方各得 ¥5 优惠券' },
      { t: '成为大神（打手）', icon: '🎮', ic: 'ic4', toast: '成为大神需要：实名认证 + 缴纳保证金' },
      { t: '联系客服', icon: '💬', ic: 'ic1', toast: '客服热线 400-000-xxxx · 9:00-24:00' },
      { t: '设置', icon: '⚙️', ic: 'ic2', toast: '当前版本 v1.0.0' }
    ]
  },

  onShow() {
    // 用户信息（昵称/余额）
    ensureLogin().then(() => {
      const u = getApp().globalData.user || {};
      this.setData({
        nickname: u.nickname || '神秘老板',
        initial: (u.nickname || '神')[0],
        balance: (u.balance || 0).toFixed(2)
      });
    }).catch(() => {});

    // 订单状态统计
    get('/api/orders?type=all').then((list) => {
      const counts = { 待开始: 0, 进行中: 0, 已完成: 0, 售后: 0 };
      list.forEach((o) => { counts[STATUS_KEY[o.status] || '待开始']++; });
      this.setData({ orders: this.data.orders.map((s) => ({ ...s, v: counts[s.t] })) });
    }).catch(() => {});

    // 钱包余额（精确值）
    get('/api/wallet').then((w) => {
      this.setData({ balance: w.balance.toFixed(2) });
    }).catch(() => {});
  },

  tap(e) {
    wx.showToast({ title: e.currentTarget.dataset.t, icon: 'none' });
  }
});
