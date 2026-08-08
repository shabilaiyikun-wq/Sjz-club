const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

// 初始化数据库（建表 + 种子数据）
require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ code: 0, msg: '三角洲护航俱乐部后端运行中' }));

// 静态图片（客户端展示用，放 public/images/ 下）
app.use('/images', express.static(path.join(__dirname, 'public/images')));
// 护航完成截图上传目录
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/pay', require('./routes/pay'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/fortune', require('./routes/fortune'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/rankings', require('./routes/rankings'));

// 管理后台页面（浏览器访问）
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.use((req, res) => res.status(404).json({ code: 404, msg: '接口不存在' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: 500, msg: '服务器错误：' + err.message });
});

app.listen(config.port, () => {
  console.log(`[server] 三角洲护航后端已启动: http://127.0.0.1:${config.port}`);
});
