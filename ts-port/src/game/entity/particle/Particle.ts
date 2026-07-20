/**
 * Port of entity/particle/Particle.java — the base particle entity.
 *
 * In the GWT source SmashParticle/TextParticle extend Entity directly (this
 * Particle base is a standalone class); it is ported verbatim as the shared
 * "particle" concept. Spawn sites add these to a Level via Level.add.
 */
import { Entity } from '../Entity';

export class Particle extends Entity {}
