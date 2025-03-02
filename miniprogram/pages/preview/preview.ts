interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

Page<IPageData>({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    canvasWidth: 0,
    canvasHeight: 0
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

    if (options.showWatermark) {
      this.setData({
        showWatermark: options.showWatermark === 'true'
      });
    }

    console.log('预览页面加载完成');
    
    // 获取系统信息，设置画布大小
    wx.getSystemInfo({
      success: (res) => {
        const width = res.windowWidth;
        const height = res.windowHeight;
        
        this.setData({
          canvasWidth: width,
          canvasHeight: height
        });
        
        // 延迟一下再渲染，确保数据已经设置好
        setTimeout(() => {
          this.renderToCanvas();
        }, 300);
      }
    });
  },

  /**
   * 渲染内容到画布
   */
  renderToCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#previewCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置画布大小
        canvas.width = this.data.canvasWidth * 2;  // 高清显示
        canvas.height = this.data.canvasHeight * 2;
        ctx.scale(2, 2);
        
        // 绘制背景
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
        
        // 绘制内容区域背景
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(20, 60, this.data.canvasWidth - 40, this.data.canvasHeight - 120);
        
        // 绘制标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('文图', 20, 40);
        
        // 绘制问题标签
        ctx.fillStyle = '#4080ff';
        ctx.font = '16px sans-serif';
        ctx.fillText('问题', 30, 90);
        
        // 绘制问题内容
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        this.wrapText(ctx, this.data.questionContent, 30, 120, this.data.canvasWidth - 60, 20);
        
        // 计算问题文本高度
        const questionHeight = this.calculateTextHeight(ctx, this.data.questionContent, this.data.canvasWidth - 60, 20);
        
        // 绘制回答标签
        ctx.fillStyle = '#4080ff';
        ctx.font = '16px sans-serif';
        ctx.fillText('回答', 30, 140 + questionHeight);
        
        // 绘制回答内容
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        this.wrapText(ctx, this.data.answerContent, 30, 170 + questionHeight, this.data.canvasWidth - 60, 20);
        
        // 绘制水印
        if (this.data.showWatermark) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.font = '12px sans-serif';
          ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
        }
      });
  },

  /**
   * 文本换行绘制
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    
    const words = text.split('');
    let line = '';
    let testLine = '';
    let lineCount = 0;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y + (lineCount * lineHeight));
        line = words[n];
        lineCount++;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, y + (lineCount * lineHeight));
    return lineCount + 1;
  },

  /**
   * 计算文本高度
   */
  calculateTextHeight(ctx, text, maxWidth, lineHeight) {
    if (!text) return 0;
    
    const words = text.split('');
    let line = '';
    let testLine = '';
    let lineCount = 0;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        line = words[n];
        lineCount++;
      } else {
        line = testLine;
      }
    }
    
    return (lineCount + 1) * lineHeight;
  },

  /**
   * 保存图片
   */
  saveImage() {
    wx.canvasToTempFilePath({
      canvas: wx.createSelectorQuery().select('#previewCanvas').node(),
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: (err) => {
            console.error('保存失败:', err);
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('生成图片失败:', err);
        wx.showToast({
          title: '生成图片失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack();
  }
}); 