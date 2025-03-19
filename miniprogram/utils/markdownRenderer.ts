/**
 * Markdown渲染器
 * 用于将Markdown节点渲染到Canvas上
 */

import { CanvasRenderUtils } from './renderUtils';
// 导入类型定义
import './types';

// 定义 Markdown 节点类型
export interface IMarkdownNode {
  type: string;
  content?: string | IMarkdownNode[];
  items?: IMarkdownNode[][];
  level?: number;
  target?: string;
  title?: string;
  alt?: string;
}

// 文本样式配置
export interface TextStyleOptions {
  font: string;
  color: string;
  lineHeight: number;
}

// 渲染上下文，包含样式状态和位置信息
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  maxWidth: number;
  baseStyles: {
    text: TextStyleOptions;
    heading: TextStyleOptions[];
    link: TextStyleOptions;
    list: TextStyleOptions;
    blockquote: TextStyleOptions;
    code: TextStyleOptions;
  };
}

export class MarkdownRenderer {
  /**
   * 渲染Markdown节点集合
   */
  public static async renderNodes(
    context: RenderContext,
    nodes: IMarkdownNode[]
  ): Promise<number> {
    let currentY = context.y;
    
    for (const node of nodes) {
      try {
        currentY = await this.renderNode(
          context.ctx, 
          node, 
          context.x, 
          currentY, 
          context.maxWidth,
          context.baseStyles
        );
        // 添加节点间距
        currentY += 10;
      } catch (error) {
        console.error('节点渲染错误:', error, node);
        // 继续渲染下一个节点
      }
    }
    
    return currentY;
  }

  /**
   * 渲染单个Markdown节点
   */
  private static async renderNode(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    let currentY = y;
    
    switch (node.type) {
      case 'heading':
        currentY = await this.renderHeading(ctx, node, x, currentY, maxWidth, styles);
        break;
        
      case 'paragraph':
        currentY = await this.renderParagraph(ctx, node, x, currentY, maxWidth, styles);
        break;
        
      case 'hr':
        currentY = this.renderHorizontalRule(ctx, x, currentY, maxWidth);
        break;
        
      case 'list':
        currentY = await this.renderList(ctx, node, x, currentY, maxWidth, styles);
        break;
        
      case 'blockquote':
        currentY = await this.renderBlockquote(ctx, node, x, currentY, maxWidth, styles);
        break;
        
      case 'code_block':
        currentY = await this.renderCodeBlock(ctx, node, x, currentY, maxWidth, styles);
        break;
        
      case 'text':
        if (typeof node.content === 'string') {
          currentY = await this.renderText(ctx, node.content, x, currentY, maxWidth, styles.text);
        }
        break;
        
      default:
        console.warn('不支持的节点类型:', node.type);
        break;
    }
    
    return currentY;
  }

  /**
   * 渲染标题
   */
  private static async renderHeading(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    const level = Math.min(Math.max(node.level || 1, 1), 6) - 1; // 0-5
    const headerStyle = styles.heading[level] || styles.heading[0];
    
    ctx.fillStyle = headerStyle.color;
    ctx.font = headerStyle.font;
    
    let currentY = y + headerStyle.lineHeight * 0.8; // 调整标题起始位置
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          const lines = CanvasRenderUtils.calculateTextWrapping(
            ctx, 
            childNode.content, 
            x, 
            currentY, 
            maxWidth, 
            headerStyle.lineHeight,
            headerStyle.font
          );
          
          // 批量绘制文本
          for (const line of lines) {
            ctx.fillText(line.text, line.x, line.y);
            currentY = line.y + headerStyle.lineHeight;
          }
        }
      }
    }
    
    return currentY;
  }

  /**
   * 渲染段落
   */
  private static async renderParagraph(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    let currentY = y;
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = await this.renderText(ctx, childNode.content, x, currentY, maxWidth, styles.text);
        } else if (childNode.type === 'strong' || childNode.type === 'em') {
          currentY = await this.renderStyledText(ctx, childNode, x, currentY, maxWidth, styles.text, childNode.type);
        } else if (childNode.type === 'link') {
          currentY = await this.renderLink(ctx, childNode, x, currentY, maxWidth, styles.link);
        } else if (childNode.type === 'code') {
          currentY = await this.renderInlineCode(ctx, childNode, x, currentY, maxWidth, styles.code);
        }
      }
    }
    
    return currentY;
  }

  /**
   * 渲染文本
   */
  private static async renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyleOptions
  ): Promise<number> {
    ctx.fillStyle = style.color;
    ctx.font = style.font;
    
    const lines = CanvasRenderUtils.calculateTextWrapping(
      ctx, 
      text, 
      x, 
      y, 
      maxWidth, 
      style.lineHeight,
      style.font
    );
    
    // 批量绘制文本
    for (const line of lines) {
      ctx.fillText(line.text, line.x, line.y);
    }
    
    // 返回最后一行的Y坐标 + 行高
    return lines.length > 0 
      ? lines[lines.length - 1].y + style.lineHeight 
      : y + style.lineHeight;
  }

  /**
   * 渲染样式文本（粗体/斜体）
   */
  private static async renderStyledText(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    baseStyle: TextStyleOptions,
    styleType: 'strong' | 'em'
  ): Promise<number> {
    // 克隆基本样式并修改
    const style = { ...baseStyle };
    
    if (styleType === 'strong') {
      style.font = style.font.replace(/normal|regular|light|thin/i, 'bold');
      if (!style.font.includes('bold')) {
        style.font = `bold ${style.font}`;
      }
    } else if (styleType === 'em') {
      style.font = style.font.replace(/normal|regular/i, 'italic');
      if (!style.font.includes('italic')) {
        style.font = `italic ${style.font}`;
      }
    }
    
    let currentY = y;
    
    if (Array.isArray(node.content)) {
      for (const childNode of node.content) {
        if (childNode.type === 'text' && typeof childNode.content === 'string') {
          currentY = await this.renderText(ctx, childNode.content, x, currentY, maxWidth, style);
        }
      }
    }
    
    return currentY;
  }

  /**
   * 渲染链接
   */
  private static async renderLink(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyleOptions
  ): Promise<number> {
    let text = '';
    
    if (Array.isArray(node.content)) {
      node.content.forEach(child => {
        if (child.type === 'text' && typeof child.content === 'string') {
          text += child.content;
        }
      });
    }
    
    // 绘制链接文本
    ctx.fillStyle = style.color;
    ctx.font = style.font;
    
    const lines = CanvasRenderUtils.calculateTextWrapping(
      ctx, 
      text, 
      x, 
      y, 
      maxWidth, 
      style.lineHeight,
      style.font
    );
    
    // 批量绘制文本
    for (const line of lines) {
      ctx.fillText(line.text, line.x, line.y);
      
      // 绘制下划线
      const textWidth = line.width;
      const underlineY = line.y + 2;
      ctx.beginPath();
      ctx.moveTo(line.x, underlineY);
      ctx.lineTo(line.x + textWidth, underlineY);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    return lines.length > 0 
      ? lines[lines.length - 1].y + style.lineHeight 
      : y + style.lineHeight;
  }

  /**
   * 渲染内联代码
   */
  private static async renderInlineCode(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyleOptions
  ): Promise<number> {
    let text = '';
    
    if (Array.isArray(node.content)) {
      node.content.forEach(child => {
        if (child.type === 'text' && typeof child.content === 'string') {
          text += child.content;
        }
      });
    } else if (typeof node.content === 'string') {
      text = node.content;
    }
    
    // 绘制代码背景
    ctx.fillStyle = '#2a2a2a'; // 代码背景色
    
    const lines = CanvasRenderUtils.calculateTextWrapping(
      ctx, 
      text, 
      x, 
      y, 
      maxWidth, 
      style.lineHeight,
      style.font
    );
    
    // 为每行添加背景和文本
    for (const line of lines) {
      const padding = 3;
      const metrics = CanvasRenderUtils.measureText(ctx, line.text, style.font);
      const bgWidth = metrics.width + padding * 2;
      const bgHeight = style.lineHeight * 0.8;
      
      // 绘制背景
      ctx.fillRect(line.x - padding, line.y - bgHeight + 4, bgWidth, bgHeight);
      
      // 绘制文本
      ctx.fillStyle = style.color;
      ctx.font = style.font;
      ctx.fillText(line.text, line.x, line.y);
      
      // 恢复背景色
      ctx.fillStyle = '#2a2a2a';
    }
    
    return lines.length > 0 
      ? lines[lines.length - 1].y + style.lineHeight 
      : y + style.lineHeight;
  }

  /**
   * 渲染水平分隔线
   */
  private static renderHorizontalRule(
    ctx: CanvasRenderingContext2D,
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
    
    return lineY + 20; // 增加间距
  }

  /**
   * 渲染列表
   */
  private static async renderList(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    let currentY = y;
    const indent = 20; // 列表缩进
    const listStyle = styles.list;
    
    if (node.items && Array.isArray(node.items)) {
      let itemIndex = 1;
      
      for (const item of node.items) {
        const bulletY = currentY + listStyle.lineHeight * 0.7;
        
        // 绘制列表标记
        ctx.fillStyle = listStyle.color;
        ctx.font = listStyle.font;
        ctx.fillText('•', x, bulletY);
        
        // 保存初始Y坐标
        const itemStartY = currentY;
        
        // 渲染列表项内容
        if (Array.isArray(item)) {
          for (const contentNode of item) {
            currentY = await this.renderNode(
              ctx, 
              contentNode, 
              x + indent, 
              currentY, 
              maxWidth - indent,
              styles
            );
          }
        }
        
        // 确保每个列表项之间有足够的间距
        currentY = Math.max(currentY, itemStartY + listStyle.lineHeight);
        currentY += 5; // 列表项间距
        itemIndex++;
      }
    }
    
    return currentY;
  }

  /**
   * 渲染引用块
   */
  private static async renderBlockquote(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    const quoteStyle = styles.blockquote;
    const padding = 10;
    const indent = 15;
    
    // 引用块起始Y坐标
    const blockStartY = y;
    let currentY = y + padding;
    
    // 绘制左侧竖线
    ctx.fillStyle = '#555555';
    ctx.fillRect(x + 3, blockStartY, 3, 1000); // 先绘制一个很长的线，后面会裁剪
    
    // 渲染内容
    if (Array.isArray(node.content)) {
      for (const contentNode of node.content) {
        currentY = await this.renderNode(
          ctx, 
          contentNode, 
          x + indent, 
          currentY, 
          maxWidth - indent,
          styles
        );
      }
    }
    
    // 结束竖线（覆盖多余部分）
    ctx.fillStyle = '#1a1a1a'; // 背景色
    ctx.fillRect(x + 3, currentY + padding, 3, 1000);
    
    return currentY + padding;
  }

  /**
   * 渲染代码块
   */
  private static async renderCodeBlock(
    ctx: CanvasRenderingContext2D,
    node: IMarkdownNode,
    x: number,
    y: number,
    maxWidth: number,
    styles: RenderContext['baseStyles']
  ): Promise<number> {
    const codeStyle = styles.code;
    const padding = 10;
    
    // 代码块背景
    ctx.fillStyle = '#2a2a2a';
    const blockStartY = y;
    let currentY = y + padding;
    
    // 提取代码内容
    let codeText = '';
    if (typeof node.content === 'string') {
      codeText = node.content;
    } else if (Array.isArray(node.content)) {
      node.content.forEach(child => {
        if (child.type === 'text' && typeof child.content === 'string') {
          codeText += child.content;
        }
      });
    }
    
    // 计算代码行
    const lines = codeText.split('\n');
    const lineHeight = codeStyle.lineHeight;
    
    // 计算代码块高度
    const codeBlockHeight = lines.length * lineHeight + padding * 2;
    
    // 绘制背景
    ctx.fillRect(x, blockStartY, maxWidth, codeBlockHeight);
    
    // 绘制代码
    ctx.fillStyle = codeStyle.color;
    ctx.font = codeStyle.font;
    
    lines.forEach((line, index) => {
      const lineY = currentY + index * lineHeight;
      ctx.fillText(line, x + padding, lineY);
    });
    
    return blockStartY + codeBlockHeight;
  }
}

// 默认样式配置
export const defaultMarkdownStyles: RenderContext['baseStyles'] = {
  text: {
    font: '14px sans-serif',
    color: '#ffffff',
    lineHeight: 24
  },
  heading: [
    { font: 'bold 24px sans-serif', color: '#ffffff', lineHeight: 36 }, // h1
    { font: 'bold 22px sans-serif', color: '#ffffff', lineHeight: 34 }, // h2
    { font: 'bold 20px sans-serif', color: '#ffffff', lineHeight: 32 }, // h3
    { font: 'bold 18px sans-serif', color: '#ffffff', lineHeight: 30 }, // h4
    { font: 'bold 16px sans-serif', color: '#ffffff', lineHeight: 28 }, // h5
    { font: 'bold 14px sans-serif', color: '#ffffff', lineHeight: 26 }  // h6
  ],
  link: {
    font: '14px sans-serif',
    color: '#4080ff',
    lineHeight: 24
  },
  list: {
    font: '14px sans-serif',
    color: '#ffffff',
    lineHeight: 24
  },
  blockquote: {
    font: 'italic 14px sans-serif',
    color: '#aaaaaa',
    lineHeight: 24
  },
  code: {
    font: '13px monospace',
    color: '#e6e6e6',
    lineHeight: 22
  }
}; 