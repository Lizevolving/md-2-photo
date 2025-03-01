Page({
  data: {
    content: '',
    nodes: []
  },

  onLoad(options: Record<string, string>) {
    if (options.content) {
      const content = decodeURIComponent(options.content);
      this.setData({
        content,
        // 这里需要添加 Markdown 转换逻辑
        nodes: [{
          type: 'text',
          text: content
        }]
      });
    }
  },

  onSave() {
    // TODO: 实现保存图片功能
    wx.showToast({
      title: '保存功能开发中',
      icon: 'none'
    });
  },

  onBack() {
    wx.navigateBack();
  }
}); 