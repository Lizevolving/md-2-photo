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

// 导入全局类型定义
import '../utils/types';
import { IMarkdownNode } from './markdownRenderer';

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
    nodes: IMarkdownNode[],
    x: number,
    y: number,
    maxWidth: number,
    font?: string
  ): number {
    if (font) {
      ctx.font = font;
    }
    
    let currentY = y;
    
    for (const node of nodes) {
      switch (node.type) {
        case 'paragraph':
          if (node.content && Array.isArray(node.content)) {
            for (const item of node.content) {
              if (typeof item === 'object' && item.type === 'text' && typeof item.content === 'string') {
                // 模拟绘制文本计算高度
                currentY = this.calculateTextHeight(
                  ctx,
                  item.content,
                  x,
                  currentY,
                  maxWidth,
                  24 // 默认行高
                );
              }
            }
            currentY += 16; // 段落间距
          }
          break;
          
        case 'heading':
          // 标题高度估算
          const headingLevel = node.level || 1;
          const headingSize = 24 - (headingLevel - 1) * 2;
          currentY += headingSize + 16;
          break;
          
        case 'list':
          // 列表项高度估算
          if (node.items && Array.isArray(node.items)) {
            for (const item of node.items) {
              if (item.content && Array.isArray(item.content)) {
                for (const contentItem of item.content) {
                  if (typeof contentItem === 'object' && contentItem.type === 'text' && typeof contentItem.content === 'string') {
                    currentY = this.calculateTextHeight(
                      ctx,
                      contentItem.content,
                      x + 20, // 缩进
                      currentY,
                      maxWidth - 20,
                      20
                    );
                  }
                }
              }
              currentY += 10; // 列表项间距
            }
          }
          currentY += 10; // 列表底部间距
          break;
          
        case 'codeBlock':
          // 代码块高度估算
          if (typeof node.content === 'string') {
            const codeLines = node.content.split('\n');
            currentY += 10; // 顶部间距
            currentY += codeLines.length * 20; // 代码行高
            currentY += 10; // 底部间距
          }
          break;
          
        default:
          currentY += 24; // 默认行高
      }
    }
    
    return currentY;
  }

  /**
   * 计算文本高度
   * @param ctx Canvas上下文
   * @param text 文本内容
   * @param x X坐标
   * @param y Y坐标
   * @param maxWidth 最大宽度
   * @param lineHeight 行高
   * @returns 计算后的Y坐标
   */
  private static calculateTextHeight(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number {
    if (!text) return y;
    
    const words = text.split('');
    let line = '';
    let testLine = '';
    let testWidth = 0;
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n];
      testWidth = ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && n > 0) {
        line = words[n];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    return currentY + lineHeight;
  }

  /**
   * 创建离屏Canvas用于双缓冲渲染
   * @param width 宽度
   * @param height 高度
   * @returns 离屏Canvas上下文或null
   */
  static createOffscreenCanvas(width: number, height: number): { canvas: any, ctx: any } | null {
    try {
      if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        // 微信小程序的createOffscreenCanvas参数不同
        const canvas = wx.createOffscreenCanvas({
          type: '2d',
          width: width,
          height: height
        });
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
      }
    } catch (error) {
      console.error('创建离屏Canvas失败:', error);
    }
    return null;
  }
  
  /**
   * 使用双缓冲技术渲染内容
   * @param targetCtx 目标画布上下文
   * @param width 宽度
   * @param height 高度
   * @param renderFunc 渲染函数
   */
  static async renderWithDoubleBuffering(
    targetCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    renderFunc: (ctx: CanvasRenderingContext2D) => Promise<void>
  ): Promise<boolean> {
    try {
      // 创建离屏Canvas
      const offscreen = this.createOffscreenCanvas(width, height);
      
      if (offscreen && offscreen.ctx) {
        // 在离屏Canvas上渲染
        await renderFunc(offscreen.ctx);
        
        // 将离屏内容一次性复制到目标Canvas
        targetCtx.clearRect(0, 0, width, height);
        
        // 在微信小程序中，将离屏Canvas内容绘制到目标Canvas
        if (offscreen.canvas && offscreen.canvas.width && offscreen.canvas.height) {
          try {
            // 使用drawImage将离屏Canvas绘制到目标Canvas
            // @ts-ignore - 小程序的Canvas API与标准Canvas略有不同
            targetCtx.drawImage(offscreen.canvas, 0, 0, width, height);
            return true;
          } catch (e) {
            console.error('将离屏内容复制到目标Canvas失败:', e);
            // 失败后使用直接渲染方法
            targetCtx.clearRect(0, 0, width, height);
            await renderFunc(targetCtx);
          }
        } else {
          // 如果离屏Canvas没有大小，直接在目标Canvas上渲染
          await renderFunc(targetCtx);
        }
        return true;
      } else {
        // 如果无法创建离屏Canvas，直接在目标Canvas上渲染
        await renderFunc(targetCtx);
        return true;
      }
    } catch (error) {
      console.error('双缓冲渲染失败:', error);
      return false;
    }
  }

  /**
   * 绘制文本，支持自动换行
   * @param ctx Canvas上下文
   * @param text 文本内容
   * @param x X坐标
   * @param y Y坐标
   * @param maxWidth 最大宽度
   * @param lineHeight 行高
   * @param font 字体设置（可选）
   * @returns 最终的Y坐标位置
   */
  static drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    font?: string
  ): number {
    if (!text) return y;
    
    if (font) {
      ctx.font = font;
    }
    
    const words = text.split('');
    let line = '';
    let testLine = '';
    let testWidth = 0;
    
    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n];
      testWidth = ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    ctx.fillText(line, x, y);
    return y + lineHeight;
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