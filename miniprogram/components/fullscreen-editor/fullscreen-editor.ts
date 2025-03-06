Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    questionContent: {
      type: String,
      value: ''
    },
    answerContent: {
      type: String,
      value: ''
    }
  },

  data: {
    activeTab: 'question' as 'question' | 'answer',
    expanded: false,
    showExpandButton: false,
    lineCount: 0
  },

  observers: {
    'questionContent, answerContent': function(questionContent: string, answerContent: string) {
      // 计算当前激活标签页的内容行数
      const content = this.data.activeTab === 'question' ? questionContent : answerContent;
      const lineCount = content.split('\n').length;
      
      this.setData({
        showExpandButton: lineCount > 3,
        lineCount
      });
    }
  },

  methods: {
    switchTab(e: any) {
      const tab = e.currentTarget.dataset.tab as 'question' | 'answer';
      this.setData({ 
        activeTab: tab,
        expanded: false // Reset expanded state when switching tabs
      });

      // 切换标签页时重新计算是否显示展开按钮
      const content = tab === 'question' ? this.data.questionContent : this.data.answerContent;
      const lineCount = content.split('\n').length;
      this.setData({
        showExpandButton: lineCount > 3
      });
    },

    handleQuestionInput(e: WechatMiniprogram.Input) {
      const value = e.detail.value;
      this.setData({ questionContent: value });
      this.triggerEvent('questionInput', { value });
    },

    handleAnswerInput(e: WechatMiniprogram.Input) {
      const value = e.detail.value;
      this.setData({ answerContent: value });
      this.triggerEvent('answerInput', { value });
    },

    toggleExpand() {
      this.setData({
        expanded: !this.data.expanded
      });
    },

    handleSave() {
      this.triggerEvent('save', {
        questionContent: this.data.questionContent,
        answerContent: this.data.answerContent
      });
      // 先触发动画
      this.setData({ visible: false });
      // 延迟触发事件以确保动画完成
      setTimeout(() => {
        this.triggerEvent('saved');
      }, 300);
    },

    handleCancel() {
      // 先触发动画
      this.setData({ visible: false });
      // 延迟触发事件以确保动画完成
      setTimeout(() => {
        this.triggerEvent('cancel');
      }, 300);
    }
  }
});