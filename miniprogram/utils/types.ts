/**
 * 全局类型定义
 * 为整个项目提供一致的Canvas类型定义
 * 
 * 创建全局类型定义文件；使用导入触发类型加载；
    使用declare global的好处：  
    类型定义集中在一处，便于维护
    避免了重复定义可能导致的冲突
    确保整个项目使用一致的类型定义
    当需要扩展类型定义时，只需修改一个文件
 */

// 使用declare global来全局声明这些类型
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

  // 为小程序环境定义requestAnimationFrame
  function requestAnimationFrame(callback: () => void): number;
}

// 需要export一些内容才能让TypeScript将此文件视为模块
export {}; 