// 后端配置
module.exports = {
  port: process.env.PORT || 3000,

  // 数据库文件（内置 node:sqlite，无需安装）
  dbFile: __dirname + '/data/app.db',

  wx: {
    // 小程序 appid（project.config.json 里已填）
    appid: process.env.WX_APPID || 'wx3a02a19419011283',
    // 小程序 appsecret —— 填了才会走真实 jscode2session 登录，否则用模拟 openid
    secret: process.env.WX_SECRET || ''
  },

  // 模拟支付模式：true 时微信支付直接返回成功（等申请到商户号后置 false 并填商户配置）
  mockPay: true
};
