/**
 * Port of item/resource/FoodResource.java.
 *
 * Eating heals the player at a stamina cost — interactOn mirrors the GWT
 * source, calling player.payStamina(staminaCost) then player.heal(heal) only
 * when the player is hurt and can afford the stamina.
 */
import type { Level } from '../../level/Level';
import type { Player } from '../../entity/Player';
import type { Tile } from '../../level/tile/Tile';
import { Resource } from './Resource';

export class FoodResource extends Resource {
  private heal: number;
  private staminaCost: number;

  constructor(name: string, sprite: number, color: number, heal: number, staminaCost: number) {
    super(name, sprite, color);
    this.heal = heal;
    this.staminaCost = staminaCost;
  }

  public interactOn(_tile: Tile, _level: Level, _xt: number, _yt: number, player: Player, _attackDir: number): boolean {
    if (player.health < player.maxHealth && player.payStamina(this.staminaCost)) {
      player.heal(this.heal);
      return true;
    }
    return false;
  }
}
