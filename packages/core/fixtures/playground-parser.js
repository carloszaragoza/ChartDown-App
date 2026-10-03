// Reference copy of the ChartDown 0.4 playground parser, used only by
// src/playground.test.ts to check that the TypeScript port matches it.
// Source: github.com/ChartDown/Language, playground/index.html at daf07f4.
// Copyright (c) 2026 ChartDown contributors. MIT License.
// Extracted verbatim (music helpers, roles and parser); `export` added at the end.
"use strict";

/* ---------- Music helpers ---------- */
const SCALE = [0,2,4,5,7,9,11];
const LET = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NUMS  = ['1','b2','2','b3','3','4','#4','5','b6','6','b7','7'];
const DYN = new Set(['pp','p','mp','mf','f','ff','cresc','decresc']);
const KEY_LIST = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

const isNum = s => /^[b#]?[1-7]$/.test(s);
function keySemi(k){
  const m = /^([A-G])([b#]?)/.exec(k || 'C');
  if(!m) return 0;
  return (LET[m[1]] + (m[2]==='#'?1:m[2]==='b'?-1:0) + 12) % 12;
}
const useFlats = k => k === 'F' || /b/.test(k || '');
function rel(str, srcKey){
  const n = /^([b#]?)([1-7])$/.exec(str);
  if(n){
    let s = SCALE[+n[2]-1];
    if(n[1]==='b') s--; else if(n[1]==='#') s++;
    return (s + 12) % 12;
  }
  const l = /^([A-G])([b#]?)$/.exec(str);
  const a = LET[l[1]] + (l[2]==='#'?1:l[2]==='b'?-1:0);
  return (((a - keySemi(srcKey)) % 12) + 12) % 12;
}
function showRoot(str, mode, srcKey, dispKey){
  if(mode === 'numbers') return isNum(str) ? str : NUMS[rel(str, srcKey)];
  if(!isNum(str) && dispKey === srcKey) return str;
  const names = useFlats(dispKey) ? FLAT : SHARP;
  return names[(keySemi(dispKey) + rel(str, srcKey)) % 12];
}

/* ---------- Roles ---------- */
const ROLE_ALIAS = {all:'all',band:'all',everyone:'all',drums:'drums',drum:'drums',perc:'drums',
  bass:'bass',keys:'keys',piano:'keys',pad:'keys',synth:'keys',gtr:'gtr',guitar:'gtr',eg:'gtr',ag:'gtr',
  vox:'vox',vocals:'vox',lead:'vox',bgv:'vox',bgvs:'vox',
  sax:'sax',saxophone:'sax',tpt:'tpt',trumpet:'tpt',tbn:'tbn',trombone:'tbn',vln:'vln',violin:'vln'};
const ROLE_LABEL = {drums:'Drums',bass:'Bass',keys:'Keys',gtr:'Guitar',vox:'Vocals',sax:'Saxophone',tpt:'Trumpet',tbn:'Trombone',vln:'Violin'};
let CUSTOM = {};
const roleLabel = r => ROLE_LABEL[r] || CUSTOM[r] || (r.charAt(0).toUpperCase() + r.slice(1));
function parseRoles(s){
  const parts = s.split(/[,\/&\s]+/).filter(Boolean).map(x => x.toLowerCase());
  if(!parts.length) return null;
  const out = [];
  for(const p of parts){ const r = ROLE_ALIAS[p] || (CUSTOM[p] ? p : null); if(!r) return null; if(!out.includes(r)) out.push(r); }
  return out;
}
function parseNote(t, n, warn){
  const m = /^MD(?:\s+([^:]+?))?\s*:\s*(.*)$/i.exec(t);
  if(m){
    let roles = ['all'];
    if(m[1]){ const r = parseRoles(m[1]); if(r) roles = r; else warn(n, 'Unknown instrument \u201c' + m[1] + '\u201d in an MD note'); }
    return {md:true, roles, text:m[2]};
  }
  return {md:false, roles:['all'], text:t};
}
function parseCue(t){
  const m = /^([A-Za-z][A-Za-z,\/& ]*?)\s*:\s*(.+)$/.exec(t);
  if(m){ const r = parseRoles(m[1]); if(r) return {roles:r, text:m[2].trim()}; }
  return {roles:['all'], text:t};
}

/* ---------- Parser ---------- */
function parseToken(tok){
  if(tok === '%') return {t:'rep'};
  if(tok === '=') return {t:'tie'};
  if(tok === 'x' || tok === 'X') return {t:'nc'};
  let s = tok, push=false, hold=false, stab=false, ferm=false, beats=1, explicit=false;
  while(/[!~]$/.test(s)){ if(s.endsWith('!')) stab = true; else ferm = true; s = s.slice(0,-1); }
  const bm = s.match(/:(\d+(?:\.\d+)?)$/);
  if(bm){ beats = parseFloat(bm[1]); explicit = true; s = s.slice(0, bm.index); }
  if(s.startsWith("'")){ push = true; s = s.slice(1); }
  if(s.startsWith('<') && s.endsWith('>')){ hold = true; s = s.slice(1,-1); }
  const cm = s.match(/^([b#]?[1-7]|[A-G][b#]?)([^\/]*)(?:\/([b#]?[1-7]|[A-G][b#]?))?$/);
  if(!cm) return null;
  let q = cm[2];
  if(q === '-') q = 'm'; else if(q.startsWith('-')) q = 'm' + q.slice(1);
  return {t:'chord', root:cm[1], q, bass:cm[3]||null, beats, explicit, push, hold, stab, ferm};
}

function parseBar(seg, n, warn, bpb){
  const bar = {items:[], lyric:null, cues:[], dyn:null, ending:null};
  seg = seg.replace(/"([^"]*)"/g, (_, t) => {
    if(t.trim().split(/\s+/).filter(Boolean).length > 8) warn(n, 'Lyric landmarks should be 8 words or fewer');
    bar.lyric = bar.lyric ? bar.lyric + ' / ' + t : t; return ' ';
  });
  seg = seg.replace(/\{([^}]*)\}/g, (_, t) => {
    t = t.trim();
    if(DYN.has(t.toLowerCase())) bar.dyn = t.toLowerCase(); else if(t) bar.cues.push(parseCue(t));
    return ' ';
  });
  seg = seg.replace(/^\s*\[(\d+(?:[,-]\d+)*)\]/, (_, e) => { bar.ending = e; return ' '; });
  seg.trim().split(/\s+/).filter(Boolean).forEach(tok => {
    const it = parseToken(tok);
    if(it) bar.items.push(it); else warn(n, 'Can\u2019t read \u201c' + tok + '\u201d');
  });
  if(!bar.items.length) warn(n, 'This bar has no chords');
  const ch = bar.items.filter(i => i.t === 'chord');
  if(ch.some(i => i.explicit)){
    const sum = ch.reduce((a, i) => a + i.beats, 0);
    if(Math.abs(sum - bpb) > 0.001) warn(n, 'Beats add up to ' + sum + ', but the meter has ' + bpb);
  }
  return bar;
}

function parseRow(line, n, warn, bpb){
  let rs = false, re = false, times = 2;
  if(line.startsWith('|:')){ rs = true; line = line.slice(2); }
  else if(line.startsWith('|')) line = line.slice(1);
  const m = line.match(/:\|\s*(?:x\s*(\d+))?\s*$/);
  if(m){ re = true; if(m[1]) times = parseInt(m[1],10); line = line.slice(0, m.index); }
  else if(line.endsWith('|')) line = line.slice(0,-1);
  const bars = line.split('|').map(s => s.trim()).filter(Boolean).map(s => parseBar(s, n, warn, bpb));
  if(!bars.length) return null;
  if(rs) bars[0].rs = true;
  if(re){ bars[bars.length-1].re = true; bars[bars.length-1].times = times; }
  return {bars};
}

function parse(src){
  const doc = {meta:{}, sections:[], warnings:[]};
  const warn = (line, msg) => doc.warnings.push({line, msg});
  const lines = src.replace(/\r/g,'').split('\n');
  let i = 0;
  if(lines[0] && lines[0].trim() === '---'){
    i = 1;
    while(i < lines.length && lines[i].trim() !== '---'){
      const m = lines[i].match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if(m) doc.meta[m[1].toLowerCase()] = m[2].trim();
      else if(lines[i].trim()) warn(i+1, 'Header lines look like  name: value');
      i++;
    }
    i++;
  }
  CUSTOM = {};
  (doc.meta.instruments || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).forEach(id => {
    if(/^[a-z0-9-]+$/.test(id)) CUSTOM[id] = id.charAt(0).toUpperCase() + id.slice(1); else warn(0, 'Instrument ids use lowercase letters, digits and -: \u201c' + id + '\u201d');
  });
  const km = /^([A-G][b#]?)(m?)/.exec(doc.meta.key || 'C');
  doc.keyRoot = km ? km[1] : 'C';
  doc.minor = !!(km && km[2]);
  const mm = /^(\d+)\s*\/\s*(\d+)$/.exec(doc.meta.meter || '4/4');
  const bpb = mm ? parseInt(mm[1],10) : 4;

  let cur = null, docKey = null, pendingLabel = null;
  for(; i < lines.length; i++){
    const line = lines[i].trim(), n = i + 1;
    if(!line || line.startsWith('//')) continue;
    if(line.startsWith('##')){
      cur = {name: line.replace(/^#+\s*/,'') || 'Section', notes:[], rows:[], use:null, startKey:docKey};
      doc.sections.push(cur); continue;
    }
    if(!cur){ warn(n, 'Bars need a section first, like  ## Verse 1'); continue; }
    if(line.startsWith('>')){ cur.notes.push(parseNote(line.replace(/^>\s?/,''), n, warn)); continue; }
    const u = line.match(/^@use\s+(.+)$/i);
    if(u){ cur.use = u[1].trim(); continue; }
    const kc = line.match(/^@key\s+([A-G][b#]?)(m?)\s*$/);
    if(kc){ docKey = kc[1]; pendingLabel = kc[1] + kc[2]; continue; }
    if(line.startsWith('@')){ warn(n, 'Unknown directive \u201c' + line.split(/\s/)[0] + '\u201d'); continue; }
    const row = parseRow(line, n, warn, bpb);
    if(row){
      row.key = docKey;
      if(pendingLabel){ row.keyLabel = pendingLabel; pendingLabel = null; }
      cur.rows.push(row);
    }
  }
  doc.sections.forEach((s, idx) => {
    if(s.use && !s.rows.length){
      const src2 = doc.sections.slice(0, idx).find(x => x.name.toLowerCase() === s.use.toLowerCase() && x.rows.length);
      if(src2){
        s.rows = JSON.parse(JSON.stringify(src2.rows));
        s.rows.forEach(r => { r.key = s.startKey; delete r.keyLabel; });
      } else warn(0, 'Can\u2019t find an earlier section named \u201c' + s.use + '\u201d');
    }
  });
  return doc;
}

export { parse };
