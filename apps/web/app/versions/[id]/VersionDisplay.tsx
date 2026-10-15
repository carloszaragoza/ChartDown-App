"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { keyName, type Chart } from "chartdown";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { BeatsControl } from "../../_components/BeatsControl";
import { ChartPreview } from "../../_components/ChartPreview";
import { displayHref, keysInMode, viewAddress, type Display } from "./display";
import { DisplayControls } from "./VersionControls";

/**
 * How a version's page shows its chart, changed in the browser as stand mode does (F-011): the
 * chart, the key in the header and the Stand mode link follow a choice at once, and the address
 * is replaced so a reload or a shared link shows the same view. Nothing is asked of the server.
 */
const DisplayContext = createContext<{
  chart: Chart;
  display: Display | undefined;
  choose: (display: Display) => void;
} | null>(null);

function useDisplay() {
  const value = useContext(DisplayContext);
  if (!value) throw new Error("useDisplay outside VersionDisplay");
  return value;
}

export function VersionDisplay({
  chart,
  initial,
  path,
  children,
}: {
  chart: Chart;
  initial: Display | undefined;
  /** The page's address without a query; none when the view is not in the address. */
  path: string | undefined;
  children: ReactNode;
}) {
  const [display, setDisplay] = useState(initial);
  const choose = useCallback(
    (next: Display) => {
      setDisplay(next);
      if (!path) return;
      const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", viewAddress(here, path, next, chart));
    },
    [chart, path],
  );
  return (
    <DisplayContext.Provider value={{ chart, display, choose }}>{children}</DisplayContext.Provider>
  );
}

/** The key the chart is shown in, and the written one when they differ. */
export function ShownKey({ words }: { words: { key: string; writtenIn: string } }) {
  const { chart, display } = useDisplay();
  const shown = keyName(display?.key ?? chart.key);
  return (
    <>
      <Token label={`${words.key} ${shown}`} size="sm" />
      {shown !== keyName(chart.key) && <Text type="supporting">{words.writtenIn}</Text>}
    </>
  );
}

/** Stand mode, opened with the view chosen here. */
export function StandLink({ base, label, icon }: { base: string; label: string; icon: ReactNode }) {
  const { chart, display } = useDisplay();
  if (!display) return null;
  return (
    <Button label={label} variant="primary" href={displayHref(base, display, chart)} icon={icon} />
  );
}

/** Numbers or letters, the key, Beats, and the way back to the written key. */
export function DisplayBar({
  words,
}: {
  words: {
    label: string;
    style: string;
    numbers: string;
    letters: string;
    key: string;
    writtenOption: string;
    written: string;
    beats: { label: string; name: string; off: string; auto: string; always: string };
  };
}) {
  const { chart, display, choose } = useDisplay();
  if (!display) return null;
  const written = keyName(chart.key);
  return (
    <HStack gap={3} vAlign="center" wrap="wrap">
      <DisplayControls
        style={display.style}
        onStyle={(style) => choose({ ...display, style })}
        shown={keyName(display.key)}
        keys={keysInMode(chart.key.minor).map((key) => ({
          value: keyName(key),
          label: keyName(key) === written ? words.writtenOption : keyName(key),
          key,
        }))}
        onKey={(key) => choose({ ...display, key })}
        words={words}
      />
      <BeatsControl
        value={display.beats}
        onChoose={(beats) => choose({ ...display, beats })}
        words={words.beats}
      />
      {keyName(display.key) !== written && (
        <Button
          label={words.written}
          variant="ghost"
          onClick={() => choose({ ...display, key: chart.key })}
        />
      )}
    </HStack>
  );
}

/** The chart, drawn in the view chosen. */
export function DisplayedChart({ phone }: { phone: boolean }) {
  const { chart, display } = useDisplay();
  return (
    <ChartPreview
      chart={chart}
      style={display?.style ?? "numbers"}
      homeKey={display?.key ?? chart.key}
      isFramed
      hasForm
      beats={display?.beats ?? "auto"}
      phone={phone}
    />
  );
}
