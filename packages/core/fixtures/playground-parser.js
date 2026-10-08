// Reference copy of the ChartDown 0.6 playground parser, used only by
// src/playground.test.ts to check that the TypeScript port matches it.
// Source: github.com/ChartDown/Language, playground/index.html at bd10785 (ChartDown 0.6).
// Copyright (c) 2026 ChartDown contributors. MIT License.
// Extracted verbatim (music helpers, roles, parser, play order and JSON form); `export` added at the end.
"use strict";

/* ---------- Music helpers ---------- */
const SCALE = [0,2,4,5,7,9,11];
const LET = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NUMS  = ['1','b2','2','b3','3','4','#4','5','b6','6','b7','7'];
const DYN = new Set(['pp','p','mp','mf','f','ff','cresc','decresc']);
// Reserved words in { } (spec 9): compared without case, dots or spaces.
const TEMPO_MARK = {rit:'rit.', accel:'accel.', atempo:'a tempo'};
const NAV = {segno:'Segno', coda:'Coda', tocoda:'To Coda', fine:'Fine', ds:'D.S.', dsalcoda:'D.S. al Coda',
  dsalfine:'D.S. al Fine', dc:'D.C.', dcalcoda:'D.C. al Coda', dcalfine:'D.C. al Fine'};
const JUMPS = ['ds','dsalcoda','dsalfine','dc','dcalcoda','dcalfine'];
const normWord = t => t.toLowerCase().replace(/[.\s]/g, '');
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
// Spec 9.1: "2x" or "1x,3x" before the instruments.
const PASS_RE = /^(\d+x(?:\s*,\s*\d+x)*)\s*(.*)$/i;
const parsePasses = s => s.split(',').map(x => parseInt(x, 10));
function parseNote(t, n, warn){
  const m = /^MD(?:\s+([^:]+?))?\s*:\s*(.*)$/i.exec(t);
  if(m){
    let roles = ['all'], passes = [], who = m[1] || '';
    const pm = PASS_RE.exec(who);
    if(pm){ passes = parsePasses(pm[1]); who = pm[2].trim(); }
    if(who){ const r = parseRoles(who); if(r) roles = r; else warn(n, 'Unknown instrument \u201c' + who + '\u201d in an MD note'); }
    return {md:true, roles, passes, text:m[2], line:n};
  }
  return {md:false, roles:['all'], passes:[], text:t, line:n};
}
function parseCue(t){
  const pm = PASS_RE.exec(t);
  if(pm){
    const rest = pm[2];
    if(rest.startsWith(':')) return {roles:['all'], passes:parsePasses(pm[1]), text:rest.slice(1).trim()};
    const m = /^([A-Za-z][A-Za-z,\/& ]*?)\s*:\s*(.+)$/.exec(rest);
    if(m){ const r = parseRoles(m[1]); if(r) return {roles:r, passes:parsePasses(pm[1]), text:m[2].trim()}; }
  }
  const m = /^([A-Za-z][A-Za-z,\/& ]*?)\s*:\s*(.+)$/.exec(t);
  if(m){ const r = parseRoles(m[1]); if(r) return {roles:r, passes:[], text:m[2].trim()}; }
  return {roles:['all'], passes:[], text:t};
}

/* ---------- Parser ---------- */
function parseToken(tok){
  if(tok === '%') return {t:'rep'};
  if(tok === '=') return {t:'tie'};
  const xm = /^[xX](?::(\d+(?:\.\d+)?))?$/.exec(tok);
  if(xm) return {t:'nc', beats:1, explicit:!!xm[1], ...(xm[1] ? {want:parseFloat(xm[1])} : {})};
  let s = tok, push=0, hold=false, stab=false, ferm=false, beats=1, explicit=false;
  while(/[!~]$/.test(s)){ if(s.endsWith('!')) stab = true; else ferm = true; s = s.slice(0,-1); }
  const bm = s.match(/:(\d+(?:\.\d+)?)$/);
  if(bm){ beats = parseFloat(bm[1]); explicit = true; s = s.slice(0, bm.index); }
  if(s.startsWith("''")){ push = 2; s = s.slice(2); }
  else if(s.startsWith("'")){ push = 1; s = s.slice(1); }
  if(s.startsWith('<') && s.endsWith('>')){ hold = true; s = s.slice(1,-1); }
  const cm = s.match(/^([b#]?[1-7]|[A-G][b#]?)([^\/]*)(?:\/([b#]?[1-7]|[A-G][b#]?))?$/);
  if(!cm) return null;
  let q = cm[2];
  if(q === '-') q = 'm'; else if(q.startsWith('-')) q = 'm' + q.slice(1);
  return {t:'chord', root:cm[1], q, bass:cm[3]||null, beats, explicit, push, hold, stab, ferm};
}

const ROOT_RE = /^(?:[b#]?[1-7]|[A-G][b#]?)$/;
function parseRiff(tok, n, warn){
  const m = /^R\[([^\]]*)\](?::(\d+(?:\.\d+)?))?$/.exec(tok);
  if(!m) return null;
  const notes = [];
  m[1].trim().split(/\s+/).filter(Boolean).forEach(w => {
    const nm = /^(.+?)(?::(\d+(?:\.\d+)?))?$/.exec(w);
    const body = nm[1], want = nm[2] ? parseFloat(nm[2]) : null;
    if(body === 'x' || body === 'X') notes.push({rest:true, beats:1, explicit:want !== null, want});
    else if(ROOT_RE.test(body)) notes.push({root:body, beats:1, explicit:want !== null, want});
    else warn(n, 'Can\u2019t read \u201c' + w + '\u201d in a riff (notes are scale degrees or letters)');
  });
  if(!notes.length) return null;
  return {t:'riff', notes, beats:1, explicit:!!m[2], want:m[2] ? parseFloat(m[2]) : null};
}

// Spec 5.1: tokens without :beats share what is left of the bar. Returns the total.
function layoutBeats(list, total){
  const fixed = list.filter(i => i.explicit), free = list.filter(i => !i.explicit);
  fixed.forEach(i => { i.beats = i.want ?? i.beats; });
  const used = fixed.reduce((a, i) => a + i.beats, 0);
  const left = fixed.length ? Math.max(total - used, 0) : total;
  free.forEach(i => { i.beats = free.length ? (fixed.length ? left : total) / free.length : 1; });
  return used;
}

function parseBar(seg, n, warn, bpb){
  const bar = {items:[], lyric:null, cues:[], dyn:null, tempo:null, nav:[], ending:null, pickup:null, meter:null, line:n};
  seg = seg.replace(/"([^"]*)"/g, (_, t) => {
    if(t.trim().split(/\s+/).filter(Boolean).length > 8) warn(n, 'Lyric landmarks should be 8 words or fewer');
    bar.lyric = bar.lyric ? bar.lyric + ' / ' + t : t; return ' ';
  });
  seg = seg.replace(/\{([^}]*)\}/g, (_, t) => {
    t = t.trim();
    const w = normWord(t);
    if(DYN.has(w)) bar.dyn = w;
    else if(TEMPO_MARK[w]) bar.tempo = w;
    else if(NAV[w]) bar.nav.push(w);
    else if(t) bar.cues.push(parseCue(t));
    return ' ';
  });
  seg = seg.replace(/^\s*\[p:(\d+(?:\.\d+)?)\]/, (_, p) => { bar.pickup = parseFloat(p); return ' '; });
  seg = seg.replace(/^\s*\[m:(\d+)\s*\/\s*(\d+)\]/, (_, a, b) => { bar.meter = a + '/' + b; return ' '; });
  if(bar.meter && bar.pickup !== null){ warn(n, 'A bar can\u2019t have both a pickup and a one-bar meter'); bar.meter = null; }
  if(bar.meter) bpb = parseInt(bar.meter, 10);
  bar.top = bpb;
  if(bar.pickup !== null && !(bar.pickup > 0 && bar.pickup < bpb)){
    warn(n, 'A pickup needs more than 0 and fewer than ' + bpb + ' beats'); bar.pickup = null;
  }
  seg = seg.replace(/^\s*\[(\d+(?:[,-]\d+)*)\]/, (_, e) => { bar.ending = e; return ' '; });
  (seg.match(/R\[[^\]]*\](?::\d+(?:\.\d+)?)?|\S+/g) || []).forEach(tok => {
    const it = /^R\[/.test(tok) ? parseRiff(tok, n, warn) : parseToken(tok);
    if(it) bar.items.push(it); else warn(n, 'Can\u2019t read \u201c' + tok + '\u201d');
  });
  if(!bar.items.length) warn(n, 'This bar has no chords');
  const total = bar.pickup || bpb;
  bar.total = total;
  const timed = bar.items.filter(i => i.t === 'chord' || i.t === 'nc' || i.t === 'riff');
  const used = layoutBeats(timed, total);
  if(timed.some(i => i.explicit)){
    if(timed.some(i => !i.explicit) ? used > total - 0.001 : Math.abs(used - total) > 0.001)
      warn(n, 'Beats add up to ' + used + ', but the ' + (bar.pickup ? 'pickup has ' : 'meter has ') + total);
  }
  bar.items.filter(i => i.t === 'riff').forEach(r => {
    layoutBeats(r.notes, r.beats);
    if(r.notes.some(x => x.explicit)){
      const u = r.notes.filter(x => x.explicit).reduce((a, x) => a + x.want, 0);
      if(r.notes.every(x => x.explicit) && Math.abs(u - r.beats) > 0.001) warn(n, 'Riff beats add up to ' + u + ', but its space in the bar is ' + r.beats);
    }
  });
  return bar;
}

function parseRow(line, n, warn, bpb){
  let rs = false, re = false, times = 2;
  if(line.startsWith('|:')){ rs = true; line = line.slice(2); }
  else if(line.startsWith('|')) line = line.slice(1);
  const m = line.match(/:\|\s*(?:[xX]\s*(\d+)|(\d+)\s*[xX])?\s*$/);
  if(m){ re = true; if(m[1] || m[2]) times = parseInt(m[1] || m[2], 10); line = line.slice(0, m.index); }
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
  doc.meter = mm ? mm[1] + '/' + mm[2] : '4/4';
  doc.tempo = parseFloat(doc.meta.tempo) || null;

  let cur = null, docKey = null, pendingLabel = null;
  let meter = doc.meter, tempo = doc.tempo, pendingMeter = null, pendingTempo = null;
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
    if(/^@meter\b/i.test(line)){
      const mc = line.match(/^@meter\s+(\d+)\s*\/\s*(\d+)\s*$/i);
      if(mc){ meter = mc[1] + '/' + mc[2]; pendingMeter = meter; } else warn(n, 'Write a meter change like  @meter 3/4');
      continue;
    }
    if(/^@tempo\b/i.test(line)){
      const tc = line.match(/^@tempo\s+(\d+(?:\.\d+)?)\s*$/i);
      if(tc){ tempo = parseFloat(tc[1]); pendingTempo = tc[1]; } else warn(n, 'Write a tempo change like  @tempo 96');
      continue;
    }
    if(line.startsWith('@')){ warn(n, 'Unknown directive \u201c' + line.split(/\s/)[0] + '\u201d'); continue; }
    const row = parseRow(line, n, warn, parseInt(meter, 10));
    if(row){
      row.bars.forEach((b, bi) => {
        if(b.pickup !== null && (cur.rows.length || bi)){ warn(n, 'A pickup must be the first bar of a section'); b.pickup = null; b.total = b.top; }
      });
      row.key = docKey;
      row.meter = meter; row.tempo = tempo;
      if(pendingLabel){ row.keyLabel = pendingLabel; pendingLabel = null; }
      if(pendingMeter){ row.meterLabel = pendingMeter; pendingMeter = null; }
      if(pendingTempo){ row.tempoLabel = pendingTempo; pendingTempo = null; }
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
  analyze(doc, warn);
  return doc;
}

const endingList = e => e.split(',').flatMap(p => {
  const [a, b] = p.split('-').map(Number);
  return b ? Array.from({length: Math.max(b - a + 1, 0)}, (_, k) => a + k) : [a];
});

// Bar numbers, repeat spans, pass checks (9.1), navigation checks (10.1) and the play order.
function analyze(doc, warn){
  const F = [];
  doc.sections.forEach((s, si) => {
    let num = 0;
    s.rows.forEach(r => {
      let end = null;
      r.bars.forEach(b => {
        b.number = b.pickup ? 0 : ++num;
        if(b.ending) end = endingList(b.ending);
        b.endSet = end;
        F.push({si, b});
      });
    });
  });
  // Repeat spans: from the last |: (or the bar after the previous :|, or the section start) to each :|.
  const startToRe = new Map(), reStart = new Map(), inRep = new Set();
  let secStart = 0, from = 0;
  F.forEach((f, i) => {
    if(i === 0 || F[i-1].si !== f.si){ secStart = i; from = i; }
    if(f.b.rs) from = i;
    if(f.b.re){
      startToRe.set(from, i); reStart.set(i, from);
      for(let k = from; k <= i; k++) inRep.add(k);
      from = i + 1;
    }
  });
  F.forEach((f, i) => {
    if(f.b.endSet) inRep.add(i);
    if(f.b.cues.some(c => c.passes.length) && !inRep.has(i)) warn(f.b.line, 'A cue for one pass (like 2x) needs a repeat');
  });
  doc.sections.forEach(s => {
    if(!s.rows.some(r => r.bars.some(b => b.re)))
      s.notes.filter(t => t.passes.length).forEach(t => warn(t.line, 'An MD note for one pass (like 2x) needs a repeat in its section'));
  });
  // Navigation marks.
  const find = w => F.map((f, i) => f.b.nav.includes(w) ? i : -1).filter(i => i >= 0);
  ['segno','coda','tocoda','fine'].forEach(w => {
    const at = find(w);
    if(at.length > 1) warn(F[at[1]].b.line, 'There is more than one {' + NAV[w] + '}');
  });
  const jumps = F.map((f, i) => ({i, w: f.b.nav.find(x => JUMPS.includes(x))})).filter(j => j.w);
  if(jumps.length > 1) warn(F[jumps[1].i].b.line, 'A song can have only one D.S. or D.C. jump');
  let jump = jumps[0] || null;
  const segno = find('segno')[0], coda = find('coda')[0], toCoda = find('tocoda')[0], fine = find('fine')[0];
  if(jump){
    const line = F[jump.i].b.line, w = jump.w;
    if(w.startsWith('ds') && segno === undefined){ warn(line, 'D.S. needs a {segno}'); jump = null; }
    else if(w.endsWith('alcoda') && (coda === undefined || toCoda === undefined)){ warn(line, NAV[w] + ' needs a {to coda} and a {coda}'); jump = null; }
    else if(w.endsWith('alfine') && fine === undefined){ warn(line, NAV[w] + ' needs a {fine}'); jump = null; }
  }
  doc.hasJump = !!jump;
  // Expand into the play order.
  const order = [];
  let i = 0, pass = 1, curRe = -1, inSpan = false, jumped = false, back = false, steps = 0, after = false;
  while(i < F.length && steps++ < 20000){
    const f = F[i];
    if(startToRe.has(i) && !back){
      curRe = startToRe.get(i); inSpan = true;
      pass = jumped ? (F[curRe].b.times || 2) : 1;
    }
    back = false;
    if(f.b.endSet && !f.b.endSet.includes(pass)){ if(i === curRe) inSpan = false; i++; continue; }
    if(!f.b.endSet && !inSpan) pass = 1;
    order.push({section: f.si, bar: f.b.number, pass, jump: after});
    after = false;
    if(jumped && jump.w.endsWith('alcoda') && i === toCoda){ i = coda; inSpan = false; pass = 1; after = true; continue; }
    if(jumped && jump.w.endsWith('alfine') && i === fine) break;
    if(f.b.re && i === curRe){
      inSpan = false;
      if(!jumped && pass < (f.b.times || 2)){ pass++; i = reStart.get(i); inSpan = true; back = true; continue; }
    }
    if(jump && !jumped && i === jump.i){ jumped = true; i = jump.w.startsWith('ds') ? segno : 0; pass = 1; inSpan = false; after = true; continue; }
    i++;
  }
  doc.playOrder = order;
}

/* ---------- JSON form (spec Appendix A) ---------- */
function toJSON(doc){
  const deg = (root, key) => root ? rel(root, key) : null;
  const item = (it, key) => {
    if(it.t === 'rep') return {type:'repeat'};
    if(it.t === 'tie') return {type:'tie'};
    if(it.t === 'nc') return {type:'rest', beats:it.beats};
    if(it.t === 'riff') return {type:'riff', beats:it.beats, notes:it.notes.map(n => n.rest ? {rest:true, beats:n.beats} : {root:n.root, degree:deg(n.root, key), beats:n.beats})};
    return {type:'chord', root:it.root, degree:deg(it.root, key), quality:it.q, bass:it.bass, bassDegree:deg(it.bass, key),
      beats:it.beats, push:it.push, hold:it.hold, stab:it.stab, fermata:it.ferm};
  };
  const cue = c => ({roles:c.roles, passes:c.passes, text:c.text});
  return {
    chartdown: doc.meta.chartdown || null,
    meta: doc.meta, key: doc.keyRoot, minor: doc.minor,
    sections: doc.sections.map(s => ({
      name: s.name, use: s.use,
      notes: s.notes.map(t => ({md:t.md, roles:t.roles, passes:t.passes, text:t.text})),
      rows: s.rows.map(r => {
        const key = r.key || doc.keyRoot;
        return {key, meter:r.meter, tempo:r.tempo, bars: r.bars.map(b => ({
          number:b.number, beats:b.total, pickup:!!b.pickup, meter:b.meter,
          repeatStart:!!b.rs, repeatEnd:!!b.re, times:b.re ? b.times : null,
          ending:b.ending ? endingList(b.ending) : null,
          dynamic:b.dyn, tempoMark:b.tempo, nav:b.nav, cues:b.cues.map(cue), lyric:b.lyric,
          items:b.items.map(it => item(it, key))
        }))};
      })
    })),
    playOrder: doc.playOrder.map(o => ({section:o.section, bar:o.bar, pass:o.pass})),
    warnings: doc.warnings.map(w => ({line:w.line, message:w.msg}))
  };
}

export { parse, toJSON };
