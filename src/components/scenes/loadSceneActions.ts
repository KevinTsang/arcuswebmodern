import { addNotification } from '@/store/slices/uiSlice';
import type { AppDispatch } from '@/store/store';
import { resolveSceneActions, type ResolveResult } from './resolveSceneActions';

/**
 * Resolves the scene actions the place can use. Never rejects: a failure
 * dispatches an error notification and resolves to no actions.
 */
export async function loadSceneActions(
  placeId: string,
  sceneTemplateId: string | undefined,
  dispatch: AppDispatch,
): Promise<ResolveResult> {
  try {
    return await resolveSceneActions(placeId, sceneTemplateId);
  } catch {
    dispatch(addNotification({ type: 'error', message: 'Failed to load scene actions' }));
    return { actions: [], templateAddress: '' };
  }
}
