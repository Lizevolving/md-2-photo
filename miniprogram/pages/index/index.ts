interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  hasContent: boolean;
}

Page<IPageData>({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    hasContent: false
  },

  handleQuestionInput(e: WechatMiniprogram.Input) {
    this.setData({
      questionContent: e.detail.value,
      hasContent: !!(e.detail.value || this.data.answerContent)
    });
  },

  handleAnswerInput(e: WechatMiniprogram.Input) {
    this.setData({
      answerContent: e.detail.value,
      hasContent: !!(e.detail.value || this.data.questionContent)
    });
  },

  async handlePasteQuestion() {
    try {
      const { data } = await wx.getClipboardData();
      this.setData({
        questionContent: data,
        hasContent: !!(data || this.data.answerContent)
      });
    } catch (error) {
      wx.showToast({
        title: '粘贴失败',
        icon: 'none'
      });
    }
  },

  async handlePasteAnswer() {
    try {
      const { data } = await wx.getClipboardData();
      this.setData({
        answerContent: data,
        hasContent: !!(data || this.data.questionContent)
      });
    } catch (error) {
      wx.showToast({
        title: '粘贴失败',
        icon: 'none'
      });
    }
  },

  handleFullscreen() {
    wx.showToast({
      title: '全屏编辑功能开发中',
      icon: 'none'
    });
  },

  handleClear() {
    if (!this.data.hasContent) return;
    
    wx.showModal({
      title: '提示',
      content: '确定要清空所有内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            questionContent: '',
            answerContent: '',
            hasContent: false
          });
        }
      }
    });
  },

  handleConvertToImage() {
    if (!this.data.hasContent) return;
    
    wx.navigateTo({
      url: '/pages/preview/preview'
    });
  },

  handleConvertToText() {
    if (!this.data.hasContent) return;
    
    wx.showToast({
      title: '纯文本转换功能开发中',
      icon: 'none'
    });
  },

  handleWatermarkChange(e: WechatMiniprogram.Switch) {
    this.setData({
      showWatermark: e.detail.value
    });
  }
}); 