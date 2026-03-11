import type { PairingStage } from './types';

const STAGES: PairingStage[] = ['steps', 'searching', 'customize', 'completed'];

interface StageIndicatorProps {
  stage: PairingStage;
}

export default function StageIndicator({ stage }: StageIndicatorProps) {
  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i < stageIndex
                ? 'bg-honeycreeper text-crane'
                : i === stageIndex
                  ? 'bg-peacock text-crane'
                  : 'bg-pigeon text-grouse'
            }`}
          >
            {i < stageIndex ? '\u2713' : i + 1}
          </div>
          {i < 3 && (
            <div className={`w-8 h-0.5 ${i < stageIndex ? 'bg-honeycreeper' : 'bg-pigeon'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
