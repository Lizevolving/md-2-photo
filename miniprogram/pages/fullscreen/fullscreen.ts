interface IPageData {
  questionContent: string;
  answerContent: string;
  activeTab: 'question' | 'answer';
}

Page({
  data: {
    questionContent: '',
    answerContent: '',
    activeTab: 'question' as 'question' | 'answer'
  },

  onLoad(options) {
    // 获取传递的参数
    if (options.questionContent) {
      this.setData({
        questionContent: decodeURIComponent(options.questionContent)
      });
    }

    if (options.answerContent) {
      this.setData({
        answerContent: decodeURIComponent(options.answerContent)
      });
    }

    console.log('全屏编辑页面加载完成');
  },

  /**
   * 处理问题输入
   */
  handleQuestionInput(e: WechatMiniprogram.Input) {
    this.setData({
      questionContent: e.detail.value
    });
  },

  /**
   * 处理回答输入
   */
  handleAnswerInput(e: WechatMiniprogram.Input) {
    this.setData({
      answerContent: e.detail.value
    });
  },

  /**
   * 切换标签页
   */
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab as 'question' | 'answer';
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 保存并返回
   */
  saveAndReturn() {
    // 获取上一页实例
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    // 更新上一页数据
    prevPage.setData({
      questionContent: this.data.questionContent,
      answerContent: this.data.answerContent,
      hasContent: !!(this.data.questionContent || this.data.answerContent)
    });

    // 返回上一页
    wx.navigateBack();
  },

  /**
   * 取消并返回
   */
  cancelAndReturn() {
    wx.navigateBack();
  }
}); 