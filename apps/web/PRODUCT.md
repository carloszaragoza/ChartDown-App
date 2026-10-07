# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Worship-band music directors (primary):** they lead a church band that plays every Sunday (sets typed Service and Rehearsal), arrange the songs, and today send charts and per-player instructions by PDF, chat or word of mouth. Their job: get every musician playing the same song with the right cues.
- **Worship-band musicians:** keys, bass, drums, guitar, vocals, horns. They read Nashville Number charts on an iPad on a music stand, during rehearsal and on stage, and need only the notes meant for their instrument.

## Product Purpose

ChartDown App is where a band writes, shares and plays Nashville Number System charts written in ChartDown, an open plain-text notation. Every musician sees the same song, with the music director's notes for their own instrument. Success: a band plays a Sunday set from ChartDown App on iPads, offline if needed, without anyone reading someone else's cues.

## Positioning

- **One structure, many readings:** the song is the same for everyone; the music director's directions live in a band layer on top, and each musician receives only the notes for their instruments (filtered on the server, never only in the UI).
- **An open, plain-text notation:** ChartDown is public domain (CC0) and lives on GitHub; charts stay plain text, portable to any app that reads ChartDown.
- **Public is permanent:** published versions are shared under CC0 and stay available to the community.
- **Credit in numbers:** authors of public versions see how many bands and musicians use them, as totals only.

## Operating Context

- Rehearsals and Sunday services: an iPad on a music stand, often in landscape, sometimes without a connection (sets download for offline use).
- Stand mode: full screen, large numbers, one tap (or a page-turner pedal) to the next section.
- Desktop for writing charts and arranging sets; iPad first for playing.
- English and Spanish interface.

## Capabilities and Constraints

- Catalog of public versions identified by their source (studio, live, acoustic, own arrangement); versions are forked, never edited by others; every save is a revision.
- Bands with a music director and musicians; sets with keys and lineups; temporary music director per set; notices when something changes.
- **Private beta, invite-only and free.** Visitors join the waitlist; people with an invite code create an account. It will remain free to use when it opens to the public.
- **No lyrics:** charts hold chords, structure and directions; lyric landmarks are 8 words at most. Examples use original songs only (Open Road, Lantern Bay, Wide River…).
- No relationship with or data from CCLI.

## Brand Commitments

- Name: **ChartDown** (the notation) and **ChartDown App** (the product); domain chartdown.app.
- Logo kit in `design/logo/` and `ChartDownLogo` in `packages/ui` (symbol, horizontal, app variants).
- Red belongs to music-director and instrument cues; blue to dynamics, links and selection. Numbers and bar lines are the only full-strength ink in a chart.
- Voice: plain, direct, musician-to-musician; no hype.

## Evidence on Hand

- Real chart rendering from the app (`BarRow`, `MDNotes`, `ChartPreview` in `apps/web/app/_components/`) and original example charts in `packages/core/fixtures/` (e.g. `open-road.chartdown`).
- Screenshots of stand mode taken from the real app (Design Handoff 2.0 screens in `design/astryx/screens/`).
- **No testimonials, customers, usage numbers or press yet.** None may be invented.

## Product Principles

1. The band plays from the same song; each player reads only their cues.
2. Ready for the stage: iPad first, readable at a glance, works offline.
3. Open and portable: plain text, CC0 notation, public is permanent.
4. Respect songwriters: chords and structure, never lyrics.
5. Simple first: if it complicates a band's Sunday, it waits.

## Accessibility & Inclusion

WCAG AA contrast; touch targets of at least 44 px on iPad (56 px in stand mode); never color alone (every cue says "MD" or the instrument's name); bilingual (English, Spanish).
