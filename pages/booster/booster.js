const { get, post, put } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

const STATUS_TEXT = {
  paid: '待开始', ongoing: '进行中', done: '已完成',
  refunded: '已退款', cancelled: '已取消'
};
const STATUS_COLOR = {
  paid: '#0aa2c0', ongoing: '#2ec5ff', done: '#0ca678',
  refunded: '#e5484d', cancelled: '#9aa4bd'
};

// 后端 spec 是 JSON 对象：趣味单 {qty} → ×N；护航 {booster, hour} → 大神 / 时长；端别 platform 前缀
function fmtSpec(spec) {
  if (!spec) return '';
  const pre = spec.platform ? (spec.platform === '电脑端' ? '💻电脑端 · ' : '📱手机端 · ') : '';
  if (spec.qty) return pre + '×' + spec.qty;
  if (spec.booster || spec.rank) return pre + (spec.booster || spec.rank) + ' / ' + spec.hour;
  return '';
}

Page({
  data: {
    tabs: [
      { k: 'hall', t: '任务大厅' },
      { k: 'mine', t: '我的接单' },
      { k: 'profile', t: '我的资料' }
    ],
    tab: 'hall',
    list: [],
    loading: false,
    profile: null,       // 打手在大神榜的资料
    showDetail: false,   // 订单详情弹窗
    cur: null,           // 当前查看的订单
    showEdit: false,     // 编辑资料弹窗
    eName: '', eRank: '', eScore: '', ePrice: '',
    eModes: '', eTags: '', eDesc: ''
  },

  onShow() { syncTheme(this); this.load(); this.loadProfile(); },
  onPullDownRefresh() { this.load(true); },

  switchTab(e) {
    const t = e.currentTarget.dataset.k;
    if (t === this.data.tab) return;
    this.setData({ tab: t, list: [] });
    if (t !== 'profile') this.load();
    if (t === 'profile') this.loadProfile();
  },

  load(done) {
    this.setData({ loading: true });
    const path = this.data.tab === 'hall' ? '/api/tasks' : '/api/tasks/mine';
    get(path)
      .then((list) => {
        this.setData({
          list: list.map((o) => ({
            ...o,
            typeText: o.type === 'fun' ? '趣味单' : '护航',
            specText: fmtSpec(o.spec),
            statusText: STATUS_TEXT[o.status] || o.status,
            color: STATUS_COLOR[o.status] || '#9aa4bd'
          }))
        });
      })
      .catch((e) => wx.showToast({ title: e.message || '加载失败', icon: 'none' }))
      .then(() => {
        this.setData({ loading: false });
        if (done) wx.stopPullDownRefresh();
      });
  },

  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const cur = this.data.list.find((o) => o.id == id);
    if (cur && cur.doneImage && !cur.doneImage.startsWith('http')) {
      cur.doneImage = require('../../utils/config').API_BASE + cur.doneImage;
    }
    this.setData({ showDetail: true, cur: cur });
  },
  closeDetail() { this.setData({ showDetail: false }); },

  // 预览护航完成截图大图
  previewImg(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.src], current: e.currentTarget.dataset.src });
  },

  grab(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认抢单',
      content: '抢单后订单变为「进行中」，请确保能完成护航。',
      success: (r) => {
        if (!r.confirm) return;
        post('/api/tasks/grab', { orderId: id })
          .then(() => {
            wx.showToast({ title: '抢单成功', icon: 'success' });
            this.load();
          })
          .catch((e) => wx.showToast({ title: e.message || '抢单失败', icon: 'none' }));
      }
    });
  },

  finish(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '标记完成',
      content: '请先截图护航完成页面（含老板ID验证），点确定后选择图片上传',
      success: (r) => {
        if (!r.confirm) return;
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => {
            const tempPath = res.tempFilePaths[0];
            wx.showLoading({ title: '上传中', mask: true });
            wx.uploadFile({
              url: require('../../utils/config').API_BASE + '/api/tasks/' + id + '/done',
              filePath: tempPath,
              name: 'image',
              header: { Authorization: 'Bearer ' + (getApp().globalData.token || '') },
              success: () => {
                wx.hideLoading();
                wx.showToast({ title: '已完成', icon: 'success' });
                that.setData({ showDetail: false });
                that.load();
              },
              fail: () => {
                wx.hideLoading();
                wx.showToast({ title: '上传失败，请重试', icon: 'none' });
              }
            });
          }
        });
      }
    });
  },

  // ===== 我的资料：打手自行维护大神榜展示信息 =====
  loadProfile() {
    const API_BASE = require('../../utils/config').API_BASE;
    const defaultAvatar = API_BASE + '/images/fun-banner.jpg';
    get('/api/auth/booster/profile')
      .then((p) => {
        if (p) {
          p.avatar = p.avatar ? (p.avatar.startsWith('http') ? p.avatar : API_BASE + p.avatar) : defaultAvatar;
        }
        this.setData({ profile: p });
      })
      .catch(() => this.setData({ profile: null }));
  },

  // 上传头像
  uploadAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中', mask: true });
        wx.uploadFile({
          url: require('../../utils/config').API_BASE + '/api/auth/booster/avatar',
          filePath: res.tempFilePaths[0],
          name: 'avatar',
          header: { Authorization: 'Bearer ' + (getApp().globalData.token || '') },
          success: (r) => {
            wx.hideLoading();
            wx.showToast({ title: '头像已更新', icon: 'success' });
            that.loadProfile();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        });
      }
    });
  },

  // 打开编辑弹窗（预填当前值；modes/tags 数组转逗号分隔）
  openEdit() {
    const p = this.data.profile;
    if (!p) return wx.showToast({ title: '尚未上架大神榜，请联系管理员', icon: 'none' });
    this.setData({
      showEdit: true,
      eName: p.name,
      eRank: p.rank || '',
      eScore: String(p.score),
      ePrice: String(p.price),
      eModes: (p.modes || []).join('，'),
      eTags: (p.tags || []).join('，'),
      eDesc: p.desc || ''
    });
  },
  closeEdit() { this.setData({ showEdit: false }); },
  onEName(e) { this.setData({ eName: e.detail.value }); },
  onERank(e) { this.setData({ eRank: e.detail.value }); },
  onEScore(e) { this.setData({ eScore: e.detail.value }); },
  onEPrice(e) { this.setData({ ePrice: e.detail.value }); },
  onEModes(e) { this.setData({ eModes: e.detail.value }); },
  onETags(e) { this.setData({ eTags: e.detail.value }); },
  onEDesc(e) { this.setData({ eDesc: e.detail.value }); },

  // 逗号分隔字符串 → 数组（支持中文逗号）
  splitList(s) { return String(s || '').split(/[,，]/).map((x) => x.trim()).filter(Boolean); },

  saveProfile() {
    const d = this.data;
    if (!d.eName.trim()) return wx.showToast({ title: '名字必填', icon: 'none' });
    put('/api/auth/booster/profile', {
      name: d.eName.trim(),
      rank: d.eRank.trim(),
      score: Number(d.eScore) || 0,
      price: Number(d.ePrice) || 0,
      modes: this.splitList(d.eModes),
      tags: this.splitList(d.eTags),
      desc: d.eDesc.trim()
    })
      .then(() => {
        this.setData({ showEdit: false });
        wx.showToast({ title: '资料已更新', icon: 'success' });
        this.loadProfile();
      })
      .catch((e) => wx.showToast({ title: e.message || '保存失败', icon: 'none' }));
  }
});
