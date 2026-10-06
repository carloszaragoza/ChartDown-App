import {Grid} from '@astryxdesign/core/Grid';
import {HStack} from '@astryxdesign/core/HStack';
import {VStack} from '@astryxdesign/core/VStack';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import type {ReactNode} from 'react';

// A bar is a list of chords; each chord is "6m", "4add2/6", etc. Optional dynamic.
export type Bar = {chords: string[]; dynamic?: string};

const barLine = 'calc(var(--border-width) * 3) solid var(--color-text-primary)';
const barLineMuted = 'calc(var(--border-width) * 2) solid var(--color-border-emphasized)';

function Chord({value, size}: {value: string; size: 'lg' | 'sm'}) {
  const m = value.match(/^([b#]?[1-7])(m|-)?(.*)$/);
  const root = m ? m[1] : value;
  const minor = m && m[2] ? '-' : '';
  const rest = m ? m[3] : '';
  return (
    <Text size={size === 'lg' ? '4xl' : '2xl'} weight="semibold" hasTabularNumbers color={size === 'lg' ? 'primary' : 'secondary'}>
      {root}
      {(minor || rest) && (
        <sup style={{fontSize: '0.5em', marginInlineStart: 'var(--spacing-0-5)'}}>{minor}{rest}</sup>
      )}
    </Text>
  );
}

export function BarRow({bars, size = 'lg'}: {bars: Bar[]; size?: 'lg' | 'sm'}) {
  const muted = size === 'sm';
  return (
    <Grid columns={4} gap={0}>
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            minHeight: muted ? 'var(--spacing-12)' : 'calc(var(--spacing-12) * 2)',
            borderInlineEnd: muted ? barLineMuted : barLine,
            borderInlineStart: i === 0 ? (muted ? barLineMuted : barLine) : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingInline: 'var(--spacing-2)',
          }}>
          {bar.dynamic && (
            <span style={{position: 'absolute', insetBlockStart: 'var(--spacing-1)', insetInlineStart: 'var(--spacing-2)'}}>
              <Text type="supporting" weight="bold" color="accent">
                <i>{bar.dynamic}</i>
              </Text>
            </span>
          )}
          {bar.chords.map((c, j) => (
            <Chord key={j} value={c} size={size} />
          ))}
        </div>
      ))}
    </Grid>
  );
}

export type Note = {for: string; text: string; icon?: ReactNode};

export function MDNotes({notes}: {notes: Note[]}) {
  return (
    <VStack gap={2}>
      {notes.map((n, i) => (
        <HStack key={i} gap={2} vAlign="center">
          <Token label={n.for} color="red" size="sm" icon={n.icon} />
          <Text>{n.text}</Text>
        </HStack>
      ))}
    </VStack>
  );
}
