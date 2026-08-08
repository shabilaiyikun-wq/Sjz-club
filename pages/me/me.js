const { get, post, patch, ensureLogin } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

// 后端状态 → 我的页分类
const STATUS_KEY = {
  unpaid: '待开始', paid: '待开始', ongoing: '进行中',
  done: '已完成', refunded: '已完成', cancelled: '已完成'
};

Page({
  data: {
    nickname: '神秘老板',
    initial: '神',
    balance: '0.00',
    showApply: false,
    aName: '',
    aPhone: '',
    aWx: '',
    aNickname: '',
    aRank: '',
    aPrice: '',
    aTags: '',
    aIntro: '',
    aPlatform: '手机端',
    aTagOpts: ['秒接单', '稳上分', '包段位', '不掉分', '上分快', '语音开黑', '1对1', '技术流', '加急', '深夜在线', '战神', '教学陪练'].map((t) => ({ t, on: false })),
    showRecharge: false,
    reAmounts: [50, 100, 200, 500],
    rAmt: 100,
    rCustom: '',
    showName: false,
    nName: '',
    orders: [
      { t: '待开始', k: 'paid', v: 0, c: '#ffb84d' },
      { t: '进行中', k: 'ongoing', v: 0, c: '#2ec5ff' },
      { t: '已完成', k: 'done', v: 0, c: '#2fd68b' }
    ],
    menu: [
      { t: '全部订单', icon: '📋', ic: 'ic1', page: '/pages/orders/orders' },
      { t: '成为大神（打手）', icon: '🎮', ic: 'ic4', page: '', action: '' },
      { t: '设置', icon: '⚙️', ic: 'ic2', page: '/pages/settings/settings' }
    ]
  },

  onShow() {
    syncTheme(this);
    // 用户信息（昵称/余额/打手状态）
    ensureLogin().then(() => {
      const u = getApp().globalData.user || {};
      this.setData({
        nickname: u.nickname || '神秘老板',
        initial: (u.nickname || '神')[0],
        balance: (u.balance || 0).toFixed(2)
      });
      this.updateBoosterMenu(u.boosterStatus);
    }).catch(() => {});

    // 订单状态统计
    get('/api/orders?type=all').then((list) => {
      const counts = { 待开始: 0, 进行中: 0, 已完成: 0 };
      list.forEach((o) => { counts[STATUS_KEY[o.status] || '待开始']++; });
      this.setData({ orders: this.data.orders.map((s) => ({ ...s, v: counts[s.t] })) });
    }).catch(() => {});

    this.refreshWallet();
  },

  // 「成为大神」入口按打手状态显示：未申请→申请 / 审核中→等待 / 打手→进中心
  updateBoosterMenu(status) {
    const cfg = {
      0: { t: '申请成为大神（打手）', page: '', action: 'apply' },
      1: { t: '打手审核中…', page: '', action: 'pending' },
      2: { t: '进入打手中心', page: '/pages/booster/booster', action: '' }
    }[status] || { t: '申请成为大神（打手）', page: '', action: 'apply' };
    this.setData({
      boosterStatus: status,
      menu: this.data.menu.map((m) =>
        m.t === '成为大神（打手）' ? { ...m, t: cfg.t, page: cfg.page, action: cfg.action } : m)
    });
  },

  applyBooster() {
    this.setData({ showApply: true });
  },

  onName(e) { this.setData({ aName: e.detail.value }); },
  onPhone(e) { this.setData({ aPhone: e.detail.value }); },
  onWx(e) { this.setData({ aWx: e.detail.value }); },
  onNickname(e) { this.setData({ aNickname: e.detail.value }); },
  onRank(e) { this.setData({ aRank: e.detail.value }); },
  onPrice(e) { this.setData({ aPrice: e.detail.value }); },
  onIntro(e) { this.setData({ aIntro: e.detail.value }); },
  pickPf(e) { this.setData({ aPlatform: e.currentTarget.dataset.p }); },
  // 预设标签点选（多选），选中项随提交并入大神标签
  toggleTag(e) {
    const t = e.currentTarget.dataset.t;
    this.setData({
      aTagOpts: this.data.aTagOpts.map((o) => (o.t === t ? { ...o, on: !o.on } : o))
    });
  },

  closeApply() { this.setData({ showApply: false }); },

  // ===== 钱包卡片 =====
  refreshWallet() {
    get('/api/wallet').then((w) => {
      this.setData({ balance: w.balance.toFixed(2) });
    }).catch(() => {});
  },
  goWallet() { wx.navigateTo({ url: '/pages/wallet/wallet' }); },
  openRecharge() { this.setData({ showRecharge: true, rAmt: 100, rCustom: '' }); },
  closeRecharge() { this.setData({ showRecharge: false }); },
  pickAmt(e) { this.setData({ rAmt: e.currentTarget.dataset.a, rCustom: '' }); },
  onRCustom(e) { this.setData({ rCustom: e.detail.value }); },
  submitRecharge() {
    const custom = parseFloat(this.data.rCustom);
    const amount = this.data.rCustom ? custom : this.data.rAmt;
    if (!amount || amount <= 0 || amount > 10000) {
      return wx.showToast({ title: '请输入有效金额', icon: 'none' });
    }
    post('/api/wallet/recharge', { amount })
      .then((d) => {
        this.setData({ showRecharge: false });
        wx.showToast({ title: d.msg || '充值成功', icon: 'success' });
        this.refreshWallet();
      })
      .catch((e) => wx.showToast({ title: e.message || '充值失败', icon: 'none' }));
  },

  submitApply() {
    const { aName, aPhone, aWx, aNickname, aRank, aPrice, aIntro, aPlatform, aTagOpts } = this.data;
    if (!aName.trim() || !aPhone.trim() || !aWx.trim()) {
      return wx.showToast({ title: '请填写姓名、手机号、微信号', icon: 'none' });
    }
    if (!/^\d{6,15}$/.test(aPhone.trim())) {
      return wx.showToast({ title: '手机号格式不正确', icon: 'none' });
    }
    if (!aNickname.trim()) return wx.showToast({ title: '请填大神昵称', icon: 'none' });
    const price = parseFloat(aPrice);
    if (!price || price <= 0) return wx.showToast({ title: '请填正确单价', icon: 'none' });
    const tags = aTagOpts.filter((o) => o.on).map((o) => o.t);
    if (!tags.length) return wx.showToast({ title: '至少选一个标签', icon: 'none' });
    post('/api/auth/booster/apply', {
      name: aName.trim(), phone: aPhone.trim(), wx: aWx.trim(),
      nickname: aNickname.trim(), rank: aRank.trim(), price,
      tags: tags.join('，'), intro: aIntro.trim(), platform: aPlatform
    })
      .then((d) => {
        this.setData({
          showApply: false,
          aName: '', aPhone: '', aWx: '',
          aNickname: '', aRank: '', aPrice: '', aIntro: '',
          aPlatform: '手机端',
          aTagOpts: this.data.aTagOpts.map((o) => ({ ...o, on: false }))
        });
        wx.showToast({ title: d.msg || '申请已提交', icon: 'success' });
        this.updateBoosterMenu(1);
      })
      .catch((e) => wx.showToast({ title: e.message || '申请失败', icon: 'none' }));
  },

  tap(e) {
    const page = e.currentTarget.dataset.page;
    if (page) return wx.navigateTo({ url: page });
    const action = e.currentTarget.dataset.action;
    if (action === 'apply') return this.applyBooster();
    if (action === 'pending') return wx.showToast({ title: '等待管理员审核中', icon: 'none' });
    wx.showToast({ title: e.currentTarget.dataset.t, icon: 'none' });
  },
  noop() {},
  editName() { this.setData({ showName: true, nName: this.data.nickname === '神秘老板' ? '' : this.data.nickname }); },
  closeName() { this.setData({ showName: false }); },
  onNName(e) { this.setData({ nName: e.detail.value }); },
  submitName() {
    const n = this.data.nName.trim();
    if (!n) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
    patch('/api/auth/nickname', { nickname: n })
      .then(() => {
        const app = getApp();
        app.globalData.user = { ...app.globalData.user, nickname: n };
        this.setData({ nickname: n, initial: n[0], showName: false });
        wx.showToast({ title: '昵称已更新', icon: 'success' });
      })
      .catch((e) => wx.showToast({ title: e.message || '修改失败', icon: 'none' }));
  }
});
