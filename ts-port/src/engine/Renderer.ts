/**
 * Canvas presenter for the software pixel buffer.
 *
 * Holds the visible <canvas>, maintains an ImageData sized to the fixed
 * 160x120 internal buffer, and each frame expands the Screen's palette
 * *indices* through the global 256-colour palette into RGBA before pushing
 * them to the canvas via putImageData. This is the isomorphic replacement for
 * the GWT canvas path (CanvasPixelArray -> imageData.getData()).
 *
 * Display scaling is done purely in CSS: the canvas backing store stays
 * 160x120 while the element is stretched by an integer factor (computed from
 * the viewport) with `image-rendering: pixelated` so pixels stay crisp.
 */
import type { Screen } from './Screen';

export class Renderer {
  /** Fixed internal resolution (mirrors Game.WIDTH / Game.HEIGHT). */
  public static readonly WIDTH = 160;
  public static readonly HEIGHT = 120;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: ImageData;
  private colors: number[];

  constructor(canvas: HTMLCanvasElement, colors: number[]) {
    this.canvas = canvas;
    this.colors = colors;

    this.canvas.width = Renderer.WIDTH;
    this.canvas.height = Renderer.HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D rendering context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.image = this.ctx.createImageData(Renderer.WIDTH, Renderer.HEIGHT);

    this.applyScale();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.applyScale);
    }
  }

  /**
   * Largest integer scale at which the fixed 160x120 buffer still fits the
   * viewport. Integer division already floors, so the result is always an
   * integer; clamps to >=1.
   */
  private computeScale(): number {
    if (typeof window === 'undefined') return 1;
    const sx = Math.floor(window.innerWidth / Renderer.WIDTH);
    const sy = Math.floor(window.innerHeight / Renderer.HEIGHT);
    return Math.max(1, Math.min(sx, sy));
  }

  /** Push the current scale into the canvas CSS size and keep pixels crisp. */
  private applyScale = (): void => {
    const scale = this.computeScale();
    this.canvas.style.width = `${Renderer.WIDTH * scale}px`;
    this.canvas.style.height = `${Renderer.HEIGHT * scale}px`;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.display = 'block';
  };

  /** Expand the Screen's palette indices into RGBA and blit to the canvas. */
  public blit(screen: Screen): void {
    const src = screen.pixels; // Uint8ClampedArray of palette indices (0..255)
    const dst = this.image.data; // Uint8ClampedArray RGBA
    const colors = this.colors;
    for (let i = 0, p = 0; i < src.length; i++, p += 4) {
      const idx = src[i];
      if (idx >= 255) {
        // Transparent sentinel -> black background.
        dst[p] = 0;
        dst[p + 1] = 0;
        dst[p + 2] = 0;
        dst[p + 3] = 255;
        continue;
      }
      const rgba = colors[idx] | 0;
      dst[p] = (rgba >> 16) & 0xff;
      dst[p + 1] = (rgba >> 8) & 0xff;
      dst[p + 2] = rgba & 0xff;
      dst[p + 3] = 255;
    }
    this.ctx.putImageData(this.image, 0, 0);
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.applyScale);
    }
  }
}
