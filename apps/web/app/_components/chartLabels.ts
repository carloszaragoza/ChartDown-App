import type { SectionLength } from "chartdown";
import type { SectionLabels } from "@chartdown/ui";
import { useTranslations } from "next-intl";

/** The words the chart components show and read out, in the interface language. */
export function useChartLabels(): SectionLabels {
  const t = useTranslations("chart");
  const instruments = useTranslations("instruments");
  const length = ({ perPass, times }: SectionLength, { pickup = false } = {}) =>
    times > 1
      ? t(pickup ? "barsPickupTimes" : "barsTimes", { count: perPass, times })
      : t(pickup ? "barsPickup" : "bars", { count: perPass });
  const instrument = (id: string) =>
    instruments.has(id as "keys") ? instruments(id as "keys") : id;
  return {
    length,
    next: t("next"),
    notesForYou: t("notesForYou"),
    bar: {
      push: t("push"),
      hold: t("hold"),
      stab: t("stab"),
      fermata: t("fermata"),
      noChord: t("noChord"),
      repeatBar: t("repeatBar"),
      tie: t("tie"),
      instrument,
      keyChange: (key: string) => t("keyChange", { key }),
      meterTempoChange: ({ meter, tempo }: { meter?: string; tempo?: number }) =>
        [
          meter !== undefined && t("meterChange", { meter }),
          tempo !== undefined && t("tempoChange", { tempo }),
        ]
          .filter(Boolean)
          .join(" · "),
      shortPush: t("shortPush"),
      riff: t("riff"),
      beat: (beat: number, strength: "strong" | "semi" | "weak") =>
        t("beat", { beat, strength: t(`beatStrength.${strength}`) }),
    },
  };
}
