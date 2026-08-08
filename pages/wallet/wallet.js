const { get } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

// 流水类型 → 图标/名称/正负号（未知类型兜底到 remark）
const TX = {
  recharge: { icon: '💰', name: '充值', sign: '+' },
  pay: { icon: '🛡️', name: '消费', sign: '-' },
  refund: { icon: '↩️', name: '退款', sign: '+' },
  withdraw: { icon: '🏦', name: '提现', sign: '-' }
};

Page({
  data: {
    balance: '0.00',
    tx: []
  },

  recharge() { wx.switchTab({ url: '/pages/me/me' }); },

  onShow() {
    syncTheme(this);
    get('/api/wallet').then((w) => {
      this.setData({
        balance: w.balance.toFixed(2),
        tx: w.tx.map((t) => {
          const cfg = TX[t.type] || { icon: '💠', name: t.remark || '收支', sign: t.amount >= 0 ? '+' : '-' };
          return {
            id: t.id,
            icon: cfg.icon,
            name: cfg.name,
            sign: cfg.sign,
            amount: Math.abs(t.amount).toFixed(2),
            remark: t.remark || '',
            time: (t.created_at || '').slice(5, 16)
          };
        })
      });
    }).catch(() => {});
  }
});
