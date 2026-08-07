const { ensureLogin } = require('./utils/request');

App({
  globalData: { token: '', user: null },

  onLaunch() {
    // 静默登录，把 user 放到 globalData（余额/昵称）
    ensureLogin().catch(() => {});
  }
});
