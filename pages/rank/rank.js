const { get } = require('../../utils/request');
const { syncTheme } = require('../../utils/theme');

Page({
  data: {
    list: []
  },

  onShow() { syncTheme(this); this.loadRankings(); },

  // 拉取老板消费榜（API 优先，失败用空列表兜底）
  loadRankings() {
    get('/api/rankings').then((d) => {
      this.setData({ list: d.list || [] });
    }).catch(() => {
      this.setData({ list: [] });
    });
  },

  // 下拉刷新（页面上划到底重新拉）
  onPullDownRefresh() { this.loadRankings().then(() => wx.stopPullDownRefresh()); }
});
