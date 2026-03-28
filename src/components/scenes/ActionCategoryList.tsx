import type { ResolvedAction } from './ScenePanel';

interface ActionCategoryListProps {
  name: string;
  onNameChange: (name: string) => void;
  satisfiableActions: ResolvedAction[];
  unsatisfiableActions: ResolvedAction[];
  getConfiguredDeviceCount: (actionId: string) => number;
  saving: boolean;
  hasAnyConfigured: boolean;
  onSelectAction: (actionId: string) => void;
  onSave: () => void;
  onCancel: () => void;
  heading?: string;
  saveLabel?: string;
  savingLabel?: string;
}

export function ActionCategoryList({
  name,
  onNameChange,
  satisfiableActions,
  unsatisfiableActions,
  getConfiguredDeviceCount,
  saving,
  hasAnyConfigured,
  onSelectAction,
  onSave,
  onCancel,
  heading = 'Create Scene',
  saveLabel = 'Create Scene',
  savingLabel = 'Creating...',
}: ActionCategoryListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-swift mb-4">{heading}</h3>

      <div className="mb-4">
        <label htmlFor="newSceneName" className="block text-sm font-medium text-swift mb-1">
          Scene Name
        </label>
        <input
          id="newSceneName"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-grouse rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock"
        />
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-swift mb-2">Actions</h4>
        <div className="space-y-1">
          {satisfiableActions.map((action) => {
            const configuredCount = getConfiguredDeviceCount(action.id);
            const deviceCount = Object.keys(action.selectors).length;
            return (
              <button
                key={action.id}
                onClick={() => onSelectAction(action.id)}
                className="w-full flex items-center justify-between px-3 py-3 border border-heron rounded-[var(--border-radius-base)] hover:bg-pigeon/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-swift">{action.name}</span>
                  <span className="text-xs text-grouse">{deviceCount} device{deviceCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  {configuredCount > 0 && (
                    <span className="bg-lovebird text-crane text-xs font-medium px-2 py-0.5 rounded-full">
                      {configuredCount}
                    </span>
                  )}
                  <span className="text-grouse">&rsaquo;</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {unsatisfiableActions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-grouse mb-2">More Actions</h4>
          <div className="space-y-1 opacity-50">
            {unsatisfiableActions.map((action) => (
              <div
                key={action.id}
                className="px-3 py-3 border border-heron rounded-[var(--border-radius-base)] text-left"
              >
                <span className="text-sm text-grouse">{action.name}</span>
                <span className="text-xs text-grouse ml-2">(no compatible devices)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving || !name.trim() || !hasAnyConfigured}
          className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50 text-sm"
        >
          {saving ? savingLabel : saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="border border-heron text-coot px-5 py-2 rounded-[var(--border-radius-base)] hover:bg-pigeon text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
