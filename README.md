# Arialoom

Arialoom is a portable desktop songwriting workspace for lyrics, chords,
arrangement sketches, voice notes, and alternate song versions. It does not use
AI.

The app is built with Tauri, React, and TypeScript so it can run as a desktop
app on macOS, Windows, and Linux while keeping the interface custom and
polished.

## Run In Development

Install dependencies:

```sh
npm install
```

Run as a web app:

```sh
npm run dev
```

Run as a desktop app:

```sh
npm run desktop
```

## Build

Build the frontend:

```sh
npm run build
```

Build a desktop bundle:

```sh
npm run desktop:build
```

## Current Features

- Dark, high-contrast, lightly retro interface
- Lyrics editor with section cards and syllable counts
- Version tree with branchable song drafts
- Chord and arrangement sketching
- Voice memo recording and playback
- Version comparison summary
- Local persistence in browser/Tauri storage
- JSON import/export
- Markdown lyric export

## Notes

Voice memos are stored as data URLs inside the local project state for this
prototype, which keeps import/export simple. A future production version should
move larger audio recordings into a proper file-backed project folder.
