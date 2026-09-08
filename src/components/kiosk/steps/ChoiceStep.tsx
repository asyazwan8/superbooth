"use client";

import { BigButton } from "@/components/kiosk/BigButton";
import { OptionGrid } from "@/components/kiosk/OptionGrid";
import { StepDots, StepFooter, StepHeader } from "@/components/kiosk/StepChrome";
import { STEP_TITLES, type ChoiceKey } from "@/lib/booth/steps";
import type { BoothOption } from "@/lib/schema";

/**
 * One screen serving scene, pose/costume and treatment.
 *
 * Tapping an option selects it and advances immediately — on a booth with a
 * queue behind it, a select-then-confirm pattern doubles the taps for no
 * benefit. The explicit Continue button stays for anyone who has already
 * chosen and wants to move on without re-tapping.
 */
export function ChoiceStep({
  choiceKey,
  options,
  selectedId,
  onSelect,
  onBack,
  dotsTotal,
  dotsCurrent,
}: {
  choiceKey: ChoiceKey;
  options: BoothOption[];
  selectedId: string | null;
  onSelect: (option: BoothOption) => void;
  onBack: () => void;
  dotsTotal: number;
  dotsCurrent: number;
}) {
  const { title, subtitle } = STEP_TITLES[choiceKey];

  return (
    <div className="flex h-full flex-col">
      <StepHeader title={title} subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <OptionGrid options={options} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <StepFooter
        onBack={onBack}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          selectedId ? (
            <BigButton
              className="w-full"
              onClick={() => {
                const chosen = options.find((option) => option.id === selectedId);
                if (chosen) onSelect(chosen);
              }}
            >
              Continue
            </BigButton>
          ) : null
        }
      />
    </div>
  );
}
