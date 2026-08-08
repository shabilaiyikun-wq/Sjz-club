const db = require('./db');

// 登录态校验中间件：Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ code: 401, msg: '未登录' });
  const user = db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).get(token);
  if (!user) return res.status(401).json({ code: 401, msg: '登录已过期，请重新登录' });
  req.user = user;
  req.token = token;
  next();
}

// 打手身份校验：booster_status === 2（管理员已批准）才能操作打手功能
function checkBooster(req, res, next) {
  if (req.user && req.user.booster_status === 2) return next();
  return res.status(403).json({ code: 403, msg: '还不是打手，请先在「我的」页申请' });
}

// 生成订单号
function genOrderNo() {
  return 'DF' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

module.exports = { requireAuth, checkBooster, genOrderNo };
