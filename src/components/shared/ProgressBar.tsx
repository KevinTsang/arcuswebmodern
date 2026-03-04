'use client';

/**
 * ProgressBar — horizontal progress indicator.
 *
 * Replaces src/components/progress-bar/.
 */

interface ProgressBarProps {
  percent: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ percent, label, color = 'bg-peacock' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div>
      {label && (
        <div className="progress-bar-label flex justify-between text-xs text-grouse mb-1">
          <span>{label}</span>
          <span>{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-2 bg-pigeon rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
