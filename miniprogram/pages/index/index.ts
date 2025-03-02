interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  hasContent: boolean;
}

type IPageInstance = WechatMiniprogram.Page.Instance<IPageData, WechatMiniprogram.IAnyObject>;

Page({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    hasContent: false
  },

  onLoad() {
    // 页面加载时的初始化逻辑
    console.log('页面加载');
    // 检查剪贴板是否有内容
    this.checkClipboard();
  },

  onReady() {
    // 页面初次渲染完成时的逻辑
    console.log('页面渲染完成');
  },

  onShow() {
    // 页面显示时的逻辑
    console.log('页面显示');
  },

  onHide() {
    // 页面隐藏时的逻辑
  },

  onUnload() {
    // 页面卸载时的逻辑
  },

  onPullDownRefresh() {
    // 下拉刷新时的逻辑
  },

  onReachBottom() {
    // 页面上拉触底时的逻辑
  },

  onShareAppMessage() {
    // 用户点击右上角分享时的逻辑
    return {
      title: '文图 - 问答转换工具',
      path: '/pages/index/index'
    };
  },

  /**
   * 检查剪贴板是否有内容
   */
  async checkClipboard() {
    try {
      const { data } = await wx.getClipboardData();
      console.log('剪贴板内容:', data);
    } catch (error) {
      console.error('获取剪贴板内容失败:', error);
    }
  },

  /**
   * 处理问题输入
   */
  handleQuestionInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    console.log('问题输入:', value);
    this.setData({
      questionContent: value,
      hasContent: !!(value || this.data.answerContent)
    });
  },

  /**
   * 处理回答输入
   */
  handleAnswerInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    console.log('回答输入:', value);
    this.setData({
      answerContent: value,
      hasContent: !!(value || this.data.questionContent)
    });
  },

  /**
   * 通用粘贴方法
   * @param type 粘贴类型：'question' 或 'answer'
   */
  async handlePaste(type: 'question' | 'answer') {
    try {
      console.log(`开始${type === 'question' ? '问题' : '回答'}粘贴操作`);
      
      // 获取剪贴板内容
      const { data } = await wx.getClipboardData();
      
      if (!data) {
        wx.showToast({
          title: '剪贴板为空',
          icon: 'none'
        });
        return;
      }
      
      console.log(`粘贴内容: ${data.substring(0, 20)}${data.length > 20 ? '...' : ''}`);
      
      // 根据类型更新不同的数据
      if (type === 'question') {
        this.setData({
          questionContent: data,
          hasContent: !!(data || this.data.answerContent)
        });
      } else {
        this.setData({
          answerContent: data,
          hasContent: !!(data || this.data.questionContent)
        });
      }

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

  /**
   * 处理问题粘贴
   */
  async handlePasteQuestion() {
    await this.handlePaste('question');
  },

  /**
   * 处理回答粘贴
   */
  async handlePasteAnswer() {
    await this.handlePaste('answer');
  },

  /**
   * 处理全屏编辑
   */
  handleFullscreen() {
    if (!this.data.hasContent) return;
    
    console.log('进入全屏编辑模式');
    
    // 导航到全屏编辑页面，并传递问题和回答内容        // 为什么这里传数据这么丝滑，之前折腾半天？
    wx.navigateTo({
      url: '/pages/fullscreen/fullscreen?questionContent=' + encodeURIComponent(this.data.questionContent) + '&answerContent=' + encodeURIComponent(this.data.answerContent)
    });
  },

  /**
   * 处理清空内容
   */
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
          console.log('内容已清空');
        }
      }
    });
  },

  /**
   * 处理转换为图片
   */
  handleConvertToImage() {
    if (!this.data.hasContent) return;
    
    console.log('准备转换为图片');
    console.log('问题内容长度:', this.data.questionContent.length);
    console.log('回答内容长度:', this.data.answerContent.length);
    
    wx.navigateTo({
      url: '/pages/preview/preview?questionContent=' + encodeURIComponent(this.data.questionContent) + '&answerContent=' + encodeURIComponent(this.data.answerContent) + '&showWatermark=' + this.data.showWatermark
    });
  },

  /**
   * 处理转换为纯文本
   */
  handleConvertToText() {
    if (!this.data.hasContent) return;
    
    console.log('转换为纯文本');
    
    // 组合问题和回答内容
    const textContent = `问题：\n${this.data.questionContent}\n\n回答：\n${this.data.answerContent}`;
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: textContent,
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
  },

  /**
   * 处理水印开关变化
   */
  handleWatermarkChange(e: any) {
    this.setData({
      showWatermark: e.detail.value
    });
    console.log('水印状态:', e.detail.value);
  }
}); 