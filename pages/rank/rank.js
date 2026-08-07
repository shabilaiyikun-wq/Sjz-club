const { RANK_BOOSTER, RANK_BOSS } = require('../../data.js');

Page({
  data: {
    rankType: 'booster',
    list: RANK_BOOSTER
  },

  switchRank(e) {
    const t = e.currentTarget.dataset.t;
    this.setData({ rankType: t, list: t === 'booster' ? RANK_BOOSTER : RANK_BOSS });
  }
});
