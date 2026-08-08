/**
 * 主题同步：把 app.globalData.theme 写到页面 data.theme
 * wxml 根节点 class="page {{theme}}" 配合 app.wxss 的 .page.theme-dark 切换亮/暗色
 * 每个页面的 onShow 调用一次（从设置页切回时也能即时生效）
 */
function syncTheme(page) {
  const dark = getApp().globalData.theme === 'dark';
  page.setData({ theme: dark ? 'theme-dark' : '' });
}

module.exports = { syncTheme };
