const { BOOSTERS } = require('../../data.js');
const { getCatalog } = require('../../utils/catalog');

Page({
  data: {
    list: BOOSTERS
  },

  onLoad() {
    getCatalog().then((c) => this.setData({ list: c.boosters }));
  },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  }
});
