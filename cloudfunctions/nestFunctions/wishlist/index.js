const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { action, payload } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'getWishlist':
        // Get all wishlist items
        const res = await db.collection('wishlist_items')
          .orderBy('createTime', 'desc')
          .limit(100)
          .get();
        return {
           code: 0,
           data: res.data
        };

      case 'addWishItem':
        // payload: { title, icon }
        const addRes = await db.collection('wishlist_items').add({
          data: {
            ...payload,
            completed: false,
            createTime: db.serverDate(),
            _openid: openid
          }
        });
        return {
          code: 0,
          data: { ...payload, _id: addRes._id }
        };

      case 'checkIn':
        // payload: { itemId, completionDate, ... }
        const { itemId, ...recordData } = payload;
        
        await db.collection('wishlist_records').add({
          data: {
            itemId,
            ...recordData,
            checkInTime: db.serverDate(),
            _openid: openid
          }
        });

        await db.collection('wishlist_items').doc(itemId).update({
          data: {
            completed: true,
            finishTime: db.serverDate()
          }
        });

        return { code: 0, msg: '打卡成功' };
        
      default:
        return { code: -1, msg: 'Unknown wishlist action' };
    }
  } catch (err) {
    console.error(err);
    return { code: -1, msg: err.message };
  }
};
