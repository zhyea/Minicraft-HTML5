/**
 * Port of item/ToolType.java — the tool "kind" enum.
 *
 * Mirrors the GWT statics exactly: shovel/hoe/sword/pickaxe/axe with the
 * matching sprite offsets + display names. Direct static initialisation is
 * safe here — unlike Tile/Resource there is no subclass circular-init hazard,
 * so we do not need a deferred install() step.
 */
export class ToolType {
  public static readonly shovel: ToolType = new ToolType('铲', 0);
  public static readonly hoe: ToolType = new ToolType('锄', 1);
  public static readonly sword: ToolType = new ToolType('剑', 2);
  public static readonly pickaxe: ToolType = new ToolType('镐', 3);
  public static readonly axe: ToolType = new ToolType('斧', 4);

  public readonly name: string;
  public readonly sprite: number;

  private constructor(name: string, sprite: number) {
    this.name = name;
    this.sprite = sprite;
  }

  private static readonly BY_NAME = new Map<string, ToolType>([
    [ToolType.shovel.name, ToolType.shovel],
    [ToolType.hoe.name, ToolType.hoe],
    [ToolType.sword.name, ToolType.sword],
    [ToolType.pickaxe.name, ToolType.pickaxe],
    [ToolType.axe.name, ToolType.axe],
  ]);

  public static getByName(name: string): ToolType | null {
    return name == null ? null : ToolType.BY_NAME.get(name) ?? null;
  }
}
