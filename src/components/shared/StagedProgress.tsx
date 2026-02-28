'use client';

/**
 * StagedProgress — visual step progress indicator.
 *
 * Replaces src/components/staged-progress/. Shows completed,
 * in-progress, and pending stages as a horizontal bar.
 */

interface Stage {
  key: string;
  label: string;
}

interface StagedProgressProps {
  stages: Stage[];
  currentStage: string;
}

export function StagedProgress({ stages, currentStage }: StagedProgressProps) {
  const currentIndex = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isComplete
                    ? 'bg-honeycreeper text-crane'
                    : isCurrent
                      ? 'bg-peacock text-crane'
                      : 'bg-pigeon text-grouse'
                }`}
              >
                {isComplete ? '\u2713' : i + 1}
              </div>
              <span className={`text-[10px] mt-1 ${isCurrent ? 'text-swift font-medium' : 'text-grouse'}`}>
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className={`w-6 h-0.5 mb-4 ${isComplete ? 'bg-honeycreeper' : 'bg-pigeon'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
