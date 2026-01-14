const app = getApp();
const recorderManager = wx.getRecorderManager();

Page({
  data: {
    completionDate: '',
    partnerConfirmed: false,
    mediaList: [], // {type: 'image'|'video', tempFilePath: '', ...}
    isRecording: false,
    audioPath: '',
    audioDuration: 0,
    moods: ['😊', '😂', '🥰', '😎', '😭', '😡', '🤔', '😴', '🥳', '🤯'],
    selectedMood: '',
    summary: '',
    cost: '',
    location: null, // {name: '', address: '', latitude: 0, longitude: 0}
    showMoodPicker: false
  },

  onLoad(options) {
    if (options.id) {
       this.setData({ itemId: options.id });
       wx.setNavigationBarTitle({ title: `打卡 - ${options.title || ''}` });
    }

    const today = new Date().toISOString().split('T')[0];
    this.setData({
      completionDate: today
    });
    // ... rest of onLoad
    recorderManager.onStop((res) => {
      console.log('recorder stop', res);
      this.setData({
        audioPath: res.tempFilePath,
        audioDuration: Math.round(res.duration / 1000)
      });
    });
  },

  bindDateChange(e) {
    this.setData({
      completionDate: e.detail.value
    });
  },

  toggleConfirmation(e) {
    this.setData({
      partnerConfirmed: e.detail.value
    });
  },

  chooseMedia() {
    const currentCount = this.data.mediaList.length;
    wx.chooseMedia({
      count: 9 - currentCount,
      mediaType: ['mix'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles = res.tempFiles.map(file => ({
          type: file.fileType,
          tempFilePath: file.tempFilePath,
          thumbTempFilePath: file.thumbTempFilePath || file.tempFilePath
        }));
        this.setData({
          mediaList: this.data.mediaList.concat(newFiles)
        });
      }
    });
  },

  deleteMedia(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.mediaList;
    list.splice(index, 1);
    this.setData({
      mediaList: list
    });
  },

  previewMedia(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.mediaList[index];
    if (item.type === 'video') {
       // Video preview logic if needed, or just let users view in full screen
    } else {
      const urls = this.data.mediaList
        .filter(m => m.type === 'image')
        .map(m => m.tempFilePath);
      wx.previewImage({
        current: item.tempFilePath,
        urls: urls
      });
    }
  },

  startRecord() {
    this.setData({ isRecording: true });
    recorderManager.start({
      duration: 30000,
      format: 'mp3'
    });
  },

  stopRecord() {
    this.setData({ isRecording: false });
    recorderManager.stop();
  },

  playRecord() {
    if (!this.data.audioPath) return;
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.autoplay = true;
    innerAudioContext.src = this.data.audioPath;
    innerAudioContext.onPlay(() => {
      console.log('开始播放');
    });
  },

  deleteRecord() {
    this.setData({ audioPath: '', audioDuration: 0 });
  },

  selectMood(e) {
    this.setData({
      selectedMood: e.currentTarget.dataset.mood
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      }
    });
  },

  inputSummary(e) {
    this.setData({ summary: e.detail.value });
  },

  inputCost(e) {
    this.setData({ cost: e.detail.value });
  },

  // Helper to upload file
  uploadFile(path, folder = 'wishlist') {
    return new Promise((resolve, reject) => {
      const suffix = path.split('.').pop();
      const cloudPath = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2)}.${suffix}`;
      wx.cloud.uploadFile({
        cloudPath,
        filePath: path,
        success: res => resolve(res.fileID),
        fail: err => reject(err)
      });
    });
  },

  async submitForm() {
    const { itemId, completionDate, partnerConfirmed, mediaList, audioPath, selectedMood, summary, cost, location } = this.data;

    // Validation
    if (!completionDate) {
      wx.showToast({ title: '请选择完成日期', icon: 'none' });
      return;
    }
    if (!partnerConfirmed) {
      wx.showToast({ title: '需双方确认哦', icon: 'none' }); 
      return;
    }

    wx.showLoading({ title: '上传中...' });

    try {
      // 1. Upload Media
      const uploadedMedia = [];
      for (let media of mediaList) {
        const fileID = await this.uploadFile(media.tempFilePath, 'wishlist/media');
        uploadedMedia.push({
          type: media.type,
          fileID: fileID
        });
      }

      // 2. Upload Audio
      let audioFileID = '';
      if (audioPath) {
        audioFileID = await this.uploadFile(audioPath, 'wishlist/audio');
      }

      // 3. Submit to Cloud Function
      const res = await wx.cloud.callFunction({
        name: 'nestFunctions', // Changed
        data: {
          type: 'wishlist',
          action: 'checkIn',
          payload: {
            itemId,
            completionDate,
            partnerConfirmed,
            mediaList: uploadedMedia,
            audioFileID,
            audioDuration: this.data.audioDuration,
            selectedMood,
            summary,
            cost,
            location
          }
        }
      });

      wx.hideLoading();
      if (res.result.code === 0) {
         wx.showToast({ title: '打卡成功！' });
         // Notify previous page to refresh
         const pages = getCurrentPages();
         const prevPage = pages[pages.length - 2];
         if (prevPage && prevPage.getList) {
           prevPage.getList();
         }
         setTimeout(() => wx.navigateBack(), 1500);
      } else {
        throw new Error(res.result.msg);
      }

    } catch (err) {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '打卡失败，请重试', icon: 'none' });
    }
  }
});
