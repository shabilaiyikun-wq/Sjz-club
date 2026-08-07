const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

const fen2yuan = (fen) => fen / 100;

/** GET /api/wallet  余额 + 流水 */
router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  const tx = db.prepare(
    `SELECT id, amount, type, balance_after, order_id, remark, created_at
     FROM wallet_tx WHERE user_id = ? ORDER BY id DESC LIMIT 50`
  ).all(req.user.id).map((t) => ({
    ...t,
    amount: fen2yuan(t.amount),
    balanceAfter: fen2yuan(t.balance_after)
  }));
  res.json({ code: 0, data: { balance: fen2yuan(user.balance), tx } });
});

/**
 * POST /api/wallet/recharge  { amount }  模拟充值
 * 真实环境应接入微信支付商户充值，这里直接入账
 */
router.post('/recharge', requireAuth, (req, res) => {
  const amountFen = Math.round(Number((req.body || {}).amount || 0) * 100);
  if (!amountFen || amountFen < 1 || amountFen > 1000000) {
    return res.status(400).json({ code: 400, msg: '充值金额无效' });
  }
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amountFen, req.user.id);
  const bal = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id).balance;
  db.prepare(`INSERT INTO wallet_tx (user_id, amount, type, balance_after, remark)
    VALUES (?,?,?,?,?)`).run(req.user.id, amountFen, 'recharge', bal, '模拟充值');
  res.json({ code: 0, data: { balance: fen2yuan(bal) }, msg: `充值成功 ¥${fen2yuan(amountFen).toFixed(2)}` });
});

module.exports = router;
