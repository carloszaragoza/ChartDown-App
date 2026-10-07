import {useState} from 'react';
import {AppShell} from '@astryxdesign/core/AppShell';
import {SideNav, SideNavHeading, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Layout, LayoutContent, LayoutHeader, LayoutPanel} from '@astryxdesign/core/Layout';
import {VStack} from '@astryxdesign/core/VStack';
import {HStack} from '@astryxdesign/core/HStack';
import {Heading} from '@astryxdesign/core/Heading';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {List} from '@astryxdesign/core/List';
import {Item} from '@astryxdesign/core/Item';
import {Token} from '@astryxdesign/core/Token';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Section} from '@astryxdesign/core/Section';
import {Card} from '@astryxdesign/core/Card';
import {TextInput} from '@astryxdesign/core/TextInput';
import {TextArea} from '@astryxdesign/core/TextArea';
import {Switch} from '@astryxdesign/core/Switch';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Icon} from '@astryxdesign/core/Icon';
import {Divider} from '@astryxdesign/core/Divider';
import {Table} from '@astryxdesign/core/Table';
import {Selector} from '@astryxdesign/core/Selector';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {Breadcrumbs, BreadcrumbItem} from '@astryxdesign/core/Breadcrumbs';
import {FormLayout} from '@astryxdesign/core/FormLayout';
import {Banner} from '@astryxdesign/core/Banner';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {DateInput} from '@astryxdesign/core/DateInput';
import {TimeInput} from '@astryxdesign/core/TimeInput';
import {CalendarDaysIcon, Squares2X2Icon, FlagIcon, ArrowRightIcon, EyeSlashIcon, NoSymbolIcon, CheckCircleIcon} from '@heroicons/react/24/outline';
import {Squares2X2Icon as GridSolid, FlagIcon as FlagSolid, MusicalNoteIcon as InstSolid} from '@heroicons/react/24/solid';
import {Grid} from '@astryxdesign/core/Grid';
import {Badge} from '@astryxdesign/core/Badge';
import {CheckboxList, CheckboxListItem} from '@astryxdesign/core/CheckboxList';
import {ExclamationTriangleIcon, HomeIcon, ArrowPathIcon, UsersIcon, ChartBarIcon} from '@heroicons/react/24/outline';
import {HomeIcon as HomeSolid} from '@heroicons/react/24/solid';
import {BellIcon, ArrowRightOnRectangleIcon, CheckIcon} from '@heroicons/react/24/outline';
import {BellIcon as BellSolid} from '@heroicons/react/24/solid';
import {DrumsIcon, BassIcon, KeysIcon, GuitarIcon, VocalsIcon, SaxIcon, TrumpetIcon, TromboneIcon, ViolinIcon} from './InstrumentIcons';
import {KeyIcon, ClipboardDocumentIcon, EnvelopeIcon, MusicalNoteIcon} from '@heroicons/react/24/outline';
import {KeyIcon as KeySolid, MusicalNoteIcon as NoteSolid} from '@heroicons/react/24/solid';
import {
  QueueListIcon, BookOpenIcon, UserGroupIcon, UserIcon, PencilSquareIcon, ArrowsPointingOutIcon,
  ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, MagnifyingGlassIcon, PlusIcon,
  ClockIcon, GlobeAltIcon, LockClosedIcon, ChatBubbleLeftRightIcon, ArrowUturnLeftIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import {QueueListIcon as QueueListSolid, BookOpenIcon as BookOpenSolid, UserGroupIcon as UserGroupSolid, UserIcon as UserSolid, PencilSquareIcon as PencilSolid, ChatBubbleLeftRightIcon as ChatSolid, ArrowsPointingOutIcon as StandSolid} from '@heroicons/react/24/solid';
import {BarRow, MDNotes, type Bar} from './Chart';

type Screen = 'set' | 'stand' | 'catalog' | 'editor' | 'layer' | 'bands' | 'band' | 'newversion' | 'invites' | 'personal' | 'admin' | 'instruments' | 'reports' | 'notices' | 'profile' | 'home';

const songs = [
  {n: 1, title: 'Open Road', source: 'Live 2025', key: 'A', notes: 2},
  {n: 2, title: 'Lantern Bay', source: 'Own arrangement', key: 'Em', notes: 1},
  {n: 3, title: 'Wide River', source: 'Studio', key: 'D', notes: 0},
  {n: 4, title: 'Steady Ground', source: 'Acoustic', key: 'G', notes: 3},
  {n: 5, title: 'Morning Field', source: 'Live 2024', key: 'E', notes: 1},
  {n: 6, title: 'Open Road (reprise)', source: 'Own arrangement', key: 'A', notes: 0},
];
const lineup = [
  {name: 'Alex Rivera', role: 'MD · Keys', you: true},
  {name: 'Sam Ortiz', role: 'Drums'},
  {name: 'Jordan Lee', role: 'Bass'},
  {name: 'Maya Cruz', role: 'Guitar'},
  {name: 'Chris Vega', role: 'Vocals'},
  {name: 'Lena Park', role: 'Saxophone'},
];
const chorus: Bar[][] = [
  [{chords: ['4'], dynamic: 'mf'}, {chords: ['1']}, {chords: ['5']}, {chords: ['6m']}],
  [{chords: ['4']}, {chords: ['1']}, {chords: ['5sus', '5']}, {chords: ['1']}],
];
const bridgePreview: Bar[] = [{chords: ['6m']}, {chords: ['4']}, {chords: ['1']}, {chords: ['5']}];
const form = [
  {v: 'I', label: 'Intro'}, {v: 'V1', label: 'Verse 1'}, {v: 'C', label: 'Chorus'}, {v: 'V2', label: 'Verse 2'},
  {v: 'C2', label: 'Chorus 2'}, {v: 'B', label: 'Bridge'}, {v: 'LC', label: 'Last Chorus'},
];

function Nav({screen, go, lang, setLang, unread}: {screen: Screen; go: (s: Screen) => void; lang: string; setLang: (v: string) => void; unread: number}) {
  const isAdmin = true;
  return (
    <SideNav
      label="Main"
      collapsible
      header={
        <SideNavHeading
          heading="ChartDown"
          subheading="LifeStone Church"
          menu={
            <VStack gap={1} padding={2}>
              <Text type="supporting">Switch band</Text>
              <List density="compact">
                <Item as="li" onClick={() => go('set')} startContent={<Avatar name="LifeStone Church" size="sm" shape="rounded" />} label="LifeStone Church" endContent={<Icon icon={CheckIcon} size="sm" />} />
                <Item as="li" onClick={() => go('personal')} startContent={<Avatar name="Personal space" size="sm" shape="rounded" />} label="Personal space" />
              </List>
              <Divider />
              <Button label="All bands" variant="ghost" size="sm" onClick={() => go('bands')} />
            </VStack>
          }
        />
      }
      footer={
        <VStack gap={3} padding={2}>
          <SegmentedControl label="Language" value={lang} onChange={setLang} size="sm" layout="fill">
            <SegmentedControlItem value="en" label="English" />
            <SegmentedControlItem value="es" label="Español" />
          </SegmentedControl>
          <Item
            onClick={() => go('profile')}
            startContent={<Avatar name="Carlos Zaragoza" size="sm" />}
            label="Carlos Zaragoza"
            description={isAdmin ? 'Admin · Keys' : 'Keys'}
            endContent={<Button label="Sign out" isIconOnly variant="ghost" size="sm" tooltip="Sign out" icon={<Icon icon={ArrowRightOnRectangleIcon} />} />}
          />
        </VStack>
      }>
      <SideNavSection title="Home" isHeaderHidden>
        <SideNavItem label="Home" icon={HomeIcon} selectedIcon={HomeSolid} isSelected={screen === 'home'} onClick={() => go('home')} />
        <SideNavItem label="Notices" icon={BellIcon} selectedIcon={BellSolid} isSelected={screen === 'notices'} onClick={() => go('notices')}
          endContent={unread > 0 ? <Badge variant="error" label={String(unread)} /> : undefined} />
      </SideNavSection>
      <SideNavSection title="Play">
        <SideNavItem label="Sets" icon={QueueListIcon} selectedIcon={QueueListSolid} isSelected={screen === 'set'} onClick={() => go('set')} />
        <SideNavItem label="Stand mode" icon={ArrowsPointingOutIcon} selectedIcon={StandSolid} isSelected={screen === 'stand'} onClick={() => go('stand')} />
      </SideNavSection>
      <SideNavSection title="Create">
        <SideNavItem label="Catalog" icon={BookOpenIcon} selectedIcon={BookOpenSolid} isSelected={screen === 'catalog'} onClick={() => go('catalog')} />
        <SideNavItem label="New version" icon={MusicalNoteIcon} selectedIcon={NoteSolid} isSelected={screen === 'newversion'} onClick={() => go('newversion')} />
        <SideNavItem label="Chart editor" icon={PencilSquareIcon} selectedIcon={PencilSolid} isSelected={screen === 'editor'} onClick={() => go('editor')} />
        <SideNavItem label="MD notes" icon={ChatBubbleLeftRightIcon} selectedIcon={ChatSolid} isSelected={screen === 'layer'} onClick={() => go('layer')} />
      </SideNavSection>
      <SideNavSection title="People">
        <SideNavItem label="Bands" icon={UserGroupIcon} selectedIcon={UserGroupSolid} isSelected={screen === 'bands' || screen === 'band'} onClick={() => go('bands')} />
        <SideNavItem label="Personal space" icon={UserIcon} selectedIcon={UserSolid} isSelected={screen === 'personal'} onClick={() => go('personal')} />
      </SideNavSection>
      {isAdmin && (
        <SideNavSection title="Administration">
          <SideNavItem label="Overview" icon={Squares2X2Icon} selectedIcon={GridSolid} isSelected={screen === 'admin'} onClick={() => go('admin')} />
          <SideNavItem label="Instruments" icon={MusicalNoteIcon} selectedIcon={InstSolid} isSelected={screen === 'instruments'} onClick={() => go('instruments')} />
          <SideNavItem label="Invite codes" icon={KeyIcon} selectedIcon={KeySolid} isSelected={screen === 'invites'} onClick={() => go('invites')} />
          <SideNavItem label="Reports" icon={FlagIcon} selectedIcon={FlagSolid} isSelected={screen === 'reports'} onClick={() => go('reports')} endContent={<Badge variant="warning" label="1" />} />
        </SideNavSection>
      )}
    </SideNav>
  );
}

function PageHeader({over, title, meta, actions}: {over: React.ReactNode; title: string; meta?: React.ReactNode; actions?: React.ReactNode}) {
  return (
    <LayoutHeader hasDivider>
      <HStack gap={4} vAlign="end" hAlign="between" paddingInline={6} paddingBlock={4}>
        <VStack gap={1}>
          {typeof over === 'string' ? <Text type="supporting">{over}</Text> : over}
          <Heading level={1}>{title}</Heading>
          {meta}
        </VStack>
        {actions && <HStack gap={2} vAlign="center">{actions}</HStack>}
      </HStack>
    </LayoutHeader>
  );
}

function SetScreen({go}: {go: (s: Screen) => void}) {
  return (
    <Layout
      header={
        <PageHeader
          over="LifeStone Church · Service"
          title="Sunday 12"
          meta={
            <HStack gap={3} vAlign="center">
              <Text color="secondary">Sunday, October 12 · 9:00 AM · 6 songs</Text>
              <HStack gap={1} vAlign="center"><StatusDot variant="success" label="Downloaded for offline" /><Text type="supporting">Offline ready</Text></HStack>
            </HStack>
          }
          actions={<>
            <Button label="Edit set" icon={<Icon icon={PencilSquareIcon} />} />
            <Button label="Start stand mode" variant="primary" icon={<Icon icon={ArrowsPointingOutIcon} />} onClick={() => go('stand')} />
          </>}
        />
      }
      content={
        <LayoutContent padding={0}>
          <List hasDividers listStyle="none" header={<Section padding={4} paddingBlockEnd={1}><Heading level={2}>Songs</Heading></Section>}>
            {songs.map(s => (
              <Item
                key={s.n}
                as="li"
                onClick={() => go('stand')}
                marker={<Text type="large" color="secondary" hasTabularNumbers>{s.n}</Text>}
                label={s.title}
                description={s.source}
                endContent={
                  <HStack gap={3} vAlign="center">
                    <Token label={`Key ${s.key}`} size="sm" />
                    {s.notes > 0
                      ? <HStack gap={1} vAlign="center"><StatusDot variant="error" label="MD notes for you" /><Text type="supporting">{s.notes} for you</Text></HStack>
                      : <Text type="supporting">No notes</Text>}
                  </HStack>
                }
              />
            ))}
          </List>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={340} hasDivider padding={4} label="Lineup">
          <VStack gap={3}>
            <Heading level={2}>Lineup</Heading>
            <List density="compact">
              {lineup.map(p => (
                <Item key={p.name} as="li" startContent={<Avatar name={p.name} size="md" />} label={p.you ? `${p.name} (you)` : p.name} description={p.role} />
              ))}
            </List>
            <Text type="supporting">Each musician sees the MD notes for their own instrument.</Text>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}

function StandScreen({go}: {go: (s: Screen) => void}) {
  const [section, setSection] = useState('C2');
  const [view, setView] = useState('keys');
  return (
    <Layout
      header={
        <LayoutHeader hasDivider>
          <HStack gap={3} vAlign="center" hAlign="between" paddingInline={4} paddingBlock={3}>
            <HStack gap={3} vAlign="center">
              <Button label="Back to set" isIconOnly variant="ghost" icon={<Icon icon={ArrowUturnLeftIcon} />} onClick={() => go('set')} />
              <VStack gap={0}>
                <Text weight="semibold">Sunday 12 – Service</Text>
                <Text type="supporting">Song 1 of 6 · Offline ready</Text>
              </VStack>
            </HStack>
            <HStack gap={2} vAlign="center">
              <SegmentedControl label="View as" value={view} onChange={setView} size="sm">
                <SegmentedControlItem value="all" label="Everyone" />
                <SegmentedControlItem value="keys" label="Keys" />
                <SegmentedControlItem value="drums" label="Drums" />
              </SegmentedControl>
              <Button label="Previous" icon={<Icon icon={ChevronLeftIcon} />} />
              <Button label="Next" variant="primary" endContent={<Icon icon={ChevronRightIcon} />} />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <HStack gap={4} vAlign="end">
              <Heading level={1} type="display-3">Open Road</Heading>
              <HStack gap={2}><Token label="Key A (1)" /><Token label="4/4" /><Token label="76 bpm" /></HStack>
            </HStack>
            <TabList value={section} onChange={setSection} size="sm" hasDivider>
              {form.map(f => <Tab key={f.v} value={f.v} label={f.v} />)}
            </TabList>
            <Card padding={6}>
              <VStack gap={4}>
                <HStack gap={2} vAlign="end"><Heading level={2}>Chorus 2</Heading><Text type="supporting">8 bars</Text></HStack>
                <MDNotes notes={[
                  {for: 'MD', text: 'A touch bigger. Harmonies on the second line.'},
                  ...(view !== 'drums' ? [{for: 'Keys', text: 'Move the pad up an octave. Right hand stays simple.'}] : []),
                  ...(view !== 'keys' ? [{for: 'Drums', text: 'Ride on the chorus, crash on the 1 of the last bar.'}] : []),
                ]} />
                <VStack gap={3}>{chorus.map((row, i) => <BarRow key={i} bars={row} />)}</VStack>
              </VStack>
            </Card>
            <VStack gap={2}>
              <Text type="supporting">Next: <Text weight="semibold">Bridge</Text> · 4 bars ×2 · notes for you</Text>
              <BarRow bars={bridgePreview} size="sm" />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function CatalogScreen({go}: {go: (s: Screen) => void}) {
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('all');
  const versions = [
    {source: 'Live 2025', detail: 'Live recording', by: 'Alex Rivera', key: 'A', meter: '4/4'},
    {source: 'Studio', detail: 'Album version', by: 'LifeStone Church', key: 'G', meter: '4/4'},
    {source: 'Own arrangement', detail: 'Acoustic duo', by: 'Jordan Lee', key: 'D', meter: '6/8'},
  ];
  const others = [['Lantern Bay', 'ChartDown examples', 1], ['Wide River', 'LifeStone Church', 2], ['Steady Ground', 'Maya Cruz', 4], ['Morning Field', 'Chris Vega', 1]] as const;
  return (
    <Layout
      contentWidth={960}
      header={<PageHeader over="Community" title="Catalog" meta={<Text color="secondary">Public ChartDown versions, free to use, fork and play.</Text>} actions={<Button label="New version" variant="primary" icon={<Icon icon={PlusIcon} />} onClick={() => go('editor')} />} />}
      content={
        <LayoutContent padding={4}>
          <VStack gap={4}>
            <HStack gap={3} vAlign="end">
              <VStack width="100%"><TextInput label="Search the catalog" isLabelHidden value={q} onChange={setQ} placeholder="Search by title, artist or source" /></VStack>
              <SegmentedControl label="Filter by source" value={src} onChange={setSrc}>
                <SegmentedControlItem value="all" label="All" />
                <SegmentedControlItem value="studio" label="Studio" />
                <SegmentedControlItem value="live" label="Live" />
                <SegmentedControlItem value="own" label="Own" />
              </SegmentedControl>
            </HStack>
            <Card padding={0}>
              <Section padding={4} paddingBlockEnd={2}>
                <HStack hAlign="between" vAlign="center"><Heading level={2}>Open Road</Heading><Text type="supporting">3 versions</Text></HStack>
              </Section>
              <List hasDividers>
                {versions.map(v => (
                  <Item key={v.source} as="li" startContent={<Token label={v.source} size="sm" />} label={v.detail}
                    description={`by ${v.by} · Key ${v.key} · ${v.meter}`}
                    endContent={<HStack gap={2} vAlign="center">
                      <HStack gap={1} vAlign="center"><Icon icon={GlobeAltIcon} size="sm" color="secondary" /><Text type="supporting">Public</Text></HStack>
                      <Button label="Open" size="sm" onClick={() => go('stand')} />
                      <Button label="Fork" size="sm" icon={<Icon icon={DocumentDuplicateIcon} />} />
                    </HStack>} />
                ))}
              </List>
            </Card>
            <List hasDividers>
              {others.map(([t, a, n]) => (
                <Item key={t} as="li" onClick={() => {}} label={t} description={a} endContent={<Text type="supporting">{n} version{n === 1 ? '' : 's'}</Text>} />
              ))}
            </List>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

const sample = `---
chartdown: 0.4
title: Open Road
key: G
tempo: 76
meter: 4/4
---

## Chorus
> MD: Open it up a little.
> MD drums: Light groove, hi-hat.
{mf} 4 | 1 | 5 | 6m
4 | 1 | 5sus 5 | 1`;

function EditorScreen() {
  const [text, setText] = useState(sample);
  const [vis, setVis] = useState('public');
  return (
    <Layout
      header={<PageHeader over="Own arrangement · Revision 7 · saved 2 minutes ago" title="Open Road" actions={<>
        <SegmentedControl label="Visibility" value={vis} onChange={setVis}>
          <SegmentedControlItem value="public" label="Public" icon={<Icon icon={GlobeAltIcon} />} />
          <SegmentedControlItem value="private" label="Private" icon={<Icon icon={LockClosedIcon} />} />
        </SegmentedControl>
        <Button label="History" icon={<Icon icon={ClockIcon} />} />
        <Button label="Save" variant="primary" />
      </>} />}
      start={
        <LayoutPanel width={460} hasDivider padding={4} label="ChartDown text">
          <VStack gap={2}>
            <HStack hAlign="between"><Text type="supporting">ChartDown 0.4</Text><HStack gap={1} vAlign="center"><StatusDot variant="success" label="No warnings" /><Text type="supporting">No warnings</Text></HStack></HStack>
            <TextArea label="Chart text" isLabelHidden value={text} onChange={setText} rows={18} />
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={6} label="Preview">
          <VStack gap={4}>
            <HStack gap={2} vAlign="end"><Heading level={2}>Chorus</Heading><Text type="supporting">8 bars</Text></HStack>
            <MDNotes notes={[{for: 'MD', text: 'Open it up a little.'}, {for: 'Drums', text: 'Light groove, hi-hat.'}]} />
            <VStack gap={3}>
              <BarRow bars={[{chords: ['4'], dynamic: 'mf'}, {chords: ['1']}, {chords: ['5']}, {chords: ['6m']}]} />
              <BarRow bars={[{chords: ['4']}, {chords: ['1']}, {chords: ['5sus', '5']}, {chords: ['1']}]} />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function LayerScreen() {
  const [sec, setSec] = useState('Chorus');
  const [who, setWho] = useState('all');
  const [note, setNote] = useState('');
  const [hide, setHide] = useState(true);
  const sections = [['Intro', 0], ['Verse 1', 1], ['Chorus', 3], ['Verse 2', 0], ['Bridge', 2], ['Last Chorus', 1]] as const;
  return (
    <Layout
      header={<PageHeader over="LifeStone Church · MD notes" title="Open Road · Live 2025"
        meta={<Text color="secondary">Your notes are private to LifeStone Church. The public version does not change.</Text>}
        actions={<Switch label="Hide the author's notes" value={hide} onChange={setHide} />} />}
      start={
        <LayoutPanel width={260} hasDivider padding={2} label="Sections">
          <List density="compact">
            {sections.map(([s, n]) => (
              <Item key={s} as="li" onClick={() => setSec(s)} label={<Text weight={sec === s ? 'semibold' : 'normal'}>{s}</Text>}
                endContent={<Text type="supporting">{n} notes</Text>} />
            ))}
          </List>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <HStack gap={2} vAlign="end"><Heading level={2}>{sec}</Heading><Text type="supporting">8 bars</Text></HStack>
            <List hasDividers>
              {[['MD', 'Open it up a little. Don’t go all out yet.'], ['Drums', 'Light groove. Hi-hat or ride, no crashes.'], ['Keys', 'Pad underneath, always under the vocal.']].map(([f, t]) => (
                <Item key={f} as="li" startContent={<Token label={f} color="red" size="sm" />} label={t}
                  endContent={<Button label={`Edit ${f} note`} isIconOnly variant="ghost" size="sm" icon={<Icon icon={PencilSquareIcon} />} />} />
              ))}
            </List>
            <BarRow bars={[{chords: ['4'], dynamic: 'mf'}, {chords: ['1']}, {chords: ['5']}, {chords: ['6m']}]} />
            <Divider />
            <VStack gap={3}>
              <Heading level={3}>Add a note to {sec}</Heading>
              <SegmentedControl label="Who is this note for" value={who} onChange={setWho}>
                <SegmentedControlItem value="all" label="Everyone" />
                <SegmentedControlItem value="drums" label="Drums" />
                <SegmentedControlItem value="bass" label="Bass" />
                <SegmentedControlItem value="keys" label="Keys" />
                <SegmentedControlItem value="gtr" label="Guitar" />
                <SegmentedControlItem value="vox" label="Vocals" />
                <SegmentedControlItem value="sax" label="Sax" />
              </SegmentedControl>
              <TextInput label="Note" value={note} onChange={setNote} placeholder="Short and direct, like “Out on the first pass.”" />
              <HStack><Button label="Add note" variant="primary" icon={<Icon icon={PlusIcon} />} /></HStack>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}


type Code = {code: string; kind: string; uses: string; created: string; note: string; status: 'used' | 'active' | 'revoked'} & Record<string, unknown>;

function InvitesScreen({go}: {go: (s: Screen) => void}) {
  const [kind, setKind] = useState('single');
  const [uses, setUses] = useState('');
  const [note, setNote] = useState('');
  const [codes, setCodes] = useState<Code[]>([
    {code: 'U76K-MKDJ', kind: 'Single use', uses: '1 of 1', created: 'Oct 6, 2026', note: 'Owner, Google sign-in', status: 'used'},
    {code: '8M4Z-5EA5', kind: 'Single use', uses: '1 of 1', created: 'Oct 6, 2026', note: 'Owner and main admin', status: 'used'},
    {code: 'B2RT-LS9Q', kind: 'Band code', uses: '2 of 10', created: 'Oct 6, 2026', note: 'LifeStone Church musicians', status: 'active'},
  ]);
  const statusDot = {used: ['neutral', 'Used'], active: ['success', 'Active'], revoked: ['error', 'Revoked']} as const;
  const create = () => {
    const c = Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    setCodes([{code: c, kind: kind === 'single' ? 'Single use' : 'Band code', uses: kind === 'single' ? '0 of 1' : `0 of ${uses || '∞'}`, created: 'Today', note: note || '—', status: 'active'}, ...codes]);
    setNote(''); setUses('');
  };
  return (
    <Layout
      contentWidth={960}
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('admin')}>Administration</BreadcrumbItem><BreadcrumbItem isCurrent>Invite codes</BreadcrumbItem></Breadcrumbs>}
        title="Invite codes"
        meta={<Text color="secondary">During the private beta, nobody can create an account without a code.</Text>} />}
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            <Card>
              <VStack gap={4}>
                <Heading level={2}>Create a code</Heading>
                <FormLayout direction="horizontal">
                  <Selector label="Kind" value={kind} onChange={setKind} options={[{value: 'single', label: 'Single use', description: 'Works once, for one person'}, {value: 'band', label: 'Band code', description: 'Shared by several people'}]} />
                  <TextInput label="Uses" description={kind === 'single' ? 'Always 1 for single-use codes' : 'Leave empty for no limit'} value={kind === 'single' ? '1' : uses} onChange={setUses} isDisabled={kind === 'single'} />
                  <TextInput label="Who it is for" value={note} onChange={setNote} placeholder="Name or band" isOptional />
                </FormLayout>
                <HStack><Button label="Create code" variant="primary" icon={<Icon icon={PlusIcon} />} onClick={create} /></HStack>
              </VStack>
            </Card>
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center"><Heading level={2}>Codes</Heading><Text type="supporting">{codes.length} codes</Text></HStack>
              <Table<Code>
                data={codes}
                idKey="code"
                hasHover
                columns={[
                  {key: 'code', header: 'Code', width: 170, renderCell: r => <HStack gap={1} vAlign="center"><Text type="code" weight="semibold" textWrap="nowrap">{r.code}</Text><Button label={`Copy ${r.code}`} isIconOnly size="sm" variant="ghost" icon={<Icon icon={ClipboardDocumentIcon} />} /></HStack>},
                  {key: 'kind', header: 'Kind', renderCell: r => <Token label={r.kind} size="sm" />},
                  {key: 'uses', header: 'Uses', renderCell: r => <Text hasTabularNumbers>{r.uses}</Text>},
                  {key: 'note', header: 'For'},
                  {key: 'created', header: 'Created'},
                  {key: 'status', header: 'Status', renderCell: r => <HStack gap={1} vAlign="center"><StatusDot variant={statusDot[r.status][0]} label={statusDot[r.status][1]} /><Text>{statusDot[r.status][1]}</Text></HStack>},
                  {key: 'actions', header: '', align: 'end', renderCell: r => r.status === 'active'
                    ? <Button label="Revoke" size="sm" variant="destructive" onClick={() => setCodes(codes.map(c => c.code === r.code ? {...c, status: 'revoked'} : c))} />
                    : null},
                ]}
              />
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function BandsScreen({go}: {go: (s: Screen) => void}) {
  const [name, setName] = useState('');
  return (
    <Layout
      header={<PageHeader over="People" title="Bands" meta={<Text color="secondary">The bands you play in. Your role can be different in each one.</Text>} />}
      content={
        <LayoutContent padding={0}>
          <List hasDividers header={<Section padding={4} paddingBlockEnd={1}><Heading level={2}>Your bands</Heading></Section>}>
            <Item as="li" onClick={() => go('band')} startContent={<Avatar name="LifeStone Church" shape="rounded" />} label="LifeStone Church"
              description="1 member · 2 pending invitations · next set Sunday 12"
              endContent={<HStack gap={2} vAlign="center"><Token label="Music director" color="red" size="sm" /><Button label="Sets" size="sm" onClick={() => go('set')} /></HStack>} />
            <Item as="li" onClick={() => go('personal')} startContent={<Avatar name="Personal space" shape="rounded" />} label="Personal space"
              description="Only you · your own notes and practice sets"
              endContent={<HStack gap={2} vAlign="center"><Token label="Private" size="sm" icon={<Icon icon={LockClosedIcon} />} /><Button label="Sets" size="sm" onClick={() => go('set')} /></HStack>} />
          </List>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={340} hasDivider padding={4} label="Create a band">
          <VStack gap={3}>
            <Heading level={2}>Create a band</Heading>
            <TextInput label="Band name" value={name} onChange={setName} placeholder="For example, Sunday Morning Team" />
            <Text type="supporting">You will be its music director and can invite musicians.</Text>
            <HStack><Button label="Create band" variant="primary" icon={<Icon icon={PlusIcon} />} isDisabled={!name} /></HStack>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}

type Member = {name: string; role: string; instruments: string[]; you?: boolean} & Record<string, unknown>;

function BandScreen({go}: {go: (s: Screen) => void}) {
  const [tab, setTab] = useState('members');
  const [email, setEmail] = useState('');
  const [band, setBand] = useState('LifeStone Church');
  const [pending, setPending] = useState(['musician.one@example.com', 'musician.two@example.com']);
  const members: Member[] = [{name: 'Carlos Zaragoza', role: 'Music director', instruments: ['Keys'], you: true}];
  return (
    <Layout
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('bands')}>Bands</BreadcrumbItem><BreadcrumbItem isCurrent>{band}</BreadcrumbItem></Breadcrumbs>}
        title={band}
        meta={<Text color="secondary">You are the music director of this band.</Text>}
        actions={<Button label="Sets" variant="primary" icon={<Icon icon={QueueListIcon} />} onClick={() => go('set')} />} />}
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <TabList value={tab} onChange={setTab} hasDivider>
              <Tab value="members" label="Members" />
              <Tab value="invites" label={`Invitations (${pending.length})`} />
              <Tab value="settings" label="Settings" />
            </TabList>
            {tab === 'members' && (
              <Table<Member>
                data={members}
                idKey="name"
                columns={[
                  {key: 'name', header: 'Musician', renderCell: r => <HStack gap={2} vAlign="center"><Avatar name={r.name} size="sm" /><Text weight="semibold">{r.name}{r.you ? ' (you)' : ''}</Text></HStack>},
                  {key: 'role', header: 'Role', renderCell: r => <Token label={r.role} color={r.role === 'Music director' ? 'red' : 'default'} size="sm" />},
                  {key: 'instruments', header: 'Default instruments', renderCell: r => <HStack gap={1}>{r.instruments.map(i => <Token key={i} label={i} size="sm" />)}</HStack>},
                  {key: 'actions', header: '', align: 'end', renderCell: () => <Button label="Edit instruments" size="sm" variant="ghost" icon={<Icon icon={PencilSquareIcon} />} />},
                ]}
              />
            )}
            {tab === 'invites' && (
              <VStack gap={5}>
                <Card>
                  <VStack gap={3}>
                    <Heading level={2}>Invite a musician</Heading>
                    <TextInput type="email" label="Their email" value={email} onChange={setEmail} description="They will see the invitation when they sign in with this email." />
                    <HStack><Button label="Send invitation" variant="primary" icon={<Icon icon={EnvelopeIcon} />} isDisabled={!email} onClick={() => { setPending([email, ...pending]); setEmail(''); }} /></HStack>
                  </VStack>
                </Card>
                <List hasDividers header={<Heading level={2}>Pending invitations</Heading>}>
                  {pending.map(p => (
                    <Item key={p} as="li" startContent={<Avatar name={p} size="sm" />} label={p} description="Invited today · waiting for them to sign in"
                      endContent={<Button label="Cancel" size="sm" variant="ghost" onClick={() => setPending(pending.filter(x => x !== p))} />} />
                  ))}
                </List>
              </VStack>
            )}
            {tab === 'settings' && (
              <Card maxWidth={640}>
                <VStack gap={3}>
                  <Heading level={2}>Band name</Heading>
                  <TextInput label="Band name" isLabelHidden value={band} onChange={setBand} />
                  <HStack><Button label="Save name" variant="primary" /></HStack>
                </VStack>
              </Card>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function previewFrom(text: string) {
  const out: {name: string; rows: Bar[][]}[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('##')) { out.push({name: line.replace(/^#+\s*/, ''), rows: []}); continue; }
    if (!line || line.startsWith('>') || line.startsWith('---') || /^[a-z]+:/i.test(line) || line.startsWith('@')) continue;
    if (!out.length) out.push({name: 'Untitled', rows: []});
    const bars = line.replace(/\{[^}]*\}|"[^"]*"/g, '').split('|').map(b => b.trim()).filter(Boolean).map(b => ({chords: b.split(/\s+/)}));
    if (bars.length) out[out.length - 1].rows.push(bars);
  }
  return out;
}

function NewVersionScreen({go}: {go: (s: Screen) => void}) {
  const [title, setTitle] = useState('');
  const [artists, setArtists] = useState('');
  const [arranger, setArranger] = useState('Carlos Zaragoza');
  const [source, setSource] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');
  const [yt, setYt] = useState('');
  const [chart, setChart] = useState('## Verse\n1 | 4 | 6m | 5\n\n## Chorus\n4 | 1 | 5 | 1');
  const sections = previewFrom(chart);
  const ready = title && source;
  return (
    <Layout
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('catalog')}>Catalog</BreadcrumbItem><BreadcrumbItem isCurrent>New version</BreadcrumbItem></Breadcrumbs>}
        title={title || 'New version'}
        actions={<>
          <Button label="Choose another song" variant="ghost" onClick={() => go('catalog')} />
          <Button label="Publish version" variant="primary" isDisabled={!ready} tooltip={ready ? undefined : 'Add a title and a source first'} />
        </>} />}
      start={
        <LayoutPanel width={400} hasDivider padding={5} label="Song details">
          <VStack gap={5}>
            <FormLayout>
              <TextInput label="Song title" value={title} onChange={setTitle} isRequired />
              <TextInput label="Artists" value={artists} onChange={setArtists} description="Separate several artists with commas." />
              <TextInput label="Arrangement by" value={arranger} onChange={setArranger} />
              <RadioList label="Source" description="Which recording this chart follows." value={source} onChange={setSource} isRequired>
                <RadioListItem value="studio" label="Studio recording" />
                <RadioListItem value="live" label="Live" />
                <RadioListItem value="acoustic" label="Acoustic" />
                <RadioListItem value="own" label="Own arrangement" />
              </RadioList>
              <TextInput label="Album" value={album} onChange={setAlbum} isOptional />
              <TextInput label="Year" value={year} onChange={setYear} isOptional />
              <TextInput label="YouTube link" value={yt} onChange={setYt} isOptional />
            </FormLayout>
            <Banner status="info" title="Public versions are shared under CC0" description="Anyone may use them, and they stay with the community even if you delete your account." collapsible={false} />
          </VStack>
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={5} label="Chart">
          <VStack gap={5}>
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center"><Heading level={2}>Chart</Heading><HStack gap={1} vAlign="center"><StatusDot variant="success" label="No warnings" /><Text type="supporting">ChartDown 0.4 · no warnings</Text></HStack></HStack>
              <TextArea label="Chart (ChartDown)" isLabelHidden value={chart} onChange={setChart} rows={10} />
            </VStack>
            <VStack gap={3}>
              <Heading level={3}>Preview</Heading>
              {sections.map((sec, i) => (
                <VStack key={i} gap={2}>
                  <HStack gap={2} vAlign="end"><Text weight="semibold">{sec.name}</Text><Text type="supporting">{sec.rows.reduce((a, r) => a + r.length, 0)} bars</Text></HStack>
                  {sec.rows.map((row, j) => <BarRow key={j} bars={row} />)}
                </VStack>
              ))}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}


type MySet = {name: string; date?: string; time?: string; type: string};
const typeLabel: Record<string, string> = {practice: 'Practice', rehearsal: 'Rehearsal', service: 'Service', concert: 'Concert'};

function fmtDate(d?: string, t?: string) {
  if (!d) return 'No date';
  const dt = new Date(d + 'T' + (t || '12:00'));
  const day = dt.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
  return t ? `${day} · ${dt.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}` : day;
}

function PersonalScreen({go}: {go: (s: Screen) => void}) {
  const [tab, setTab] = useState('upcoming');
  const [name, setName] = useState('');
  const [date, setDate] = useState<string | undefined>();
  const [time, setTime] = useState<string | undefined>();
  const [type, setType] = useState('');
  const [sets, setSets] = useState<MySet[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sets.filter(x => !x.date || x.date >= today);
  const past = sets.filter(x => x.date && x.date < today);
  const shown = tab === 'upcoming' ? upcoming : past;
  const canCreate = name.trim() && type;
  const create = () => {
    setSets([...sets, {name: name.trim(), date, time, type}]);
    setName(''); setDate(undefined); setTime(undefined); setType(''); setTab('upcoming');
  };
  return (
    <Layout
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('bands')}>Bands</BreadcrumbItem><BreadcrumbItem isCurrent>Personal space</BreadcrumbItem></Breadcrumbs>}
        title="My sets"
        meta={<HStack gap={2} vAlign="center"><Token label="Only you" size="sm" icon={<Icon icon={LockClosedIcon} />} /><Text color="secondary">Practice sets and your own MD notes. Nobody else can see them.</Text></HStack>} />}
      content={
        <LayoutContent padding={6}>
          <VStack gap={4}>
            <TabList value={tab} onChange={setTab} hasDivider>
              <Tab value="upcoming" label={`Upcoming (${upcoming.length})`} />
              <Tab value="past" label={`Past (${past.length})`} />
            </TabList>
            {shown.length === 0 ? (
              <EmptyState
                icon={<Icon icon={CalendarDaysIcon} size="lg" color="secondary" />}
                title={tab === 'upcoming' ? 'No upcoming sets' : 'No past sets'}
                description={tab === 'upcoming'
                  ? 'Create a set to practice songs in your own keys, with your own notes. It works offline too.'
                  : 'Sets move here after their date passes.'}
              />
            ) : (
              <List hasDividers>
                {shown.map((x, i) => (
                  <Item key={i} as="li" onClick={() => go('set')}
                    startContent={<Avatar name={x.name} shape="rounded" />}
                    label={x.name}
                    description={`${fmtDate(x.date, x.time)} · 0 songs`}
                    endContent={<HStack gap={2} vAlign="center"><Token label={typeLabel[x.type]} size="sm" /><Button label="Add songs" size="sm" icon={<Icon icon={PlusIcon} />} onClick={() => go('catalog')} /></HStack>} />
                ))}
              </List>
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={360} hasDivider padding={5} label="Create a set">
          <VStack gap={4}>
            <Heading level={2}>Create a set</Heading>
            <FormLayout>
              <TextInput label="Set name" value={name} onChange={setName} placeholder="For example, Sunday 26" isRequired />
              <DateInput label="Date" value={date} onChange={setDate} isOptional />
              <TimeInput label="Time" value={time} onChange={setTime} isOptional />
              <Selector label="Type" value={type} onChange={setType} placeholder="Choose a type"
                options={[
                  {value: 'practice', label: 'Practice', description: 'Just you, at home'},
                  {value: 'rehearsal', label: 'Rehearsal'},
                  {value: 'service', label: 'Service'},
                  {value: 'concert', label: 'Concert'},
                ]} />
            </FormLayout>
            <Text type="supporting">Set names must be unique in your personal space. Without a date, the set stays in Upcoming.</Text>
            <HStack><Button label="Create set" variant="primary" icon={<Icon icon={PlusIcon} />} isDisabled={!canCreate} tooltip={canCreate ? undefined : 'Add a name and a type first'} onClick={create} /></HStack>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}


function AdminScreen({go}: {go: (s: Screen) => void}) {
  const areas: {key: Screen; title: string; description: string; stat: string; icon: typeof KeyIcon; status?: 'warning'}[] = [
    {key: 'instruments', title: 'Instruments', description: 'The catalog musicians choose from and charts use.', stat: '9 active', icon: MusicalNoteIcon},
    {key: 'invites', title: 'Invite codes', description: 'Create and revoke the codes people need to join the beta.', stat: '1 active code', icon: KeyIcon},
    {key: 'reports', title: 'Reports', description: 'Public versions people reported, and the versions you hid.', stat: '1 open report', icon: FlagIcon, status: 'warning'},
  ];
  return (
    <Layout
      contentWidth={960}
      header={<PageHeader over="Administration" title="Overview" meta={<Text color="secondary">Keep the beta healthy: instruments, access and reported content.</Text>} />}
      content={
        <LayoutContent padding={6}>
          <Grid columns={{minWidth: 260}} gap={4}>
            {areas.map(a => (
              <Card key={a.key}>
                <VStack gap={3}>
                  <HStack hAlign="between" vAlign="center">
                    <Icon icon={a.icon} size="lg" color="secondary" />
                    <HStack gap={1} vAlign="center">
                      {a.status && <StatusDot variant="warning" label="Needs attention" />}
                      <Text type="supporting">{a.stat}</Text>
                    </HStack>
                  </HStack>
                  <VStack gap={1}>
                    <Heading level={2}>{a.title}</Heading>
                    <Text color="secondary">{a.description}</Text>
                  </VStack>
                  <HStack><Button label={`Open ${a.title.toLowerCase()}`} endContent={<Icon icon={ArrowRightIcon} />} onClick={() => go(a.key)} /></HStack>
                </VStack>
              </Card>
            ))}
          </Grid>
        </LayoutContent>
      }
    />
  );
}

type Inst = {id: string; en: string; es: string; aliases: string[]; active: boolean; used: number; icon?: typeof KeyIcon} & Record<string, unknown>;

function InstrumentsScreen({go}: {go: (s: Screen) => void}) {
  const [items, setItems] = useState<Inst[]>([
    {id: 'bass', en: 'Bass', es: 'Bajo', aliases: ['bass'], active: true, used: 4, icon: BassIcon},
    {id: 'drums', en: 'Drums', es: 'Batería', aliases: ['drums', 'drum', 'perc'], active: true, used: 6, icon: DrumsIcon},
    {id: 'guitar', en: 'Guitar', es: 'Guitarra', aliases: ['gtr', 'guitar', 'eg', 'ag'], active: true, used: 7, icon: GuitarIcon},
    {id: 'keys', en: 'Keys', es: 'Teclados', aliases: ['keys', 'piano', 'pad', 'synth'], active: true, used: 9, icon: KeysIcon},
    {id: 'vocals', en: 'Vocals', es: 'Voces', aliases: ['vox', 'vocals', 'lead', 'bgv'], active: true, used: 8, icon: VocalsIcon},
    {id: 'saxophone', en: 'Saxophone', es: 'Saxofón', aliases: ['sax', 'saxophone'], active: true, used: 1, icon: SaxIcon},
    {id: 'trumpet', en: 'Trumpet', es: 'Trompeta', aliases: ['tpt', 'trumpet'], active: true, used: 0, icon: TrumpetIcon},
    {id: 'trombone', en: 'Trombone', es: 'Trombón', aliases: ['tbn', 'trombone'], active: true, used: 0, icon: TromboneIcon},
    {id: 'violin', en: 'Violin', es: 'Violín', aliases: ['vln', 'violin'], active: true, used: 0, icon: ViolinIcon},
  ]);
  const [editing, setEditing] = useState<string | null>(null);
  const empty = {id: '', en: '', es: '', aliases: ''};
  const [form, setForm] = useState(empty);
  const startEdit = (r: Inst) => { setEditing(r.id); setForm({id: r.id, en: r.en, es: r.es, aliases: r.aliases.join(', ')}); };
  const reset = () => { setEditing(null); setForm(empty); };
  const idOk = /^[a-z0-9-]+$/.test(form.id);
  const save = () => {
    const aliases = form.aliases.split(',').map(a => a.trim()).filter(Boolean);
    if (editing) setItems(items.map(i => i.id === editing ? {...i, en: form.en, es: form.es, aliases} : i));
    else setItems([...items, {id: form.id, en: form.en, es: form.es, aliases, active: true, used: 0}]);
    reset();
  };
  const toggle = (id: string) => setItems(items.map(i => i.id === id ? {...i, active: !i.active} : i));
  const active = items.filter(i => i.active).length;
  return (
    <Layout
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('admin')}>Administration</BreadcrumbItem><BreadcrumbItem isCurrent>Instruments</BreadcrumbItem></Breadcrumbs>}
        title="Instruments"
        meta={<Text color="secondary">{active} active of {items.length}. Instruments in use can be deactivated, never deleted.</Text>}
        actions={<Button label="Add instrument" variant="primary" icon={<Icon icon={PlusIcon} />} onClick={reset} />} />}
      content={
        <LayoutContent padding={0}>
          <Table<Inst>
            data={items}
            idKey="id"
            hasHover
            columns={[
              {key: 'en', header: 'Instrument', width: 160, renderCell: r => <HStack gap={2} vAlign="center">{r.icon ? <Icon icon={r.icon} color="error" /> : <Icon icon={MusicalNoteIcon} color="secondary" />}<VStack gap={0}><Text weight="semibold" textWrap="nowrap">{r.en}</Text><Text type="supporting" textWrap="nowrap">{r.es}</Text></VStack></HStack>},
              {key: 'id', header: 'Id in charts', width: 110, renderCell: r => <Text type="code" textWrap="nowrap">{r.id}</Text>},
              {key: 'aliases', header: 'Also written as', renderCell: r => <Text type="code" color="secondary">{r.aliases.join(', ')}</Text>},
              {key: 'active', header: 'Status', width: 130, renderCell: r => <VStack gap={0}><HStack gap={1} vAlign="center"><StatusDot variant={r.active ? 'success' : 'neutral'} label={r.active ? 'Active' : 'Inactive'} /><Text>{r.active ? 'Active' : 'Inactive'}</Text></HStack><Text type="supporting" textWrap="nowrap">{r.used} {r.used === 1 ? 'musician' : 'musicians'}</Text></VStack>},
              {key: 'actions', header: '', align: 'end', width: 96, renderCell: r => <HStack gap={1} hAlign="end">
                <Button label={`Edit ${r.en}`} tooltip="Edit" isIconOnly size="sm" variant="ghost" icon={<Icon icon={PencilSquareIcon} />} onClick={() => startEdit(r)} />
                <Button label={r.active ? `Deactivate ${r.en}` : `Activate ${r.en}`} tooltip={r.active ? 'Deactivate' : 'Activate'} isIconOnly size="sm" variant="ghost" icon={<Icon icon={r.active ? NoSymbolIcon : CheckCircleIcon} />} onClick={() => toggle(r.id)} />
              </HStack>},
            ]}
          />
        </LayoutContent>
      }
      end={
        <LayoutPanel width={320} hasDivider padding={5} label={editing ? 'Edit instrument' : 'Add an instrument'}>
          <VStack gap={4}>
            <Heading level={2}>{editing ? `Edit ${form.en || editing}` : 'Add an instrument'}</Heading>
            <FormLayout>
              <TextInput label="Id in charts" value={form.id} onChange={v => setForm({...form, id: v.toLowerCase()})} isDisabled={!!editing}
                description={editing ? 'The id cannot change once charts use it.' : 'Lowercase letters, digits and dashes, as a chart writes it (for example steel-guitar). It cannot change later.'} isRequired />
              <TextInput label="Name in English" value={form.en} onChange={v => setForm({...form, en: v})} isRequired />
              <TextInput label="Name in Spanish" value={form.es} onChange={v => setForm({...form, es: v})} isRequired />
              <TextInput label="Also written as" value={form.aliases} onChange={v => setForm({...form, aliases: v})} description="Other names charts can use, separated by commas." isOptional />
            </FormLayout>
            <HStack gap={2}>
              <Button label={editing ? 'Save changes' : 'Add instrument'} variant="primary" isDisabled={!(idOk && form.en && form.es)} onClick={save} />
              {editing && <Button label="Cancel" variant="ghost" onClick={reset} />}
            </HStack>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}

type Report = {id: string; title: string; source: string; owner: string; reason: string; by: string; date: string; detail: string} & Record<string, unknown>;

function ReportsScreen({go}: {go: (s: Screen) => void}) {
  const [tab, setTab] = useState('open');
  const [open, setOpen] = useState<Report[]>([
    {id: 'r1', title: 'Wide River', source: 'Studio', owner: 'Maya Cruz', reason: 'Full lyrics', by: 'Sam Ortiz', date: 'Oct 6, 2026', detail: 'Every section has long lyric lines, not short landmarks.'},
  ]);
  const [hidden, setHidden] = useState<Report[]>([]);
  const hide = (r: Report) => { setOpen(open.filter(x => x.id !== r.id)); setHidden([{...r, date: 'Today'}, ...hidden]); };
  const dismiss = (r: Report) => setOpen(open.filter(x => x.id !== r.id));
  const unhide = (r: Report) => setHidden(hidden.filter(x => x.id !== r.id));
  const versionCell = (r: Report) => <VStack gap={0}><Text weight="semibold">{r.title}</Text><Text type="supporting">{r.source} · by {r.owner}</Text></VStack>;
  return (
    <Layout
      contentWidth={1040}
      header={<PageHeader
        over={<Breadcrumbs variant="supporting"><BreadcrumbItem onClick={() => go('admin')}>Administration</BreadcrumbItem><BreadcrumbItem isCurrent>Reports</BreadcrumbItem></Breadcrumbs>}
        title="Reports"
        meta={<Text color="secondary">Public versions people reported. Hiding a version removes it from the catalog and tells its owner.</Text>} />}
      content={
        <LayoutContent padding={6}>
          <VStack gap={4}>
            <TabList value={tab} onChange={setTab} hasDivider>
              <Tab value="open" label={`Open reports (${open.length})`} />
              <Tab value="hidden" label={`Hidden versions (${hidden.length})`} />
            </TabList>
            {tab === 'open' && (open.length === 0
              ? <EmptyState icon={<Icon icon={FlagIcon} size="lg" color="secondary" />} title="No open reports" description="When someone reports a public version, it shows up here." />
              : <List hasDividers>
                  {open.map(r => (
                    <Item key={r.id} as="li" align="start"
                      startContent={<Icon icon={FlagIcon} color="warning" />}
                      label={<HStack gap={2} vAlign="center"><Text weight="semibold">{r.title}</Text><Text type="supporting">{r.source} · by {r.owner}</Text></HStack>}
                      description={<VStack gap={1}><HStack gap={2} vAlign="center"><Token label={r.reason} color="orange" size="sm" /><Text type="supporting">Reported by {r.by} · {r.date}</Text></HStack><Text color="secondary">“{r.detail}”</Text></VStack>}
                      endContent={<HStack gap={2}>
                        <Button label="View" size="sm" variant="ghost" onClick={() => go('stand')} />
                        <Button label="Dismiss" size="sm" onClick={() => dismiss(r)} />
                        <Button label="Hide version" size="sm" variant="destructive" icon={<Icon icon={EyeSlashIcon} />} onClick={() => hide(r)} />
                      </HStack>} />
                  ))}
                </List>)}
            {tab === 'hidden' && (hidden.length === 0
              ? <EmptyState icon={<Icon icon={EyeSlashIcon} size="lg" color="secondary" />} title="No hidden versions" description="Versions you hide stay out of the catalog until you show them again." />
              : <Table<Report> data={hidden} idKey="id" columns={[
                  {key: 'title', header: 'Version', renderCell: versionCell},
                  {key: 'reason', header: 'Reason', renderCell: r => <Token label={r.reason} size="sm" />},
                  {key: 'date', header: 'Hidden'},
                  {key: 'actions', header: '', align: 'end', renderCell: r => <Button label="Show again" size="sm" onClick={() => unhide(r)} />},
                ]} />)}
          </VStack>
        </LayoutContent>
      }
    />
  );
}


type Notice = {id: number; title: string; detail: string; when: string; unread: boolean; to: Screen};

function NoticesScreen({go, notices, setNotices}: {go: (s: Screen) => void; notices: Notice[]; setNotices: (n: Notice[]) => void}) {
  const unread = notices.filter(n => n.unread).length;
  return (
    <Layout
      contentWidth={760}
      header={<PageHeader over="LifeStone Church" title="Notices"
        meta={<Text color="secondary">What changed in your bands and sets.</Text>}
        actions={<Button label="Mark all as read" icon={<Icon icon={CheckIcon} />} isDisabled={unread === 0} onClick={() => setNotices(notices.map(n => ({...n, unread: false})))} />} />}
      content={
        <LayoutContent padding={4}>
          {notices.length === 0
            ? <EmptyState icon={<Icon icon={BellIcon} size="lg" color="secondary" />} title="You're all caught up" description="We'll let you know when you're added to a set or a song changes." />
            : <List hasDividers>
                {notices.map(n => (
                  <Item key={n.id} as="li" align="start"
                    onClick={() => { setNotices(notices.map(x => x.id === n.id ? {...x, unread: false} : x)); go(n.to); }}
                    startContent={n.unread ? <StatusDot variant="accent" label="Unread" /> : <StatusDot variant="neutral" label="Read" />}
                    label={<Text weight={n.unread ? 'semibold' : 'normal'}>{n.title}</Text>}
                    description={n.detail}
                    endContent={<Text type="supporting" textWrap="nowrap">{n.when}</Text>} />
                ))}
              </List>}
        </LayoutContent>
      }
    />
  );
}


function ProfileScreen({lang, setLang}: {lang: string; setLang: (v: string) => void}) {
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('Carlos Zaragoza');
  const [inst, setInst] = useState<string[]>(['keys']);
  const [saved, setSaved] = useState(true);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({added: true, removed: true, tempmd: true, key: true, order: true, note: true, revision: true, hidden: true});
  const [confirm, setConfirm] = useState('');
  const email = 'carlos@example.com';
  const pref = (k: string, label: string, description?: string) => (
    <Switch key={k} label={label} description={description} value={prefs[k]} onChange={v => setPrefs({...prefs, [k]: v})} />
  );
  const instItem = (value: string, label: string, icon: typeof KeyIcon) => (
    <CheckboxListItem key={value} value={value} label={<HStack gap={2} vAlign="center"><Icon icon={icon} color="error" />{label}</HStack>} />
  );
  const onInst = (group: string[]) => (v: string[]) => { setInst([...inst.filter(i => !group.includes(i)), ...v]); setSaved(false); };
  const groups: {label: string; items: [string, string, typeof KeyIcon][]}[] = [
    {label: 'Rhythm', items: [['drums', 'Drums', DrumsIcon], ['bass', 'Bass', BassIcon]]},
    {label: 'Harmony', items: [['keys', 'Keys', KeysIcon], ['guitar', 'Guitar', GuitarIcon], ['violin', 'Violin', ViolinIcon]]},
    {label: 'Voice and horns', items: [['vocals', 'Vocals', VocalsIcon], ['saxophone', 'Saxophone', SaxIcon], ['trumpet', 'Trumpet', TrumpetIcon], ['trombone', 'Trombone', TromboneIcon]]},
  ];
  return (
    <Layout
      contentWidth={760}
      header={<LayoutHeader hasDivider>
        <HStack gap={4} vAlign="center" paddingInline={6} paddingBlock={4}>
          <Avatar name={name} size="lg" />
          <VStack gap={0}>
            <Heading level={1}>{name}</Heading>
            <Text color="secondary">{email} · Admin · {inst.length} {inst.length === 1 ? 'instrument' : 'instruments'}</Text>
          </VStack>
        </HStack>
      </LayoutHeader>}
      content={
        <LayoutContent padding={6}>
          <VStack gap={5}>
            <TabList value={tab} onChange={setTab} hasDivider>
              <Tab value="profile" label="Profile" />
              <Tab value="notices" label="Notices" />
              <Tab value="account" label="Account" />
            </TabList>

            {tab === 'profile' && (
              <VStack gap={6}>
                <FormLayout>
                  <TextInput label="Name" value={name} onChange={v => { setName(v); setSaved(false); }} description="Shown to your bands and on the versions you publish." />
                  <VStack gap={1}>
                    <Text weight="semibold">Language</Text>
                    <HStack><SegmentedControl label="Language" value={lang} onChange={setLang}>
                      <SegmentedControlItem value="en" label="English" />
                      <SegmentedControlItem value="es" label="Español" />
                    </SegmentedControl></HStack>
                    <Text type="supporting">Changes the app right away. Chart syntax never changes.</Text>
                  </VStack>
                </FormLayout>
                <VStack gap={3}>
                  <VStack gap={1}>
                    <Heading level={2}>Instruments you play</Heading>
                    <Text color="secondary">Bands use these as your default instruments. Your MD notes follow them.</Text>
                  </VStack>
                  <Grid columns={{minWidth: 200}} gap={4}>
                    {groups.map(g => (
                      <Card key={g.label} padding={4}>
                        <CheckboxList label={g.label} value={inst.filter(i => g.items.some(([v]) => v === i))} onChange={onInst(g.items.map(([v]) => v))}>
                          {g.items.map(([v, l, ic]) => instItem(v, l, ic))}
                        </CheckboxList>
                      </Card>
                    ))}
                  </Grid>
                </VStack>
                <HStack gap={3} vAlign="center">
                  <Button label="Save profile" variant="primary" isDisabled={saved} onClick={() => setSaved(true)} />
                  <Text type="supporting">{saved ? 'All changes saved' : 'You have unsaved changes'}</Text>
                </HStack>
              </VStack>
            )}

            {tab === 'notices' && (
              <VStack gap={6}>
                <Banner status="info" title="Notices arrive in the app" description="Email notices come in a later version." collapsible={false} />
                <VStack gap={3}><Heading level={2}>Your sets</Heading>
                  {pref('added', 'When I am added to a set')}
                  {pref('removed', 'When I am taken off a set')}
                  {pref('tempmd', 'When I am made temporary music director')}
                </VStack>
                <VStack gap={3}><Heading level={2}>Songs in your sets</Heading>
                  {pref('key', 'When a song changes key')}
                  {pref('order', 'When the order of a set changes')}
                  {pref('note', 'When there is a new note for my instruments')}
                </VStack>
                <VStack gap={3}><Heading level={2}>As music director</Heading>
                  {pref('revision', 'When a song in my band’s sets has a new revision', 'You decide whether to update the set to it.')}
                </VStack>
                <VStack gap={3}><Heading level={2}>Your versions</Heading>
                  {pref('hidden', 'When administrators hide one of my versions')}
                </VStack>
                <Text type="supporting">Changes to notices are saved as you switch them.</Text>
              </VStack>
            )}

            {tab === 'account' && (
              <VStack gap={6}>
                <VStack gap={2}>
                  <Heading level={2}>How you sign in</Heading>
                  <List hasDividers>
                    <Item as="li" label="Google" description={email} endContent={<HStack gap={1} vAlign="center"><StatusDot variant="success" label="Connected" /><Text type="supporting">Connected</Text></HStack>} />
                    <Item as="li" label="Email and password" description="Not set up" endContent={<Button label="Add password" size="sm" />} />
                  </List>
                </VStack>
                <Card padding={5}>
                  <VStack gap={3}>
                    <HStack gap={2} vAlign="center"><Icon icon={ExclamationTriangleIcon} color="error" /><Heading level={2}>Delete your account</Heading></HStack>
                    <Text>This deletes your account, profile, personal space and private versions, for good.</Text>
                    <List density="compact" listStyle="disc">
                      <Item as="li" label="Your public versions stay with the community, credited to “ChartDown”." />
                      <Item as="li" label="In bands you lead, the longest-standing member becomes music director." />
                    </List>
                    <TextInput label="Type your email to confirm" value={confirm} onChange={setConfirm} placeholder={email} />
                    <HStack><Button label="Delete my account" variant="destructive" isDisabled={confirm !== email} tooltip={confirm !== email ? 'Type your email exactly to confirm' : undefined} /></HStack>
                  </VStack>
                </Card>
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}


type Usage = {title: string; source: string; d7: [number, number]; d30: [number, number]; all: [number, number]} & Record<string, unknown>;

function HomeScreen({go, notices}: {go: (s: Screen) => void; notices: Notice[]}) {
  const [role, setRole] = useState<'md' | 'musician' | 'new'>('md');
  const [period, setPeriod] = useState<'d7' | 'd30' | 'all'>('d30');
  const [steps, setSteps] = useState({instruments: false, band: false, version: false, set: false});
  const usage: Usage[] = [
    {title: 'Open Road', source: 'Live 2025', d7: [3, 9], d30: [7, 21], all: [12, 38]},
    {title: 'Lantern Bay', source: 'Own arrangement', d7: [1, 4], d30: [2, 6], all: [4, 11]},
    {title: 'Steady Ground', source: 'Acoustic', d7: [0, 0], d30: [1, 3], all: [3, 8]},
  ];
  const totalBands = usage.reduce((a, u) => a + u[period][0], 0);
  const totalMusicians = usage.reduce((a, u) => a + u[period][1], 0);
  const max = Math.max(...usage.map(u => u[period][1]), 1);
  const periodLabel = {d7: 'last 7 days', d30: 'last 30 days', all: 'all time'}[period];
  const people = [
    {name: 'Carlos Zaragoza', role: 'Music director · Keys'}, {name: 'Sam Ortiz', role: 'Drums'}, {name: 'Jordan Lee', role: 'Bass'},
    {name: 'Maya Cruz', role: 'Guitar'}, {name: 'Chris Vega', role: 'Vocals'},
  ];
  const isMD = role === 'md';
  const isNew = role === 'new';
  const me = isMD ? {name: 'Carlos', line: 'Music director of LifeStone Church · Keys', inst: 'Keys', icon: KeysIcon}
    : {name: 'Sam', line: 'Drums in LifeStone Church', inst: 'Drums', icon: DrumsIcon};
  const stat = (label: string, value: string, hint: string, to: Screen) => (
    <Card key={label} padding={4}>
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Heading level={2} type="display-3">{value}</Heading>
        <HStack hAlign="between" vAlign="center"><Text type="supporting">{hint}</Text><Button label={`Open ${label.toLowerCase()}`} isIconOnly size="sm" variant="ghost" icon={<Icon icon={ArrowRightIcon} />} onClick={() => go(to)} /></HStack>
      </VStack>
    </Card>
  );
  const done = Object.values(steps).filter(Boolean).length;
  const step = (key: keyof typeof steps, title: string, description: string, action: string, to: Screen) => (
    <Item key={key} as="li"
      startContent={steps[key] ? <Icon icon={CheckCircleIcon} color="success" /> : <Text type="large" color="secondary" hasTabularNumbers>{Object.keys(steps).indexOf(key) + 1}</Text>}
      label={<Text weight="semibold">{title}</Text>} description={description}
      endContent={steps[key] ? <Text type="supporting">Done</Text> : <Button label={action} size="sm" onClick={() => { setSteps({...steps, [key]: true}); }} />} />
  );
  const previewSwitch = (
    <Banner status="info" collapsible={false} title="Prototype preview"
      description="See Home as each kind of user."
      endContent={
        <SegmentedControl label="Preview Home as" value={role} onChange={v => setRole(v as 'md' | 'musician' | 'new')} size="sm">
          <SegmentedControlItem value="md" label="Music director" />
          <SegmentedControlItem value="musician" label="Musician" />
          <SegmentedControlItem value="new" label="New user" />
        </SegmentedControl>} />
  );

  if (isNew) {
    return (
      <Layout
        header={<PageHeader over="Sunday, October 11" title="Welcome to ChartDown, Alex" meta={<Text color="secondary">Four steps and your band can play from the same charts.</Text>} />}
        content={
          <LayoutContent padding={6}>
            <VStack gap={6}>
              {previewSwitch}
              <Card padding={0}>
                <Section padding={4} paddingBlockEnd={2}>
                  <HStack hAlign="between" vAlign="center"><Heading level={2}>Get started</Heading><Text type="supporting">{done} of 4 done</Text></HStack>
                </Section>
                <List hasDividers>
                  {step('instruments', 'Choose your instruments', 'So your music director\u2019s notes reach you.', 'Choose', 'profile')}
                  {step('band', 'Join or create a band', 'Accept an invitation from your MD, or start your own band.', 'Go to bands', 'bands')}
                  {step('version', 'Publish your first version', 'Write a chart in ChartDown or start from the catalog.', 'New version', 'newversion')}
                  {step('set', 'Create your first set', 'Practice on your own in your personal space.', 'Create set', 'personal')}
                </List>
              </Card>
              <EmptyState icon={<Icon icon={CalendarDaysIcon} size="lg" color="secondary" />} title="No upcoming sets"
                description="When your music director adds you to a set, it shows up here." />
            </VStack>
          </LayoutContent>
        }
        end={
          <LayoutPanel width={340} hasDivider padding={5} label="Help">
            <VStack gap={5}>
              <VStack gap={2}>
                <Heading level={2}>Joining a band?</Heading>
                <Text color="secondary">Ask your music director to invite this email. The invitation appears in Notices.</Text>
              </VStack>
              <VStack gap={2}>
                <Heading level={2}>New to number charts?</Heading>
                <Text color="secondary">Try the playground and the quick guide to ChartDown.</Text>
                <HStack><Button label="Open the guide" size="sm" icon={<Icon icon={BookOpenIcon} />} /></HStack>
              </VStack>
            </VStack>
          </LayoutPanel>
        }
      />
    );
  }

  return (
    <Layout
      header={<PageHeader over="Sunday, October 11" title={`Good evening, ${me.name}`}
        meta={<Text color="secondary">{me.line}</Text>}
        actions={<>
          <Button label="Create set" icon={<Icon icon={PlusIcon} />} onClick={() => go('personal')} />
          <Button label="New version" variant="primary" icon={<Icon icon={MusicalNoteIcon} />} onClick={() => go('newversion')} />
        </>} />}
      content={
        <LayoutContent padding={6}>
          <VStack gap={6}>
            {previewSwitch}
            <Card padding={5}>
              <VStack gap={4}>
                <HStack hAlign="between" vAlign="start">
                  <VStack gap={1}>
                    <Text type="supporting">Next up · tomorrow</Text>
                    <Heading level={2}>Sunday 12 – Service</Heading>
                    <Text color="secondary">LifeStone Church · Sunday, October 12 at 9:00 AM · 6 songs · you play {me.inst}</Text>
                  </VStack>
                  <HStack gap={1} vAlign="center"><StatusDot variant="success" label="Downloaded for offline" /><Text type="supporting">Offline ready</Text></HStack>
                </HStack>
                <HStack gap={2} vAlign="center" wrap="wrap">
                  <Token label={isMD ? '7 notes for you' : '4 notes for you'} color="red" size="sm" />
                  <Token label="Open Road in A" size="sm" />
                  <Token label="Lantern Bay in Em" size="sm" />
                  <Text type="supporting">+4 more</Text>
                </HStack>
                <HStack gap={2}>
                  <Button label="Start stand mode" variant="primary" icon={<Icon icon={ArrowsPointingOutIcon} />} onClick={() => go('stand')} />
                  <Button label="Open set" onClick={() => go('set')} />
                </HStack>
              </VStack>
            </Card>

            <Grid columns={{minWidth: 140}} gap={4}>
              {stat('Bands', isMD ? '2' : '1', isMD ? 'Including Personal' : 'LifeStone Church', 'bands')}
              {stat('Upcoming sets', isMD ? '3' : '2', 'Next: tomorrow', 'set')}
              {stat('My versions', isMD ? '4' : '0', isMD ? '3 public · 1 private' : 'None yet', 'catalog')}
              {stat('Musicians', '6', 'in your band', 'band')}
            </Grid>

            {isMD ? (
              <Card padding={0}>
                <Section padding={4} paddingBlockEnd={2}>
                  <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
                    <VStack gap={0}>
                      <Heading level={2}>How your versions are used</Heading>
                      <Text type="supporting">{totalMusicians} musicians in {totalBands} {totalBands === 1 ? 'band' : 'bands'} played your public versions · {periodLabel}</Text>
                    </VStack>
                    <SegmentedControl label="Period" value={period} onChange={v => setPeriod(v as 'd7' | 'd30' | 'all')} size="sm">
                      <SegmentedControlItem value="d7" label="7 days" />
                      <SegmentedControlItem value="d30" label="30 days" />
                      <SegmentedControlItem value="all" label="All time" />
                    </SegmentedControl>
                  </HStack>
                </Section>
                <Table<Usage> data={usage} idKey="title" columns={[
                  {key: 'title', header: 'Version', renderCell: r => <VStack gap={0}><Text weight="semibold">{r.title}</Text><Text type="supporting">{r.source}</Text></VStack>},
                  {key: 'bands', header: 'Bands', width: 90, renderCell: r => <Text hasTabularNumbers>{r[period][0]}</Text>},
                  {key: 'musicians', header: 'Musicians', renderCell: r => (
                    <HStack gap={2} vAlign="center">
                      <Text hasTabularNumbers>{r[period][1]}</Text>
                      <div aria-hidden="true" style={{flex: 1, maxWidth: 'calc(var(--spacing-12) * 4)', height: 'var(--spacing-2)', background: 'var(--color-background-secondary)', borderRadius: 'var(--radius-full)'}}>
                        <div style={{width: `${(r[period][1] / max) * 100}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 'var(--radius-full)'}} />
                      </div>
                    </HStack>)},
                ]} />
              </Card>
            ) : (
              <Card padding={5}>
                <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
                  <VStack gap={1}>
                    <Heading level={2}>Share your own arrangements</Heading>
                    <Text color="secondary">Publish a version and see how many musicians play it.</Text>
                  </VStack>
                  <Button label="New version" icon={<Icon icon={MusicalNoteIcon} />} onClick={() => go('newversion')} />
                </HStack>
              </Card>
            )}

            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center"><Heading level={2}>Recent activity</Heading><Button label="All notices" variant="ghost" size="sm" onClick={() => go('notices')} /></HStack>
              <List hasDividers>
                {notices.slice(0, 3).map(n => (
                  <Item key={n.id} as="li" onClick={() => go(n.to)} startContent={<StatusDot variant={n.unread ? 'accent' : 'neutral'} label={n.unread ? 'Unread' : 'Read'} />}
                    label={n.title} description={n.detail} endContent={<Text type="supporting" textWrap="nowrap">{n.when}</Text>} />
                ))}
              </List>
            </VStack>
          </VStack>
        </LayoutContent>
      }
      end={
        <LayoutPanel width={340} hasDivider padding={5} label="For you">
          <VStack gap={6}>
            <VStack gap={2}>
              <Heading level={2}>Needs your attention</Heading>
              <List density="compact">
                {isMD ? <>
                  <Item as="li" onClick={() => go('set')} startContent={<Icon icon={ArrowPathIcon} color="secondary" />} label="2 songs have new revisions" description="Sunday 12 · review and update" />
                  <Item as="li" onClick={() => go('band')} startContent={<Icon icon={EnvelopeIcon} color="secondary" />} label="2 invitations pending" description="LifeStone Church" />
                  <Item as="li" onClick={() => go('reports')} startContent={<Icon icon={FlagIcon} color="secondary" />} label="1 open report" description="Administration" />
                </> : <>
                  <Item as="li" onClick={() => go('stand')} startContent={<Icon icon={ChatBubbleLeftRightIcon} color="secondary" />} label="4 new notes for Drums" description="Sunday 12 · read them before rehearsal" />
                  <Item as="li" onClick={() => go('notices')} startContent={<Icon icon={ArrowPathIcon} color="secondary" />} label="Key changed in Open Road" description="Now in A" />
                </>}
              </List>
            </VStack>
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center"><Heading level={2}>Your band</Heading>{isMD && <Button label="Manage" variant="ghost" size="sm" onClick={() => go('band')} />}</HStack>
              <Text type="supporting">LifeStone Church · 6 musicians</Text>
              <List density="compact">
                {people.filter(p => !(isMD && p.name === 'Carlos Zaragoza')).map(p => <Item key={p.name} as="li" startContent={<Avatar name={p.name} size="sm" />} label={!isMD && p.name === 'Sam Ortiz' ? `${p.name} (you)` : p.name} description={p.role} />)}
              </List>
            </VStack>
            <VStack gap={2}>
              <HStack hAlign="between" vAlign="center"><Heading level={2}>Your instruments</Heading><Button label="Edit" variant="ghost" size="sm" onClick={() => go('profile')} /></HStack>
              <HStack gap={2} wrap="wrap"><Token label={me.inst} color="red" icon={<Icon icon={me.icon} />} /></HStack>
              <Text type="supporting">Your MD notes follow these instruments.</Text>
            </VStack>
          </VStack>
        </LayoutPanel>
      }
    />
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lang, setLang] = useState('en');
  const [notices, setNotices] = useState<Notice[]>([
    {id: 1, title: 'You were added to Sunday 12', detail: 'LifeStone Church · Service · Sunday, October 12 at 9:00 AM · Keys', when: '2h ago', unread: true, to: 'set'},
    {id: 2, title: 'Key changed in Open Road', detail: 'Sunday 12 · from G to A', when: '3h ago', unread: true, to: 'stand'},
    {id: 3, title: 'New note for Keys in Steady Ground', detail: 'Chorus · “Pad underneath, always under the vocal.”', when: 'Yesterday', unread: false, to: 'stand'},
  ]);
  const unread = notices.filter(n => n.unread).length;
  return (
    <AppShell sideNav={<Nav screen={screen} go={setScreen} lang={lang} setLang={setLang} unread={unread} />} height="fill">
      {screen === 'home' && <HomeScreen go={setScreen} notices={notices} />}
      {screen === 'notices' && <NoticesScreen go={setScreen} notices={notices} setNotices={setNotices} />}
      {screen === 'set' && <SetScreen go={setScreen} />}
      {screen === 'stand' && <StandScreen go={setScreen} />}
      {screen === 'catalog' && <CatalogScreen go={setScreen} />}
      {screen === 'editor' && <EditorScreen />}
      {screen === 'layer' && <LayerScreen />}
      {screen === 'invites' && <InvitesScreen go={setScreen} />}
      {screen === 'bands' && <BandsScreen go={setScreen} />}
      {screen === 'band' && <BandScreen go={setScreen} />}
      {screen === 'newversion' && <NewVersionScreen go={setScreen} />}
      {screen === 'personal' && <PersonalScreen go={setScreen} />}
      {screen === 'admin' && <AdminScreen go={setScreen} />}
      {screen === 'instruments' && <InstrumentsScreen go={setScreen} />}
      {screen === 'reports' && <ReportsScreen go={setScreen} />}
      {screen === 'profile' && <ProfileScreen lang={lang} setLang={setLang} />}
    </AppShell>
  );
}
