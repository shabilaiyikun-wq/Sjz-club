const { patch, ensureLogin } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

Page({
  data: {
    dark: false,
    nickname: '神秘老板',
    showNick: false,
    nick: ''
  },

  onShow() {
    syncTheme(this);
    const app = getApp();
    this.setData({ dark: app.globalData.theme === 'dark' });
    this.setData({ nickname: (app.globalData.user || {}).nickname || '神秘老板' });
  },

  /* 主题切换 */
  setLight() { this.applyTheme('light'); },
  setDark() { this.applyTheme('dark'); },
  applyTheme(t) {
    wx.setStorageSync('df_theme', t);
    getApp().globalData.theme = t;
    this.setData({ dark: t === 'dark', theme: t === 'dark' ? 'theme-dark' : '' });
  },

  /* 修改昵称 */
  openNick() {
    this.setData({ showNick: true, nick: this.data.nickname === '神秘老板' ? '' : this.data.nickname });
  },
  closeNick() { this.setData({ showNick: false }); },
  onNick(e) { this.setData({ nick: e.detail.value }); },

  saveNick() {
    const n = this.data.nick.trim();
    if (!n) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
    patch('/api/auth/nickname', { nickname: n })
      .then((d) => {
        const app = getApp();
        if (app.globalData.user) app.globalData.user.nickname = d.nickname;
        this.setData({ showNick: false, nickname: d.nickname });
        wx.showToast({ title: '昵称已更新', icon: 'success' });
      })
      .catch((e) => wx.showToast({ title: e.message || '修改失败', icon: 'none' }));
  },

  /* 文档 / 关于 */
  goPrivacy() { wx.navigateTo({ url: '/pages/doc/doc?type=privacy' }); },
  goAgreement() { wx.navigateTo({ url: '/pages/doc/doc?type=agreement' }); },
  about() {
    wx.showModal({
      title: '关于我们',
      content: '三角洲护航俱乐部 v1.0.0\n专业护航点单平台 · 全程担保交易',
      showCancel: false
    });
  },

  /* 退出登录 */
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      success: (r) => {
        if (!r.confirm) return;
        wx.removeStorageSync('df_login_code');
        getApp().globalData.token = '';
        getApp().globalData.user = null;
        wx.showToast({ title: '已退出', icon: 'none' });
        ensureLogin().catch(() => {});
        setTimeout(() => wx.navigateBack(), 600);
      }
    });
  },

  noop() {}
});
