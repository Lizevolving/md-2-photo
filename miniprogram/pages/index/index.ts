interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  hasContent: boolean;
}

type IPageInstance = WechatMiniprogram.Page.Instance<IPageData, WechatMiniprogram.IAnyObject>;

Page<IPageData, IPageInstance>({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    hasContent: false
  },

  onLoad() {
    // 页面加载时的初始化逻辑
  },

  onShow() {
    // 页面显示时的逻辑
  },

  onHide() {
    // 页面隐藏时的逻辑
  },

  onUnload() {
    // 页面卸载时的逻辑
  },

  handleQuestionInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    this.setData({
      questionContent: value,
      hasContent: !!(value || this.data.answerContent)
    });
  },

  handleAnswerInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    this.setData({
      answerContent: value,
      hasContent: !!(value || this.data.questionContent)
    });
  },

  async handlePasteQuestion() {
    try {
      const { data } = await wx.getClipboardData();
      if (!data) {
        wx.showToast({
          title: '剪贴板为空',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        questionContent: data,
        hasContent: !!(data || this.data.answerContent)
      });

      wx.showToast({
        title: '粘贴成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('粘贴失败:', error);
      wx.showToast({
        title: '粘贴失败',
        icon: 'none'
      });
    }
  },

  async handlePasteAnswer() {
    try {
      const { data } = await wx.getClipboardData();
      if (!data) {
        wx.showToast({
          title: '剪贴板为空',
          icon: 'none'
        });
        return;
      }

      this.setData({
        answerContent: data,
        hasContent: !!(data || this.data.questionContent)
      });

      wx.showToast({
        title: '粘贴成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('粘贴失败:', error);
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

  handleWatermarkChange(e: any) {
    this.setData({
      showWatermark: e.detail.value
    });
  },

  onInput(e: WechatMiniprogram.Input) {
    this.setData({
      content: e.detail.value
    });
  },

  onPreview() {
    if (!this.data.content.trim()) {
      wx.showToast({
        title: '请先输入内容',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/preview/preview?content=' + encodeURIComponent(this.data.content)
    });
  },

  onClear() {
    this.setData({
      content: ''
    });
  }
}); 