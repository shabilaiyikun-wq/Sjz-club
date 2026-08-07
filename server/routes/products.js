const router = require('express').Router();
const db = require('../db');

const fen2yuan = (fen) => fen / 100;
const parseJson = (s) => { try { return JSON.parse(s); } catch (e) { return []; } };

/**
 * GET /api/products  一键取全部商品数据
 * 返回 boosters / funOrders / ranks / hours，价格单位：元
 */
router.get('/', (req, res) => {
  const boosters = db.prepare('SELECT * FROM boosters ORDER BY id').all()
    .map((b) => ({
      ...b,
      modes: parseJson(b.modes),
      tags: parseJson(b.tags),
      price: fen2yuan(b.price)
    }));

  const funOrders = db.prepare('SELECT * FROM fun_orders ORDER BY id').all()
    .map((f) => ({ ...f, tags: parseJson(f.tags), price: fen2yuan(f.price) }));

  const ranks = db.prepare('SELECT id, label, price FROM spec_ranks ORDER BY id').all()
    .map((r) => ({ ...r, price: fen2yuan(r.price) }));

  const hours = db.prepare('SELECT id, label, price, tip FROM spec_hours ORDER BY id').all()
    .map((h) => ({ ...h, price: fen2yuan(h.price) }));

  res.json({ code: 0, data: { boosters, funOrders, ranks, hours } });
});

module.exports = router;
