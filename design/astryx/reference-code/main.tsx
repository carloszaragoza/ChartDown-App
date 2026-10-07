import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import {createRoot} from 'react-dom/client';
import {Theme} from '@astryxdesign/core';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <Theme theme={neutralTheme} mode="system"><App /></Theme>
);
