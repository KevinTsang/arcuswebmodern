const STEPS = [
  'Insert the battery in the Smart Key.',
  'Press and hold the LEARN button on the Pet Door until the green light begins to flash, then release the button.',
  'Hold the Smart Key directly below the green light until the light stops flashing.',
];

/**
 * Steps for pairing a smart key. Keys are learned at the door itself; the
 * platform reports the new key with petdoor:TokenAdded and it then appears
 * in the list.
 */
export function PetDoorAddSmartKeyInstructions() {
  return (
    <ol data-testid="petdoor-add-key-steps" className="space-y-2 my-3">
      {STEPS.map((step, i) => (
        <li key={step} className="flex gap-3 p-3 bg-pigeon rounded-[var(--border-radius-base)] text-sm text-coot">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-peacock text-crane text-xs font-medium flex items-center justify-center">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
