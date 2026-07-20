/**
 * Port of item/ToolItem.java.
 *
 * `getAttackDamageBonus` is the load-bearing logic: the sword/axe bonus tables
 * match the GWT source exactly —
 *   axe    = (level + 1) * 2 + rand(4)
 *   sword  = (level + 1) * 3 + rand(2 + level * level * 2)
 * where rand(n) is nextInt(n) in [0, n-1] (see engine/Rand.nextInt). The
 * per-instance Random is replaced by the ts-port Rand (deterministic-seed
 * capable, but here default-seeded like Java's `new Random()`).
 *
 * NOTE: the Java LEVEL_COLORS literal `055` is octal (== 45 decimal) in the
 * GWT source; we write the decimal equivalent so the packed colour is identical.
 */
import type { Screen } from '../../engine/Screen';
import type { Entity } from '../entity/Entity';
import { Rand } from '../../engine/Rand';
import { Color } from '../../engine/Color';
import { Item } from './Item';
import { ToolType } from './ToolType';

export class ToolItem extends Item {
  private random = new Rand();

  public static readonly MAX_LEVEL = 5;
  public static readonly LEVEL_NAMES = ['木', '石', '铁', '金', '宝石'];
  public static readonly LEVEL_COLORS = [
    Color.get(-1, 100, 321, 431),
    Color.get(-1, 100, 321, 111),
    Color.get(-1, 100, 321, 555),
    Color.get(-1, 100, 321, 550),
    Color.get(-1, 100, 321, 45), // Java "055" is octal == 45
  ];

  public type: ToolType;
  public level = 0;

  constructor(type: ToolType, level: number) {
    super();
    this.type = type;
    this.level = level;
  }

  public getColor(): number {
    return ToolItem.LEVEL_COLORS[this.level];
  }

  public getSprite(): number {
    return this.type.sprite + 5 * 32;
  }

  public renderIcon(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public renderInventory(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public getName(): string {
    return ToolItem.LEVEL_NAMES[this.level] + this.type.name;
  }

  public onTake(_itemEntity: unknown): void {}

  public canAttack(): boolean {
    return true;
  }

  /** Returns the bonus damage dealt when this tool attacks an entity. */
  public getAttackDamageBonus(_e: Entity): number {
    if (this.type === ToolType.axe) {
      return (this.level + 1) * 2 + this.random.nextInt(4);
    }
    if (this.type === ToolType.sword) {
      return (this.level + 1) * 3 + this.random.nextInt(2 + this.level * this.level * 2);
    }
    return 1;
  }

  public matches(item: Item): boolean {
    if (item instanceof ToolItem) {
      // Compare ToolType by its stable `name` (unique per kind) rather than by
      // object identity. Vue's reactive() deeply proxies nested objects, so a
      // ToolItem stored inside a reactive Inventory ends up holding a
      // reactive(ToolType) proxy whose identity differs from the raw
      // ToolType.sword singleton — a bare `===` would then wrongly report
      // "no match". `name` (铲/锄/剑/镐/斧) is stable across the proxy and
      // mirrors Java's enum identity semantics.
      if (item.type.name !== this.type.name) return false;
      if (item.level !== this.level) return false;
      return true;
    }
    return false;
  }
}
