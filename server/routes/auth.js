const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { requireAuth, checkBooster } = require('../auth');

// 打手头像上传：存 public/uploads/avatars/
const avatarDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'booster_' + req.user.id + '_' + Date.now() + ext);
  }
});
const avatarUpload = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

/**
 /** POST /api/auth/login  { code }
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
      user: {
        id: user.id,
        nickname: user.nickname,
        balance: user.balance / 100,
        boosterStatus: user.booster_status || 0
      }
    }
  });
});

/** PATCH /api/auth/nickname  { nickname }  修改昵称 */
router.patch('/nickname', requireAuth, (req, res) => {
  const n = (req.body || {}).nickname;
  if (!n || !String(n).trim()) return res.status(400).json({ code: 400, msg: '昵称不能为空' });
  const nn = String(n).trim().slice(0, 12);
  db.prepare('UPDATE users SET nickname=? WHERE id=?').run(nn, req.user.id);
  res.json({ code: 0, data: { nickname: nn }, msg: '昵称已更新' });
});

/**
 /** POST /api/auth/booster/apply  { name, phone, wx, nickname, rank, price, intro, tags }
 * 申请成为打手：个人信息（姓名/手机/微信）+ 大神榜展示资料（昵称/段位/单价/简介/标签）
 * 审核通过后直接用这些资料上大神榜，无需二次编辑
 */
router.post('/booster/apply', requireAuth, (req, res) => {
  if (req.user.booster_status === 2) return res.json({ code: 0, msg: '你已经是打手了' });
  const { name, phone, wx: wxid, nickname, rank, price, intro, tags, platform } = req.body || {};
  if (!name || !phone || !wxid) return res.status(400).json({ code: 400, msg: '请填写姓名、手机号、微信号' });
  if (!/^\d{6,15}$/.test(String(phone).trim())) {
    return res.status(400).json({ code: 400, msg: '手机号格式不正确' });
  }
  if (!nickname || !String(nickname).trim()) return res.status(400).json({ code: 400, msg: '请填写大神昵称（大神榜展示名）' });
  const priceFen = Math.round(Number(price || 0) * 100);
  if (!(priceFen >= 1)) return res.status(400).json({ code: 400, msg: '请填写正确的单价（元）' });
  const pf = ['手机端', '电脑端'].includes(platform) ? platform : '手机端';
  const exist = db.prepare('SELECT id FROM booster_applications WHERE user_id=? AND status=0').get(req.user.id);
  if (exist) return res.json({ code: 0, msg: '申请已在审核中，请耐心等待' });
  db.prepare(
    'INSERT INTO booster_applications (user_id, name, phone, wx, nickname, rank, price, intro, tags, platform) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(
    req.user.id,
    String(name).trim(),
    String(phone).trim(),
    String(wxid).trim(),
    String(nickname).trim().slice(0, 20),
    String(rank || '').trim().slice(0, 10),
    priceFen,
    String(intro || '').trim().slice(0, 200),
    String(tags || '').trim().slice(0, 100),
    pf
  );
  db.prepare('UPDATE users SET booster_status=1 WHERE id=?').run(req.user.id);
  res.json({ code: 0, msg: '申请已提交，等待管理员审核' });
});

const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return []; } };

/**
 /** GET /api/auth/booster/profile  打手自己在大神榜的资料
 * 打手中心「我的资料」读取；尚未上架返回 null（可提示联系管理员）
 */
router.get('/booster/profile', requireAuth, checkBooster, (req, res) => {
  const b = db.prepare('SELECT * FROM boosters WHERE user_id=?').get(req.user.id);
  if (!b) return res.json({ code: 0, data: null });
  res.json({
    code: 0,
    data: {
      id: b.id,
      name: b.name,
      avatar: b.avatar || '',
      rank: b.rank || '',
      score: b.score,
      orders: b.orders,
      price: b.price / 100,
      modes: parseJson(b.modes),
      tags: parseJson(b.tags),
      desc: b.desc || ''
    }
  });
});

/**
/** POST /api/auth/booster/avatar  上传打手头像 */
router.post('/booster/avatar', requireAuth, checkBooster, avatarUpload.single('avatar'), (req, res) => {
  const b = db.prepare('SELECT id FROM boosters WHERE user_id=?').get(req.user.id);
  if (!b) return res.status(404).json({ code: 404, msg: '尚未上架大神榜，请联系管理员' });
  if (!req.file) return res.status(400).json({ code: 400, msg: '请选择图片' });
  const filePath = '/uploads/avatars/' + req.file.filename;
  db.prepare('UPDATE boosters SET avatar=? WHERE user_id=?').run(filePath, req.user.id);
  res.json({ code: 0, data: { avatar: filePath }, msg: '头像已更新' });
});

/** PUT /api/auth/booster/profile  打手修改自己的大神资料
 * 只允许改自己那条（user_id 匹配）；modes/tags 传数组
 */
router.put('/booster/profile', requireAuth, checkBooster, (req, res) => {
  const b = db.prepare('SELECT id FROM boosters WHERE user_id=?').get(req.user.id);
  if (!b) return res.status(404).json({ code: 404, msg: '尚未上架大神榜，请联系管理员' });
  const body = req.body || {};
  if (!body.name || !String(body.name).trim()) return res.status(400).json({ code: 400, msg: '名字必填' });
  const priceFen = Math.round(Number(body.price || 0) * 100);
  if (!(priceFen >= 1)) return res.status(400).json({ code: 400, msg: '价格无效' });
  db.prepare(
    `UPDATE boosters SET name=?, rank=?, score=?, price=?, modes=?, tags=?, desc=? WHERE user_id=?`
  ).run(
    String(body.name).trim().slice(0, 20),
    String(body.rank || '').trim().slice(0, 10),
    Math.max(0, Math.min(5, Number(body.score) || 0)),
    priceFen,
    JSON.stringify(Array.isArray(body.modes) ? body.modes.map(String) : []),
    JSON.stringify(Array.isArray(body.tags) ? body.tags.map(String) : []),
    String(body.desc || '').trim().slice(0, 200),
    req.user.id
  );
  res.json({ code: 0, msg: '资料已更新' });
});

module.exports = router;
