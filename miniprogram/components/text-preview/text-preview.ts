

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

  data: {
    plainContent: ''
  },

  observers: {                       // 微信小程序提供的更高级的监听机制，更适合处理复杂的监听逻辑
    content: function(content) {
      console.log('Content changed:', content);    // 调试日志
      const { removeMarkdown } = require('../../utils/removemarkdown');
      this.setData({
        plainContent: removeMarkdown(content)
      }, () => {
        console.log('plainContent updated:', this.data.plainContent); // 调试日志
      });
    }
  },

  methods: {
    handleClose() {
      this.setData({ visible: false });
      this.triggerEvent('close');
    },

    handleCopy() {
      const content = this.data.plainContent;
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