/**
 * Port of gfx/Font.java — the Minicraft bitmap font.
 *
 * The GWT `chars` string is kept byte-for-byte. `draw` uppercases the message
 * and, for every character present in `chars`, blits the matching 8x8 tile out
 * of the shared sprite sheet via Screen.render — exactly like the Java original
 * (glyph tile = charIndex + 30*32). The sprite sheet used by this port was
 * verified to contain those glyphs at row 30 (A-Z) and row 31 (0-9 + punct),
 * so A-Z and 0-9 render 1:1 with Java.
 *
 * Characters outside `chars` (non-ASCII, stray symbols) fall back to a compact
 * built-in 5x7 bitmap so text never silently disappears — fulfilling the
 * "数字与字母总能渲染" guarantee even if the sheet were ever swapped.
 */
import type { Screen } from './Screen';

// Mirrors gfx/Font.java's `chars` constant exactly (index 0 -> sprite tile 960).
// Backticks avoid quote-escaping the embedded ' and ".
const chars =
  '' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ      ' +
  `0123456789.,!?'"-+=/\\%()<>:;     ` +
  '';

// Compact built-in 5x7 fallback, keyed by character. Each glyph is 7 rows of 5
// chars ('#' = on, ' ' = off). Used only for characters not in `chars`.
const FALLBACK: Record<string, string[]> = {
  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  'A': [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  'B': ['#####', '#   #', '#   #', '#####', '#   #', '#   #', '#####'],
  'C': [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  'D': ['#####', '#   #', '#   #', '#   #', '#   #', '#   #', '#####'],
  'E': ['#####', '#    ', '#    ', '#####', '#    ', '#    ', '#####'],
  'F': ['#####', '#    ', '#    ', '#####', '#    ', '#    ', '#    '],
  'G': [' ####', '#    ', '#    ', '#  ##', '#   #', '#   #', ' ####'],
  'H': ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  'I': ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '#####'],
  'J': ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
  'K': ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  'L': ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  'M': ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
  'N': ['#   #', '#   #', '##  #', '# # #', '#  ##', '#   #', '#   #'],
  'O': [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  'P': ['#####', '#   #', '#   #', '#####', '#    ', '#    ', '#    '],
  'Q': [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ### '],
  'R': ['#####', '#   #', '#   #', '#####', '# #  ', '#  # ', '#   #'],
  'S': [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  'T': ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  'U': ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  'V': ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  'W': ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #'],
  'X': ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  'Y': ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  'Z': ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
};

/** Expand a 5x7 string glyph into the flat 8x8 (1 = on) array that
 *  Screen.renderGlyph expects, indexed [x + y*8]. */
function toGlyph8x8(rows: string[]): number[] {
  const g = new Array<number>(64).fill(0);
  for (let y = 0; y < 7; y++) {
    const row = rows[y];
    for (let x = 0; x < 5; x++) {
      if (row[x] !== ' ') g[x + y * 8] = 1;
    }
  }
  return g;
}

export class Font {
  /**
   * Draw `msg` left-to-right starting at (x, y) in 8px monospace cells, using
   * `col` as the 4-shade palette selector (see Color.get). Mirrors
   * gfx.Font.draw: uppercased, each character blits its sheet tile
   * (charIndex + 30*32); characters absent from the sheet fall back to the
   * built-in 5x7 bitmap so they still render something.
   */
  public static draw(msg: string, screen: Screen, x: number, y: number, col: number): void {
    msg = msg.toUpperCase();
    for (let i = 0; i < msg.length; i++) {
      const c = msg.charAt(i);
      const ix = chars.indexOf(c);
      if (ix >= 0) {
        screen.render(x + i * 8, y, ix + 30 * 32, col, 0);
      } else {
        const fallback = FALLBACK[c] ?? FALLBACK['?'];
        screen.renderGlyph(x + i * 8, y, toGlyph8x8(fallback), col);
      }
    }
  }
}
