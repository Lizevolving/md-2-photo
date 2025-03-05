Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    answerContent: {
      type: String,
      value: ''
    }
  },

  data: {
    expanded: false,
    showExpandButton: false,
    lineCount: 0
  },

  observers: {
    'answerContent': function(answerContent: string) {
      const lineCount = answerContent.split('\n').length;
      
      this.setData({
        showExpandButton: lineCount > 3,
        lineCount
      });
    }
  },

  methods: {
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

    handleCancel() {
      // 先触发动画
      this.setData({ visible: false });
      // 延迟触发事件以确保动画完成
      setTimeout(() => {
        this.triggerEvent('cancel');
      }, 300); // 与动画时间保持一致
    }
  }
});