import type { SelectorValue } from './types';

interface FallbackSelectorProps {
  name: string;
  current: SelectorValue | undefined;
}

export function FallbackSelector({ name, current }: FallbackSelectorProps) {
  return (
    <div>
      <span className="text-xs text-grouse">{name}: </span>
      <span className="text-xs text-swift">{String(current ?? '')}</span>
    </div>
  );
}
