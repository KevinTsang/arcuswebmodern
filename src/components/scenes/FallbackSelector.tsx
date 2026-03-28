interface FallbackSelectorProps {
  name: string;
  current: unknown;
}

export function FallbackSelector({ name, current }: FallbackSelectorProps) {
  return (
    <div>
      <span className="text-xs text-grouse">{name}: </span>
      <span className="text-xs text-swift">{String(current ?? '')}</span>
    </div>
  );
}
