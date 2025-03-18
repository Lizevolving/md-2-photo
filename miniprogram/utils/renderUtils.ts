/**
 * Canvas渲染工具类
 * 提供文本测量缓存、异步渲染和文本换行等功能
 * 
 * 必要性：
性能优化：
文本测量缓存：在Canvas中频繁调用 measureText 是一个昂贵的操作，缓存结果可以显著提升性能。
异步渲染：通过任务队列和 requestAnimationFrame，避免渲染任务阻塞主线程，提升用户体验。
动态布局支持：
文本换行计算：确保文本在Canvas中不会溢出，支持动态调整布局。
内容高度计算：动态计算Canvas内容的高度，便于实现自适应布局或分页渲染。
代码复用：
将Canvas渲染相关的通用功能封装为工具类，便于在多个模块或项目中复用。
离屏Canvas：
离屏Canvas可以用于预渲染或测量，避免直接操作主Canvas导致的性能问题。
 * 
 */



// 为小程序环境声明Canvas相关类型

declare global {
  interface TextMetrics {
    width: number;
    actualBoundingBoxAscent?: number;
    actualBoundingBoxDescent?: number;
    actualBoundingBoxLeft?: number;
    actualBoundingBoxRight?: number;
    fontBoundingBoxAscent?: number;
    fontBoundingBoxDescent?: number;
  }

  // 声明Canvas相关的类型
  interface CanvasGradient {
    addColorStop(offset: number, color: string): void;
  }

  interface CanvasPattern { }

  interface CanvasRenderingContext2D {
    font: string;
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    measureText(text: string): TextMetrics;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    fillRect(x: number, y: number, width: number, height: number): void;
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    stroke(): void;
    clearRect(x: number, y: number, width: number, height: number): void;
    scale(x: number, y: number): void;
  }
}

// 使用小程序的API替代requestAnimationFrame
declare function requestAnimationFrame(callback: () => void): number;

// 文本缓存接口
interface TextMetricsCache {
  [key: string]: TextMetrics;
}

// 文本行信息
interface TextLine {
  text: string;
  width: number;
  x: number;
  y: number;
}

// 渲染任务
interface RenderTask {
  execute: () => Promise<void>;
  priority: number;
}

export class CanvasRenderUtils {
  private static textMetricsCache: TextMetricsCache = {};
  private static renderQueue: RenderTask[] = [];
  private static isRendering: boolean = false;

  /**
   * 清除文本测量缓存
   */
  public static clearTextCache(): void {
    this.textMetricsCache = {};
  }

  /**
   * 测量文本宽度（带缓存）
   */
  public static measureText(ctx: CanvasRenderingContext2D, text: string, font: string): TextMetrics {
    const cacheKey = `${text}:${font}`;
    
    if (!this.textMetricsCache[cacheKey]) {
      const originalFont = ctx.font;
      ctx.font = font;
      this.textMetricsCache[cacheKey] = ctx.measureText(text);
      ctx.font = originalFont;
    }
    
    return this.textMetricsCache[cacheKey];
  }

  /**
   * 计算文本换行
   * 返回每行文本及其位置信息
   */
  public static calculateTextWrapping(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    font: string
  ): TextLine[] {
    const lines: TextLine[] = [];
    const characters = Array.from(text); // 使用Array.from确保正确处理Unicode字符
    let currentLine = '';
    let currentY = y;

    // 保存当前字体
    const originalFont = ctx.font;
    ctx.font = font;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const testLine = currentLine + char;
      const metrics = this.measureText(ctx, testLine, font);

      // 如果添加当前字符会导致超出最大宽度，则换行
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push({
          text: currentLine,
          width: this.measureText(ctx, currentLine, font).width,
          x,
          y: currentY
        });
        
        currentLine = char;
        currentY += lineHeight;
      } else {
        currentLine = testLine;
      }

      // 处理最后一行或换行符
      if (i === characters.length - 1 && currentLine.length > 0) {
        lines.push({
          text: currentLine,
          width: this.measureText(ctx, currentLine, font).width,
          x,
          y: currentY
        });
      } else if (char === '\n') {
        // 处理显式换行符
        lines.push({
          text: currentLine.slice(0, -1), // 移除换行符
          width: this.measureText(ctx, currentLine.slice(0, -1), font).width,
          x,
          y: currentY
        });
        
        currentLine = '';
        currentY += lineHeight;
      }
    }

    // 恢复原始字体
    ctx.font = originalFont;
    
    return lines;
  }

  /**
   * 添加渲染任务到队列
   */
  public static addRenderTask(task: () => Promise<void>, priority: number = 0): void {
    this.renderQueue.push({
      execute: task,
      priority
    });
    
    // 如果当前没有渲染，启动渲染过程
    if (!this.isRendering) {
      this.processRenderQueue();
    }
  }

  /**
   * 处理渲染队列
   */
  private static async processRenderQueue(): Promise<void> {
    if (this.renderQueue.length === 0) {
      this.isRendering = false;
      return;
    }
    
    this.isRendering = true;
    
    // 按优先级排序
    this.renderQueue.sort((a, b) => b.priority - a.priority);
    
    const task = this.renderQueue.shift();
    if (task) {
      try {
        await task.execute();
      } catch (error) {
        console.error('渲染任务执行失败:', error);
      }
      
      // 使用requestAnimationFrame来避免阻塞主线程
      requestAnimationFrame(() => this.processRenderQueue());
    } else {
      this.isRendering = false;
    }
  }

  /**
   * 计算Canvas所需高度
   */
  public static calculateContentHeight(
    ctx: CanvasRenderingContext2D,
    nodes: any[],
    x: number,
    y: number,
    maxWidth: number,
    defaultFont: string
  ): number {
    let maxHeight = y;
    const originalFont = ctx.font;
    
    const estimateNodeHeight = (node: any, startY: number): number => {
      let nodeHeight = startY;
      
      switch (node.type) {
        case 'paragraph':
          if (Array.isArray(node.content)) {
            let text = '';
            // 简单处理：将所有文本节点合并
            node.content.forEach((child: any) => {
              if (child.type === 'text' && typeof child.content === 'string') {
                text += child.content;
              }
            });
            
            // 估算所需行数
            const lines = this.calculateTextWrapping(ctx, text, x, startY, maxWidth, 24, defaultFont);
            nodeHeight = lines[lines.length - 1]?.y + 24 || nodeHeight;
          }
          break;
          
        case 'heading':
          nodeHeight += 50; // 标题估算高度
          break;
          
        case 'list':
          if (node.items && Array.isArray(node.items)) {
            nodeHeight += node.items.length * 34; // 每个列表项估算高度
          }
          break;
          
        case 'hr':
          nodeHeight += 30; // 分隔线高度
          break;
          
        default:
          nodeHeight += 24; // 默认行高
      }
      
      return nodeHeight;
    };
    
    // 遍历所有节点估算高度
    for (const node of nodes) {
      const nodeHeight = estimateNodeHeight(node, maxHeight);
      maxHeight = Math.max(maxHeight, nodeHeight) + 10; // 添加节点间距
    }
    
    ctx.font = originalFont;
    
    return maxHeight;
  }
}

/**
 * 创建离屏Canvas用于预渲染或测量
 */
export function createOffscreenCanvas(width: number, height: number): { canvas: any, ctx: any } {
  // 小程序环境
  if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
    try {
      // 微信小程序中创建离屏Canvas的方式
      // 注意：不同版本的微信小程序API可能有差异
      const canvas = wx.createOffscreenCanvas() as any;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      return { canvas, ctx };
    } catch (e) {
      console.error('创建离屏Canvas失败:', e);
    }
  }
  
  // 如果创建失败，返回null
  return { canvas: null, ctx: null };
} 