"use client";

import { OptionGrid, StepDots, StepFooter, StepHeader } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";
import type { BoothOption } from "@/lib/schema";
import type { HeaderTone } from "@/components/ds/booth";

/**
 * One screen serving the theme and every customisation it asks about.
 *
 * Tapping an option selects it and advances immediately — on a booth with a
 * queue behind it, a select-then-confirm pattern doubles the taps for no
 * benefit. The explicit Continue button stays for anyone who has already
 * chosen and wants to move on without re-tapping.
 */
export function ChoiceStep({
  title,
  subtitle,
  tone,
  options,
  selectedId,
  onSelect,
  onBack,
  dotsTotal,
  dotsCurrent,
}: {
  title: string;
  subtitle: string;
  tone: HeaderTone;
  options: BoothOption[];
  selectedId: string | null;
  onSelect: (option: BoothOption) => void;
  onBack?: () => void;
  dotsTotal: number;
  dotsCurrent: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StepHeader
        eyebrow={`Step ${String(dotsCurrent + 1).padStart(2, "0")} / ${String(dotsTotal).padStart(2, "0")}`}
        title={title}
        subtitle={subtitle}
        tone={tone}
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
          onSelect={(chosen) => {
            // OptionGrid speaks the design system's view type; map back to the
            // preset's own option so callers get the prompt fragment too.
            const option = options.find((candidate) => candidate.id === chosen.id);
            if (option) onSelect(option);
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
