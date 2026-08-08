const { getCatalog } = require('../../utils/catalog');
const { syncTheme } = require('../../utils/theme');

Page({
  data: {
    all: [],       // 全部打手
    list: [],      // 按标签过滤后的展示列表
    tags: [],      // 标签筛选条（含「全部」）
    selTag: ''
  },

  onShow() { syncTheme(this); },

  onLoad() {
    getCatalog().then((c) => {
      const all = c.boosters || [];
      // 收集所有打手标签去重，作为筛选条（用完整标签，不截断）
      const tags = [...new Set(all.flatMap((b) => b.tags || []))];
      this.setData({ all, tags, list: all.map(this.showTags) });
    });
  },

  // 卡片最多显示 3 个标签，避免标签多时撑爆换行
  showTags(b) { return { ...b, tags: (b.tags || []).slice(0, 3) }; },

  // 按标签筛选打手（空标签 = 全部）
  pickTag(e) {
    const t = e.currentTarget.dataset.t || '';
    const list = (t ? this.data.all.filter((b) => (b.tags || []).includes(t)) : this.data.all)
      .map(this.showTags);
    this.setData({ selTag: t, list });
  },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  }
});
