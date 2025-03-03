Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    content: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleClose() {
      this.triggerEvent('close');
    },

    handleCopy() {
      const content = this.data.content;
      wx.setClipboardData({
        data: content,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('复制失败:', err);
          wx.showToast({
            title: '复制失败',
            icon: 'none'
          });
        }
      });
    }
  }
});