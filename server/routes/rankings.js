const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/rankings  老板消费榜（实付金额降序，取前 20）
 */
router.get('/', (req, res) => {
  const top = db.prepare(`
    SELECT u.id, u.nickname,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled','refunded') THEN o.total ELSE 0 END), 0) total,
      COUNT(CASE WHEN o.status NOT IN ('cancelled','refunded') THEN 1 ELSE NULL END) cnt
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id
    HAVING total > 0
    ORDER BY total DESC
    LIMIT 20
  `).all().map((u, i) => ({
    no: i + 1,
    nickname: u.nickname,
    initial: (u.nickname || '?')[0],
    ci: i % 4,
    amount: (u.total / 100).toFixed(2),
    orders: u.cnt,
    unit: '元'
  }));

  res.json({ code: 0, data: { list: top } });
});

module.exports = router;
