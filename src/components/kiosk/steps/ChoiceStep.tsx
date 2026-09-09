"use client";

import { OptionGrid, StepDots, StepFooter, StepHeader } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";
import { STEP_TITLES, type ChoiceKey } from "@/lib/booth/steps";
import type { BoothOption } from "@/lib/schema";

/** Each choice gets its own header colour, so the three screens are telling apart. */
const HEADER_TONES = {
  scene: "purple",
  pose: "pink",
  treatment: "ink",
} as const;

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StepHeader
        eyebrow={`Step ${String(dotsCurrent + 1).padStart(2, "0")} / ${String(dotsTotal).padStart(2, "0")}`}
        title={title}
        subtitle={subtitle}
        tone={HEADER_TONES[choiceKey]}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "0 var(--booth-gutter) var(--space-4)",
        }}
      >
        <OptionGrid
          options={options}
          selectedId={selectedId}
          onSelect={(option) => {
            const chosen = options.find((candidate) => candidate.id === option.id);
            if (chosen) onSelect(chosen);
          }}
        />
      </div>

      <StepFooter
        onBack={onBack}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          selectedId ? (
            <Button
              full
              onClick={() => {
                const chosen = options.find((option) => option.id === selectedId);
                if (chosen) onSelect(chosen);
              }}
            >
              Continue
            </Button>
          ) : null
        }
      />
    </div>
  );
}
