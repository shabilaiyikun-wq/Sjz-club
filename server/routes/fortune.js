const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

// 运势文案（三角洲游戏氛围）
const FORTUNES = [
  { level: '大吉', emoji: '🍀', text: '今晚护航必满星，撤离稳如老狗' },
  { level: '上上签', emoji: '🚀', text: '今日上分如喝水，匹配必遇强力队友' },
  { level: '大顺', emoji: '🃏', text: '手气爆棚，抢单手速翻倍，点单必爆金币' },
  { level: '吉', emoji: '🎯', text: '点单好时机，66 保 688w 不是梦' },
  { level: '中吉', emoji: '💰', text: '财运不错，适合约大神护航冲段位' },
  { level: '小吉', emoji: '🌤', text: '运势平稳，适合先观察再下手' },
  { level: '平', emoji: '🎲', text: '今日求稳为上，谨慎下单必不亏' },
  { level: '小吉', emoji: '⭐', text: '遇贵人大神，顺利上大分' },
  { level: '宜开黑', emoji: '🎮', text: '今日宜开黑，手感在线，直冲传说' },
  { level: '旺财', emoji: '🧧', text: '偏财运旺，余额充值正当时' }
];

/**
 /** POST /api/fortune  今日运势（每个用户每天限一次）
 * 当天已测过 → used:true 并返回当天测的运势；未测 → 随机抽一条并记录
 */
router.post('/', requireAuth, (req, res) => {
  const exist = db.prepare(
    `SELECT fortune FROM fortune_logs WHERE user_id=? AND date=date('now','localtime')`
  ).get(req.user.id);
  if (exist) {
    let f = null;
    try { f = JSON.parse(exist.fortune); } catch (e) { /* ignore */ }
    return res.json({ code: 0, data: { used: true, fortune: f } });
  }
  const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  db.prepare(
    `INSERT INTO fortune_logs (user_id, date, fortune) VALUES (?, date('now','localtime'), ?)`
  ).run(req.user.id, JSON.stringify(f));
  res.json({ code: 0, data: { used: false, fortune: f } });
});

module.exports = router;
