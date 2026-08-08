const { ensureLogin } = require('./utils/request');

// 主题名 → 页面根 class（配合 app.wxss 里的 .page.theme-dark）
const themeClass = (t) => (t === 'dark' ? 'theme-dark' : '');

App({
  globalData: { token: '', user: null, theme: 'light' },

  onLaunch() {
    // 读取本地主题偏好（默认亮色）
    this.globalData.theme = wx.getStorageSync('df_theme') || 'light';
    // 静默登录，把 user 放到 globalData（余额/昵称）
    ensureLogin().catch(() => {});
  }
});

module.exports = { themeClass };
