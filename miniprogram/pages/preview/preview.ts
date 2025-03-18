// 手动定义 simple-markdown 类型，避免类型错误
declare module '@khanacademy/simple-markdown' {
  export function defaultBlockParse(source: string): any[];
  export function defaultInlineParse(source: string): any[];
  export function defaultImplicitParse(source: string): any[];
  export function parserFor(rules: any): (source: string, state?: any) => any[];
  export function outputFor(rules: any, key: string): (tree: any[], state?: any) => any;
  export const defaultRules: any;
}

declare interface TextMetrics {
  width: number;
}

declare interface CanvasRenderingContext2D {
  font: string;
  fillStyle: string | any;
  strokeStyle: string | any;
  lineWidth: number;
  measureText(text: string): TextMetrics;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  scale(x: number, y: number): void;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

import SimpleMarkdown from '@khanacademy/simple-markdown';
import { CanvasRenderUtils } from '../../utils/renderUtils';
import { MarkdownRenderer, IMarkdownNode, defaultMarkdownStyles, RenderContext } from '../../utils/markdownRenderer';

interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  canvasWidth: number;
  canvasHeight: number;
  currentTemplate: string;
  parsedQuestion: IMarkdownNode[];
  parsedAnswer: IMarkdownNode[];
  isRendering: boolean;
  renderProgress: number;
}

type CanvasContext = WechatMiniprogram.CanvasContext;

// 定义模板样式
interface TemplateStyle {
  backgroundColor: string;
  contentBackgroundColor: string;
  titleColor: string;
  watermarkColor: string;
  padding: number;
}

// 模板样式集合
const templateStyles: {[key: string]: TemplateStyle} = {
  default: {
    backgroundColor: '#000000',
    contentBackgroundColor: '#1a1a1a',
    titleColor: '#ffffff',
    watermarkColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20
  },
  simple: {
    backgroundColor: '#ffffff',
    contentBackgroundColor: '#f5f5f5',
    titleColor: '#333333',
    watermarkColor: 'rgba(0, 0, 0, 0.1)',
    padding: 30
  },
  book: {
    backgroundColor: '#f8f4e5',
    contentBackgroundColor: '#ffffff',
    titleColor: '#5d4037',
    watermarkColor: 'rgba(93, 64, 55, 0.1)',
    padding: 40
  },
  dialog: {
    backgroundColor: '#121212',
    contentBackgroundColor: '#1e1e1e',
    titleColor: '#4080ff',
    watermarkColor: 'rgba(64, 128, 255, 0.1)',
    padding: 15
  }
};

// 使用无泛型参数的 Page 定义，避免类型错误
Page({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    canvasWidth: 0,
    canvasHeight: 0,
    currentTemplate: 'default', // 当前使用的模板
    parsedQuestion: [] as IMarkdownNode[],
    parsedAnswer: [] as IMarkdownNode[],
    isRendering: false,
    renderProgress: 0
  } as IPageData,

  // 创建 Markdown 解析器
  mdParser: null as any,
  canvasNode: null as any,
  canvasContext: null as any,

  onLoad(options?: Record<string, string | undefined>) {
    if (!options) return;
    
    // 初始化 Markdown 解析器
    this.initMarkdownParser();
    
    // 解析传入的内容
    this.parseContent(options);
    
    // 初始化画布尺寸
    this.initCanvasSize();
  },

  /**
   * 初始化 Markdown 解析器
   */
  initMarkdownParser() {
    // 使用 simple-markdown 的默认规则
    this.mdParser = SimpleMarkdown.defaultBlockParse;
  },

  /**
   * 解析传入的内容
   */
  parseContent(options: Record<string, string | undefined>) {
    const { questionContent, answerContent, showWatermark } = options;
    
    const question = questionContent ? decodeURIComponent(questionContent) : '';
    const answer = answerContent ? decodeURIComponent(answerContent) : '';
    
    // 解析 Markdown 内容
    const parsedQuestion = this.parseMarkdown(question);
    const parsedAnswer = this.parseMarkdown(answer);
    
    this.setData({
      questionContent: question,
      answerContent: answer,
      showWatermark: showWatermark === 'true',
      parsedQuestion,
      parsedAnswer
    });
  },

  /**
   * 解析 Markdown 文本为 AST
   */
  parseMarkdown(content: string): IMarkdownNode[] {
    if (!content) return [];
    
    try {
      // 添加换行符，确保解析为块级内容
      return this.mdParser(content + '\n\n');
    } catch (error) {
      console.error('Markdown 解析错误:', error);
      return [{
        type: 'paragraph',
        content: [{
          type: 'text',
          content: content
        }]
      }];
    }
  },

  /**
   * 初始化画布尺寸
   */
  initCanvasSize() {
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          canvasWidth: res.windowWidth,
          canvasHeight: res.windowHeight * 0.7 // 设置为屏幕高度的70%，避免太长
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
    try {
      this.setData({ isRendering: true, renderProgress: 0 });
      
      // 获取Canvas节点
      this.canvasNode = await this.getCanvasNode();
      if (!this.canvasNode) {
        throw new Error('无法获取Canvas节点');
      }
      
      this.canvasContext = this.canvasNode.getContext('2d');
      
      // 设置Canvas尺寸（高清显示）
      const dpr = wx.getSystemInfoSync().pixelRatio;
      this.canvasNode.width = this.data.canvasWidth * dpr;
      this.canvasNode.height = this.data.canvasHeight * dpr;
      this.canvasContext.scale(dpr, dpr);
      
      // 渲染前先计算内容高度
      const contentHeight = await this.calculateContentHeight();
      
      // 如果内容高度超过Canvas高度，则更新Canvas高度
      if (contentHeight > this.data.canvasHeight) {
        this.canvasNode.height = contentHeight * dpr;
        this.canvasContext.scale(dpr, dpr);
        this.setData({ canvasHeight: contentHeight });
      }
      
      this.setData({ renderProgress: 30 });
      
      // 根据当前模板渲染内容
      await this.renderTemplate();
      
      this.setData({ isRendering: false, renderProgress: 100 });
    } catch (error) {
      console.error('渲染失败:', error);
      wx.showToast({
        title: '渲染失败，请重试',
        icon: 'none'
      });
      this.setData({ isRendering: false });
    }
  },

  /**
   * 获取Canvas节点
   */
  async getCanvasNode(): Promise<WechatMiniprogram.Canvas> {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#previewCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res && res[0] && res[0].node) {
            resolve(res[0].node);
          } else {
            reject(new Error('获取Canvas节点失败'));
          }
        });
    });
  },

  /**
   * 计算内容所需的总高度
   */
  async calculateContentHeight(): Promise<number> {
    // 创建离屏Canvas用于测量
    // 使用wx的API直接创建离屏Canvas
    let offscreenCanvas: any = null;
    let ctx: any = null;
    
    try {
      if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        offscreenCanvas = wx.createOffscreenCanvas();
        offscreenCanvas.width = this.data.canvasWidth;
        offscreenCanvas.height = 1000;
        ctx = offscreenCanvas.getContext('2d');
      }
    } catch (error) {
      console.error('创建离屏Canvas失败:', error);
    }
    
    if (!ctx) return this.data.canvasHeight;
    
    const style = templateStyles[this.data.currentTemplate];
    const padding = style.padding;
    const contentWidth = this.data.canvasWidth - (padding * 2);
    
    // 标题和间距的高度
    let totalHeight = 60; // 顶部空间
    
    // 问题标题
    totalHeight += 30;
    
    // 计算问题内容高度
    totalHeight = CanvasRenderUtils.calculateContentHeight(
      ctx,
      this.data.parsedQuestion,
      padding + 10,
      totalHeight,
      contentWidth - 20,
      '14px sans-serif'
    );
    
    // 回答标题
    totalHeight += 30;
    
    // 计算回答内容高度
    totalHeight = CanvasRenderUtils.calculateContentHeight(
      ctx,
      this.data.parsedAnswer,
      padding + 10,
      totalHeight,
      contentWidth - 20,
      '14px sans-serif'
    );
    
    // 底部空间
    totalHeight += 60;
    
    return Math.max(totalHeight, this.data.canvasHeight);
  },

  /**
   * 根据模板渲染内容
   */
  async renderTemplate() {
    if (!this.canvasContext) return;
    
    // 清空画布
    this.canvasContext.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    switch (this.data.currentTemplate) {
      case 'simple':
        await this.renderSimpleTemplate();
        break;
      case 'book':
        await this.renderBookTemplate();
        break;
      case 'dialog':
        await this.renderDialogTemplate();
        break;
      default:
        await this.renderDefaultTemplate();
    }

    this.setData({ renderProgress: 90 });
  },

  /**
   * 渲染默认模板
   */
  async renderDefaultTemplate() {
    if (!this.canvasContext) return;
    const ctx = this.canvasContext;
    
    const style = templateStyles.default;
    const contentPadding = style.padding;
    const contentWidth = this.data.canvasWidth - (contentPadding * 2);
    
    // 绘制背景
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制内容区域
    ctx.fillStyle = style.contentBackgroundColor;
    ctx.fillRect(contentPadding, 60, contentWidth, this.data.canvasHeight - 120);
    
    // 绘制标题
    ctx.fillStyle = style.titleColor;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('文图', 20, 40);
    
    // 创建渲染上下文
    const renderContext: RenderContext = {
      ctx,
      x: contentPadding + 10,
      y: 90,
      maxWidth: contentWidth - 20,
      baseStyles: defaultMarkdownStyles
    };
    
    // 绘制问题部分
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('问题', contentPadding + 10, renderContext.y);
    
    renderContext.y += 30;
    
    // 渲染解析后的问题内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedQuestion
    );
    
    // 绘制回答部分
    renderContext.y += 30;
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('回答', contentPadding + 10, renderContext.y);
    
    renderContext.y += 30;
    
    // 渲染解析后的回答内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedAnswer
    );
    
    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = style.watermarkColor;
      ctx.font = '12px sans-serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 渲染简约模板
   */
  async renderSimpleTemplate() {
    if (!this.canvasContext) return;
    const ctx = this.canvasContext;
    
    const style = templateStyles.simple;
    const contentPadding = style.padding;
    const contentWidth = this.data.canvasWidth - (contentPadding * 2);
    
    // 绘制背景
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制内容区域
    ctx.fillStyle = style.contentBackgroundColor;
    ctx.fillRect(contentPadding, 60, contentWidth, this.data.canvasHeight - 120);
    
    // 绘制标题
    ctx.fillStyle = style.titleColor;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('文图', 30, 40);
    
    // 创建简约风格的样式
    const simpleStyles = JSON.parse(JSON.stringify(defaultMarkdownStyles));
    simpleStyles.text.color = '#333333';
    simpleStyles.heading.forEach((h: any) => h.color = '#333333');
    
    // 创建渲染上下文
    const renderContext: RenderContext = {
      ctx,
      x: contentPadding + 20,
      y: 100,
      maxWidth: contentWidth - 40,
      baseStyles: simpleStyles
    };
    
    // 渲染问题标题
    ctx.fillStyle = '#4080ff';
    ctx.font = '18px sans-serif';
    ctx.fillText('问题', contentPadding + 20, 80);
    
    // 渲染解析后的问题内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedQuestion
    );
    
    // 渲染回答标题
    renderContext.y += 20;
    ctx.fillStyle = '#4080ff';
    ctx.font = '18px sans-serif';
    ctx.fillText('回答', contentPadding + 20, renderContext.y);
    
    renderContext.y += 30;
    
    // 渲染解析后的回答内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedAnswer
    );
    
    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = style.watermarkColor;
      ctx.font = '12px sans-serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 渲染书籍模板
   */
  async renderBookTemplate() {
    if (!this.canvasContext) return;
    const ctx = this.canvasContext;
    
    const style = templateStyles.book;
    const contentPadding = style.padding;
    const contentWidth = this.data.canvasWidth - (contentPadding * 2);
    
    // 绘制背景（仿纸张质感）
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制内容区域（白色纸张）
    ctx.fillStyle = style.contentBackgroundColor;
    
    // 添加纸张阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    ctx.fillRect(contentPadding, 60, contentWidth, this.data.canvasHeight - 120);
    
    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // 绘制标题（仿印刷风格）
    ctx.fillStyle = style.titleColor;
    ctx.font = 'bold 28px serif';
    ctx.fillText('文图', contentPadding + 20, 40);
    
    // 创建书籍风格的样式
    const bookStyles = JSON.parse(JSON.stringify(defaultMarkdownStyles));
    bookStyles.text.color = '#333333';
    bookStyles.text.font = '15px serif';
    bookStyles.heading.forEach((h: any, i: number) => {
      h.color = '#5d4037';
      h.font = `bold ${24-i*2}px serif`;
    });
    
    // 创建渲染上下文
    const renderContext: RenderContext = {
      ctx,
      x: contentPadding + 30,
      y: 100,
      maxWidth: contentWidth - 60,
      baseStyles: bookStyles
    };
    
    // 渲染问题标题（仿章节标题）
    ctx.fillStyle = '#5d4037';
    ctx.font = 'bold 20px serif';
    ctx.fillText('问题', contentPadding + 30, 80);
    
    // 绘制分隔线
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentPadding + 30, 85);
    ctx.lineTo(contentPadding + 80, 85);
    ctx.stroke();
    
    // 渲染解析后的问题内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedQuestion
    );
    
    // 渲染回答标题
    renderContext.y += 20;
    ctx.fillStyle = '#5d4037';
    ctx.font = 'bold 20px serif';
    ctx.fillText('回答', contentPadding + 30, renderContext.y);
    
    // 绘制分隔线
    ctx.beginPath();
    ctx.moveTo(contentPadding + 30, renderContext.y + 5);
    ctx.lineTo(contentPadding + 80, renderContext.y + 5);
    ctx.stroke();
    
    renderContext.y += 30;
    
    // 渲染解析后的回答内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedAnswer
    );
    
    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = style.watermarkColor;
      ctx.font = 'italic 12px serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 渲染对话模板
   */
  async renderDialogTemplate() {
    if (!this.canvasContext) return;
    const ctx = this.canvasContext;
    
    const style = templateStyles.dialog;
    const contentPadding = style.padding;
    const contentWidth = this.data.canvasWidth - (contentPadding * 2);
    
    // 绘制背景
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, this.data.canvasWidth, this.data.canvasHeight);
    
    // 绘制标题栏
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, this.data.canvasWidth, 50);
    
    // 绘制标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('文图对话', this.data.canvasWidth / 2 - 30, 30);
    
    // 创建对话风格的样式
    const dialogStyles = JSON.parse(JSON.stringify(defaultMarkdownStyles));
    dialogStyles.text.color = '#ffffff';
    
    // 创建渲染上下文
    const renderContext: RenderContext = {
      ctx,
      x: 0,
      y: 80,
      maxWidth: 0, // 将在每个消息气泡中设置
      baseStyles: dialogStyles
    };
    
    // 渲染问题（左侧气泡）
    const questionBubbleWidth = this.data.canvasWidth * 0.7;
    
    // 绘制问题气泡
    ctx.fillStyle = '#333333';
    this.drawBubble(ctx, 15, renderContext.y, questionBubbleWidth, 'left');
    
    // 设置问题内容的渲染区域
    renderContext.x = 25;
    renderContext.maxWidth = questionBubbleWidth - 20;
    
    // 渲染解析后的问题内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedQuestion
    );
    
    renderContext.y += 30;
    
    // 渲染回答（右侧气泡）
    const answerBubbleWidth = this.data.canvasWidth * 0.7;
    
    // 绘制回答气泡
    ctx.fillStyle = '#4080ff';
    this.drawBubble(ctx, this.data.canvasWidth - 15 - answerBubbleWidth, renderContext.y, answerBubbleWidth, 'right');
    
    // 设置回答内容的渲染区域
    renderContext.x = this.data.canvasWidth - 15 - answerBubbleWidth + 10;
    renderContext.maxWidth = answerBubbleWidth - 20;
    
    // 渲染解析后的回答内容
    renderContext.y = await MarkdownRenderer.renderNodes(
      renderContext,
      this.data.parsedAnswer
    );
    
    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = style.watermarkColor;
      ctx.font = '12px sans-serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 绘制聊天气泡
   */
  drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, direction: 'left' | 'right') {
    const height = 100; // 初始高度，会根据内容动态调整
    const radius = 10;
    
    ctx.beginPath();
    
    // 左上角
    ctx.moveTo(x + radius, y);
    
    // 上边
    ctx.lineTo(x + width - radius, y);
    
    // 右上角
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    
    // 右边
    ctx.lineTo(x + width, y + height - radius);
    
    // 右下角
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    
    // 下边
    ctx.lineTo(x + radius, y + height);
    
    // 左下角
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    
    // 左边
    ctx.lineTo(x, y + radius);
    
    // 左上角
    ctx.quadraticCurveTo(x, y, x + radius, y);
    
    // 绘制尖角
    if (direction === 'left') {
      // 左侧气泡，尖角在左边
      ctx.moveTo(x, y + 20);
      ctx.lineTo(x - 10, y + 30);
      ctx.lineTo(x, y + 40);
    } else {
      // 右侧气泡，尖角在右边
      ctx.moveTo(x + width, y + 20);
      ctx.lineTo(x + width + 10, y + 30);
      ctx.lineTo(x + width, y + 40);
    }
    
    ctx.closePath();
    ctx.fill();
  },

  /**
   * 导出图片
   */
  async exportImage() {
    try {
      // 检查保存图片权限
      const auth = await wx.getSetting();
      if (!auth.authSetting['scope.writePhotosAlbum']) {
        await wx.authorize({ scope: 'scope.writePhotosAlbum' });
      }
      
      // 生成临时文件路径
      const tempFilePath = await new Promise<string>((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this.canvasNode,
          success: res => resolve(res.tempFilePath),
          fail: reject
        });
      });
      
      // 保存到相册
      await wx.saveImageToPhotosAlbum({ filePath: tempFilePath });
      
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (error) {
      console.error('保存图片失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * 更换模板
   */
  async changeTemplate() {
    const { tapIndex } = await wx.showActionSheet({
      itemList: ['默认模板', '简约模板', '书籍模板', '对话模板']
    });
    
    const templates = ['default', 'simple', 'book', 'dialog'];
    this.setData({ currentTemplate: templates[tapIndex] }, () => {
      this.renderToCanvas();
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
  },
  
  /**
   * 保存图片
   */
  saveImage() {
    this.exportImage();
  },

  /**
   * 分享给好友
   */
  shareToFriends() {
    // 小程序内分享逻辑，使用开放能力
    wx.showToast({ title: '请使用右上角分享按钮', icon: 'none' });
  },

  /**
   * 分享到朋友圈
   */
  shareToMoments() {
    // 调用分享海报图片的逻辑
    this.exportImage();
    wx.showToast({ title: '图片已保存，可分享到朋友圈', icon: 'none' });
  },

  /**
   * 分享到其他平台
   */
  shareToOther() {
    // 导出图片后引导用户分享
    this.exportImage();
    wx.showToast({ title: '图片已保存，可分享到其他平台', icon: 'none' });
  }
}); 