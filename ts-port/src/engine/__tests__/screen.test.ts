import { describe, it, expect } from 'vitest';
import { buildPalette, paletteToRGBA } from '../palette';

/**
 * Screen palette expansion.
 *
 * The Renderer turns each Screen pixel (a palette *index* 0..255) into RGBA via
 * the global 256-colour palette. These tests pin the palette generation and the
 * index->RGB expansion used by Renderer.blit(), including the transparent
 * sentinel (255) which the renderer maps to black.
 */
describe('palette expansion (6x6x6)', () => {
  const colors = buildPalette();

  it('builds a 256-entry palette', () => {
    expect(colors.length).toBe(256);
  });

  it('paletteToRGBA expands a valid index to [r, g, b]', () => {
    const rgb = paletteToRGBA(0, colors);
    expect(rgb).not.toBeNull();
    expect(rgb).toHaveLength(3);
    // Index 0 -> r=g=b=10 (per buildPalette channel baseline).
    expect(rgb![0]).toBe(10);
    expect(rgb![1]).toBe(10);
    expect(rgb![2]).toBe(10);
  });

  it('returns null for the transparent sentinel (255) and out-of-range', () => {
    expect(paletteToRGBA(255, colors)).toBeNull();
    expect(paletteToRGBA(256, colors)).toBeNull();
    expect(paletteToRGBA(-1, colors)).toBeNull();
  });
});
