// 手动定义 simple-markdown 类型，避免类型错误
declare module '@khanacademy/simple-markdown' {
  export function defaultBlockParse(source: string): any[];
  export function defaultInlineParse(source: string): any[];
  export function defaultImplicitParse(source: string): any[];
  export function parserFor(rules: any): (source: string, state?: any) => any[];
  export function outputFor(rules: any, key: string): (tree: any[], state?: any) => any;
  export const defaultRules: any;
}

import SimpleMarkdown from '@khanacademy/simple-markdown';

// 定义 Markdown 节点类型
interface IMarkdownNode {
  type: string;
  content?: string | IMarkdownNode[];
  items?: IMarkdownNode[][];
  level?: number;
  target?: string;
  title?: string;
  alt?: string;
}

interface IPageData {
  questionContent: string;
  answerContent: string;
  showWatermark: boolean;
  canvasWidth: number;
  canvasHeight: number;
  currentTemplate: string;
  parsedQuestion: IMarkdownNode[];
  parsedAnswer: IMarkdownNode[];
}

type CanvasContext = WechatMiniprogram.CanvasContext;

// 使用无泛型参数的 Page 定义，避免类型错误
Page({
  data: {
    questionContent: '',
    answerContent: '',
    showWatermark: false,
    canvasWidth: 0,
    canvasHeight: 0,
    currentTemplate: 'default', // 当前使用的模板
    parsedQuestion: [],
    parsedAnswer: []
  },

  // 创建 Markdown 解析器
  mdParser: null as any,

  onLoad(options?: Record<string, string | undefined>) {
    if (!options) return;
    
    // 初始化 Markdown 解析器
    this.initMarkdownParser();
    
    // 解析传入的内容
    this.parseContent(options);
    
    // 初始化画布尺寸
    this.initCanvasSize();         //取名字是真草率 
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
      // 添加换行符，确保解析为块级内容                        // 是的，一行完成；果真是细节全封装
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

    // 绘制标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('文图', 20, 40);

    // 绘制问题部分
    let currentY = 90;
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('问题', contentPadding + 10, currentY);
    
    currentY += 30;
    
    // 渲染解析后的问题内容
    currentY = await this.renderMarkdownNodes(
      ctx, 
      this.data.parsedQuestion, 
      contentPadding + 10, 
      currentY, 
      contentWidth - 20
    );

    // 绘制回答部分
    currentY += 30;
    ctx.fillStyle = '#4080ff';
    ctx.font = '16px sans-serif';
    ctx.fillText('回答', contentPadding + 10, currentY);
    
    currentY += 30;
    
    // 渲染解析后的回答内容
    currentY = await this.renderMarkdownNodes(
      ctx, 
      this.data.parsedAnswer, 
      contentPadding + 10, 
      currentY, 
      contentWidth - 20
    );

    // 绘制水印
    if (this.data.showWatermark) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '12px sans-serif';
      ctx.fillText('由文图小程序生成', this.data.canvasWidth - 150, this.data.canvasHeight - 30);
    }
  },

  /**
   * 渲染 Markdown 节点集合
   */
  async renderMarkdownNodes(
    ctx: any, 
    nodes: IMarkdownNode[], 
    x: number, 
    y: number, 
    maxWidth: number
  ): Promise<number> {
    let currentY = y;
    
    for (const node of nodes) {
      currentY = await this.renderMarkdownNode(ctx, node, x, currentY, maxWidth);
      // 添加节点间距
      currentY += 10;
    }
    
    return currentY;
  },

  /**
   * 渲染单个 Markdown 节点
   */
  async renderMarkdownNode(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): Promise<number> {
    let currentY = y;
    
    switch (node.type) {
      case 'heading':
        currentY = this.renderHeading(ctx, node, x, currentY, maxWidth);
        break;
        
      case 'paragraph':
        currentY = this.renderParagraph(ctx, node, x, currentY, maxWidth);
        break;
        
      case 'hr':
        currentY = this.renderHorizontalRule(ctx, x, currentY, maxWidth);
        break;
        
      case 'list':
        currentY = this.renderList(ctx, node, x, currentY, maxWidth);
        break;
        
      case 'text':
        if (typeof node.content === 'string') {
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px sans-serif';
          currentY = this.drawWrappedText(ctx, node.content, x, currentY, maxWidth);
        }
        break;
        
      default:
        console.warn('不支持的节点类型:', node.type);
        break;
    }
    
    return currentY;
  },

  /**
   * 渲染标题
   */
  renderHeading(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    const level = node.level || 1;
    const fontSize = 24 - (level - 1) * 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px sans-serif`;
    
    let currentY = y + fontSize; // 根据字体大小调整起始位置
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = this.drawWrappedText(ctx, childNode.content, x, currentY, maxWidth);
        }
      }
    }
    
    return currentY + 10; // 增加标题底部间距
  },

  /**
   * 渲染段落
   */
  renderParagraph(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    
    let currentY = y;
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = this.drawWrappedText(ctx, childNode.content, x, currentY, maxWidth);
        } else if (childNode.type === 'strong') {
          ctx.font = 'bold 14px sans-serif';
          currentY = this.renderStrongText(ctx, childNode, x, currentY, maxWidth);
          ctx.font = '14px sans-serif'; // 恢复默认字体
        } else if (childNode.type === 'em') {
          ctx.font = 'italic 14px sans-serif';
          currentY = this.renderEmphasisText(ctx, childNode, x, currentY, maxWidth);
          ctx.font = '14px sans-serif'; // 恢复默认字体
        }
      }
    }
    
    return currentY;
  },

  /**
   * 渲染粗体文本
   */
  renderStrongText(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    let currentY = y;
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = this.drawWrappedText(ctx, childNode.content, x, currentY, maxWidth);
        }
      }
    }
    
    return currentY;
  },

  /**
   * 渲染斜体文本
   */
  renderEmphasisText(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    let currentY = y;
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = this.drawWrappedText(ctx, childNode.content, x, currentY, maxWidth);
        }
      }
    }
    
    return currentY;
  },

  /**
   * 渲染水平分隔线
   */
  renderHorizontalRule(
    ctx: any, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    const lineY = y + 10;
    
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + maxWidth, lineY);
    ctx.stroke();
    
    return lineY + 10;
  },

  /**
   * 渲染列表
   */
  renderList(
    ctx: any, 
    node: IMarkdownNode, 
    x: number, 
    y: number, 
    maxWidth: number
  ): number {
    let currentY = y;
    const indent = 20; // 列表缩进
    
    if (node.items && Array.isArray(node.items)) {
      let itemIndex = 1;
      
      for (const item of node.items) {
        // 绘制列表标记
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('•', x, currentY + 14);
        
        // 渲染列表项内容
        if (Array.isArray(item)) {
          for (const contentNode of item) {
            currentY = this.renderMarkdownNode(ctx, contentNode, x + indent, currentY, maxWidth - indent);
          }
        }
        
        currentY += 10; // 列表项间距
        itemIndex++;
      }
    }
    
    return currentY;
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
          canvas: wx.createSelectorQuery().select('#previewCanvas').node(),
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
  }
}); 