/**
 * Favorites.
 *
 * On the platform, a favorite is not a dedicated attribute — it is the presence
 * of the `FAVORITE` tag in `base:tags`, toggled with the `base:AddTags` /
 * `base:RemoveTags` commands. This mirrors the legacy client (`~/arcusweb`'s
 * `models/base.js`), where `isFavorite` reads `base:tags` for `'FAVORITE'`.
 *
 * The previous implementation wrote a made-up `dev:favorite` attribute via
 * `base:SetAttributes`, which the platform ignored — so favorites never
 * persisted. Everything favorite-related should go through this module.
 */

import Bridge from '@arcus/core/bridge';
import { Base } from '@arcus/core';
import type { ArcusEntity } from '@/store/entityTypes';

/** The tag the platform uses to mark an object as a favorite. */
export const FAVORITE_TAG = 'FAVORITE';

/** Whether an entity is currently tagged as a favorite. */
export function isFavorite(entity: ArcusEntity): boolean {
  const tags = entity[Base.ATTR_TAGS];
  return Array.isArray(tags) && tags.includes(FAVORITE_TAG);
}

/**
 * Add or remove the FAVORITE tag on an object, persisting the change through
 * the platform. `favorite` is the desired end state (true = add, false =
 * remove). The platform responds with a `base:ValueChange` for `base:tags`,
 * which the store applies, so callers do not need to update state themselves.
 */
export function setFavorite(address: string, favorite: boolean): Promise<unknown> {
  const command = favorite ? Base.CMD_ADDTAGS : Base.CMD_REMOVETAGS;
  return Bridge.request(command, address, { tags: [FAVORITE_TAG] });
}
