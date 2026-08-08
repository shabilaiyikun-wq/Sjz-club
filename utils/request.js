const { API_BASE } = require('./config');

// mock 登录用的 code 缓存：保证后端派生出的 openid 稳定（真实环境无副作用）
const CODE_KEY = 'df_login_code';

function getApp2() { return getApp(); }

/** 登录：拿 token 存进 globalData，全程只登录一次 */
function ensureLogin() {
  const app = getApp2();
  // 真机 onLaunch 早期 getApp() 可能还拿不到实例，等初始化完成再重试
  if (!app) return new Promise((resolve) => setTimeout(() => ensureLogin().then(resolve), 50));
  if (app.globalData.token) return Promise.resolve(app.globalData.token);

  return new Promise((resolve, reject) => {
    const getCode = () => new Promise((res, rej) => {
      const cached = wx.getStorageSync(CODE_KEY);
      if (cached) return res(cached);
      wx.login({
        success: (r) => { wx.setStorageSync(CODE_KEY, r.code); res(r.code); },
        fail: rej
      });
    });

    getCode().then((code) => {
      wx.request({
        url: API_BASE + '/api/auth/login',
        method: 'POST',
        data: { code },
        success: (res) => {
          const body = res.data || {};
          if (body.code === 0) {
            app.globalData.token = body.data.token;
            app.globalData.user = body.data.user;
            resolve(body.data.token);
          } else {
            reject(new Error(body.msg || '登录失败'));
          }
        },
        fail: reject
      });
    }).catch(reject);
  });
}

/** 通用请求：自动登录、带 token，code!==0 抛错，401 清 token 重登重试一次 */
function request(method, path, data, retried) {
  return ensureLogin().then((token) => new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method,
      data,
      header: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      success: (res) => {
        const body = res.data || {};
        // 兼容两种成功响应：有 data 的取 data；只有 msg 的（如「申请已提交」）取整个 body
        if (body.code === 0) return resolve(body.data !== undefined ? body.data : body);
        if (body.code === 401 && !retried) {
          getApp2().globalData.token = '';
          return request(method, path, data, true).then(resolve).catch(reject);
        }
        reject(new Error(body.msg || '请求失败'));
      },
      fail: reject
    });
  }));
}

module.exports = {
  API_BASE,
  ensureLogin,
  get: (p) => request('GET', p),
  post: (p, d) => request('POST', p, d),
  patch: (p, d) => request('PATCH', p, d),
  put: (p, d) => request('PUT', p, d)
};
