const router = require('express').Router();
const crypto = require('crypto');
const config = require('../config');
const db = require('../db');

/**
 * POST /api/auth/login  { code }
 * 配置了 wx.secret 时走真实 jscode2session；
 * 否则用模拟 openid（开发阶段，新用户赠送演示余额）
 */
router.post('/login', async (req, res) => {
  const { code } = req.body || {};
  let openid;

  if (config.wx.secret) {
    // 真实微信登录：code 换 openid
    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${config.wx.appid}&secret=${config.wx.secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    const r = await fetch(url).then((x) => x.json());
    if (!r.openid) return res.status(401).json({ code: 401, msg: '微信登录失败：' + (r.errmsg || '') });
    openid = r.openid;
  } else {
    // 模拟模式：openid 由 code 派生，新用户赠送 ¥128.50 演示余额
    openid = 'dev_' + (code || 'anon');
  }

  let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
  if (!user) {
    const info = db.prepare('INSERT INTO users (openid, nickname, balance) VALUES (?,?,?)');
    info.run(openid, '神秘老板', 12850); // 演示余额 ¥128.50
    user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
  }

  const token = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?,?)').run(token, user.id);

  res.json({
    code: 0,
    data: {
      token,
      user: { id: user.id, nickname: user.nickname, balance: user.balance / 100 }
    }
  });
});

module.exports = router;
