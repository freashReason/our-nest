const app = getApp();

Page({
  data: {
    wishlist: []
  },

  onLoad() {
    this.getList();
  },

  getList() {
    wx.showLoading({ title: '加载中' });
    wx.cloud.callFunction({
      name: 'nestFunctions',
      data: { 
        type: 'wishlist',
        action: 'getWishlist' 
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.code === 0) {
        this.setData({ wishlist: res.result.data });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
    });
  },

  goCheckIn(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/model-wishlist/pages/check-in/index?id=${item._id}&title=${item.title}`
    });
  },

  onAddWish() {
    // wx.showActionSheet limit is 6 items
    const icons = ['✨', '❤️', '🌟', '🎮', '✈️', '🏠'];
    
    wx.showActionSheet({
      itemList: icons,
      alertText: '请选择一个心愿图标',
      success: (res) => {
        const selectedIcon = icons[res.tapIndex];
        
        wx.showModal({
          title: '新建心愿',
          editable: true,
          placeholderText: '请输入心愿名称',
          success: (modalRes) => {
            if (modalRes.confirm && modalRes.content) {
              wx.showLoading({ title: '创建中...' });
              
              wx.cloud.callFunction({
                name: 'nestFunctions',
                data: {
                  type: 'wishlist',
                  action: 'addWishItem',
                  payload: {
                    title: modalRes.content,
                    icon: selectedIcon
                  }
                }
              }).then(result => {
                wx.hideLoading();
                if (result.result.code === 0) {
                  wx.showToast({ title: '添加成功' });
                  this.getList(); 
                }
              }).catch(err => {
                wx.hideLoading();
                wx.showToast({ title: '添加失败', icon: 'none' });
                console.error(err);
              });
            }
          }
        });
      }
    });
  }
});
