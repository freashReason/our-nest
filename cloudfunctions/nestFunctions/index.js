const getOpenId = require('./getOpenId/index');
const getUserInfo = require('./getUserInfo/index');
const addPhotos = require('./addPhotos/index');
const delPhotos = require('./delPhotos/index');
const getAnniversary = require('./getAnniversary/index');
const wishlist = require('./wishlist/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId.main(event, context);
    case 'getUserInfo':
      return await getUserInfo.main(event, context);
    case 'addPhotos':
      return await addPhotos.main(event, context);
    case 'delPhotos':
      return await delPhotos.main(event, context);
    case 'getAnniversary':
      return await getAnniversary.main(event, context);
    case 'wishlist':
      // Wishlist uses 'action' inside event to distinguish sub-ops, 
      // but the main switch uses 'type'. 
      // So we pass the whole event to the wishlist module.
      return await wishlist.main(event, context);
    default:
      console.error('云函数调用错误，未找到入口');
      break;
  }
};
