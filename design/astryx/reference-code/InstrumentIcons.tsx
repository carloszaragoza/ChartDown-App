import type {SVGProps} from 'react';

function make(paths: JSX.Element) {
  return function InstrumentIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  };
}
const dot = {fill: 'currentColor', stroke: 'none'} as const;

export const DrumsIcon = make(<><path d="M5 9v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V9" /><ellipse cx="12" cy="9" rx="7" ry="2.5" /><path d="M9.5 7 5.5 3M14.5 7l4-4" /></>);
export const BassIcon = make(<><path d="M5 19c6-2 10-6 10-11a5 5 0 0 0-10 0c0 1.7 1.3 3 3 3" /><circle cx="19" cy="7" r="1.2" {...dot} /><circle cx="19" cy="12" r="1.2" {...dot} /></>);
export const KeysIcon = make(<><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M9 13v6M15 13v6" /><rect x="7.5" y="5" width="3" height="8" {...dot} /><rect x="13.5" y="5" width="3" height="8" {...dot} /></>);
export const GuitarIcon = make(<><circle cx="9" cy="15" r="5" /><circle cx="9" cy="15" r="1.5" /><path d="m12.5 11.5 7-7M18 3l3 3" /></>);
export const VocalsIcon = make(<><rect x="9" y="3" width="6" height="10" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>);
export const SaxIcon = make(<><path d="M18.5 3 17 4.5M17 4.5 9.5 15a3.5 3.5 0 0 0 6 3.6l1.6-2.6" /><circle cx="12.2" cy="11.3" r="1" {...dot} /><circle cx="14" cy="8.8" r="1" {...dot} /></>);
export const TrumpetIcon = make(<><path d="M3 12h12M15 12l6-3.5v7Z" /><path d="M6 12v3h7v-3M8 8.5V12M10.5 8.5V12M13 8.5V12" /></>);
export const TromboneIcon = make(<path d="M7 9h11M7 15h11M18 9a3 3 0 0 1 0 6M10 9v6M7 9 2.5 6.5v5Z" />);
export const ViolinIcon = make(<><ellipse cx="9.5" cy="15" rx="4.5" ry="5.5" transform="rotate(-40 9.5 15)" /><path d="m12.5 12 7-7.5" /><circle cx="20.3" cy="3.8" r="1" /><path d="M3 5.5 17.5 21" /></>);
