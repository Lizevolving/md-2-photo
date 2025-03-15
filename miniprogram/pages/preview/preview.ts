interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  canvasWidth: number;
  canvasHeight: number;
  currentTemplate: string;
}

type CanvasContext = WechatMiniprogram.CanvasContext;
type IPageInstance = WechatMiniprogram.Page.Instance<IPageData>;

Page<IPageData, IPageInstance>({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    canvasWidth: 0,
    canvasHeight: 0,
    currentTemplate: 'default' // 当前使用的模板
  },

  onLoad(options?: Record<string, string | undefined>) {
    if (!options) return;
    
    // 解析传入的内容
    this.parseContent(options);
    // 初始化画布尺寸
    this.initCanvasSize();
  },

  /**
   * 解析传入的内容
   */
  parseContent(options: Record<string, string | undefined>) {
    const { questionContent, answerContent, showWatermark } = options;
    
    this.setData({
      questionContent: questionContent ? decodeURIComponent(questionContent) : '',
      answerContent: answerContent ? decodeURIComponent(answerContent) : '',
      showWatermark: showWatermark === 'true'
    });
  },

  /**
   * 初始化画布尺寸
   */
  initCanvasSize() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          canvasWidth: res.windowWidth,
          canvasHeight: res.windowHeight
        }, () => {
          // 初始化完成后渲染画布
          this.renderToCanvas();
        });
      }
    });
  },

  /**
   * 渲染内容到画布
   */
  async renderToCanvas() {
    const query = wx.createSelectorQuery();
    const canvas = await new Promise<WechatMiniprogram.Canvas>(resolve => {
      query.select('#previewCanvas')
        .fields({ node: true, size: true })
        .exec((res) => resolve(res[0].node));
    });

    const ctx = canvas.getContext('2d');
    
    // 设置画布尺寸（高清显示）
    const dpr = wx.getSystemInfoSync().pixelRatio;
    canvas.width = this.data.canvasWidth * dpr;
    canvas.height = this.data.canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // 根据当前模板渲染内容
    await this.renderTemplate(ctx);
  },

  /**
   * 根据模板渲染内容
   */
  async renderTemplate(ctx: any) {
    // 清空画布
    ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);

    switch (this.data.currentTemplate) {
      case 'simple':
        await this.renderSimpleTemplate(ctx);
        break;
      case 'book':
        await this.renderBookTemplate(ctx);
        break;
      case 'dialog':
        await this.renderDialogTemplate(ctx);
        break;
      default:
        await this.renderDefaultTemplate(ctx);
    }
  },

  /**
   * 渲染默认模板
   */
  async renderDefaultTemplate(ctx: any) {
    // 绘制背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制内容区域
    ctx.fillStyle = '#1a1a1a';
    const contentPadding = 20;
    const contentWidth = this.data.canvasWidth - (contentPadding * 2);
    ctx.fillRect(contentPadding, 60, contentWidth, this.data.canvasHeight - 120);

    // 绘制问题部分
    let currentY = 90;
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('问题', contentPadding + 10, currentY);
    
    currentY += 30;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    currentY = this.drawWrappedText(ctx, this.data.questionContent, contentPadding + 10, currentY, contentWidth - 20);

    // 绘制回答部分
    currentY += 30;
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('回答', contentPadding + 10, currentY);
    
    currentY += 30;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    currentY = this.drawWrappedText(ctx, this.data.answerContent, contentPadding + 10, currentY, contentWidth - 20);

    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '12px sans-serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 绘制自动换行的文本，返回最后一行的Y坐标
   */
  drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number): number {
    const lineHeight = 24;
    const chars = text.split('');
    let line = '';
    let currentY = y;

    for (const char of chars) {
      const testLine = line + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, currentY);
        line = char;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    if (line.length > 0) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  },

  /**
   * 导出图片
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
   * 分享给好友
   */
  shareToFriends() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
  },

  /**
   * 分享到朋友圈
   */
  shareToMoments() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareTimeline']
    });
  },

  /**
   * 分享到其他平台
   */
  shareToOther() {
    wx.showActionSheet({
      itemList: ['复制链接', '生成海报', '保存图片'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            // 复制链接逻辑
            break;
          case 1:
            // 生成海报逻辑
            break;
          case 2:
            this.saveImage();
            break;
        }
      }
    });
  },

  /**
   * 切换水印显示
   */
  toggleWatermark(e: WechatMiniprogram.SwitchChange) {
    this.setData({ showWatermark: e.detail.value }, () => {
      this.renderToCanvas();
    });
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack();
  }
}); 