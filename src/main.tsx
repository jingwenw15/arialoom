import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import {
  Archive,
  ArrowRightLeft,
  ChevronRight,
  Download,
  FileUp,
  GitBranch,
  GitFork,
  Mic,
  Music2,
  Play,
  Plus,
  Save,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";
import "./styles.css";

type VersionStatus = "idea" | "working" | "keeper" | "archived";
type SectionKind = "intro" | "verse" | "pre" | "chorus" | "bridge" | "outro" | "custom";

type LyricSection = {
  id: string;
  kind: SectionKind;
  title: string;
  lines: string;
};

type ChordProgression = {
  id: string;
  name: string;
  text: string;
};

type ArrangementBlock = {
  id: string;
  kind: SectionKind;
  label: string;
  bars: number;
  energy: number;
};

type VoiceMemo = {
  id: string;
  title: string;
  audioUrl: string;
  createdAt: string;
  durationSeconds: number;
};

type SongVersion = {
  id: string;
  parentId: string | null;
  name: string;
  status: VersionStatus;
  summary: string;
  createdAt: string;
  updatedAt: string;
  lyricSections: LyricSection[];
  chords: ChordProgression[];
  arrangement: ArrangementBlock[];
  voiceMemos: VoiceMemo[];
  notes: string;
};

type SongProject = {
  id: string;
  title: string;
  key: string;
  tempo: number;
  activeVersionId: string;
  versions: SongVersion[];
};

type RecordingState = {
  recorder: MediaRecorder;
  startedAt: number;
  chunks: Blob[];
};

const storageKey = "arialoom.project.v1";

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const sectionLabels: Record<SectionKind, string> = {
  intro: "Intro",
  verse: "Verse",
  pre: "Pre",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
  custom: "Custom",
};

const statuses: VersionStatus[] = ["idea", "working", "keeper", "archived"];
const sectionKinds: SectionKind[] = ["intro", "verse", "pre", "chorus", "bridge", "outro", "custom"];

function starterProject(): SongProject {
  const versionId = id();
  return {
    id: id(),
    title: "Window Song",
    key: "C",
    tempo: 112,
    activeVersionId: versionId,
    versions: [
      {
        id: versionId,
        parentId: null,
        name: "First sketch",
        status: "working",
        summary: "A small nocturnal pop idea with a lift in the chorus.",
        createdAt: now(),
        updatedAt: now(),
        lyricSections: [
          {
            id: id(),
            kind: "verse",
            title: "Verse",
            lines: "Blue room humming in the hallway\nCoffee cooling by the door",
          },
          {
            id: id(),
            kind: "chorus",
            title: "Chorus",
            lines: "Hold the note until it turns to morning\nLet it bloom and ask for more",
          },
        ],
        chords: [{ id: id(), name: "Main loop", text: "C  G  Am  F" }],
        arrangement: [
          { id: id(), kind: "intro", label: "Tape intro", bars: 4, energy: 1 },
          { id: id(), kind: "verse", label: "Sparse verse", bars: 8, energy: 2 },
          { id: id(), kind: "chorus", label: "Open chorus", bars: 8, energy: 4 },
        ],
        voiceMemos: [],
        notes: "Try a drier vocal in the verse. Chorus should feel wider, not louder.",
      },
    ],
  };
}

function App() {
  const [project, setProject] = useState<SongProject>(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return starterProject();
    try {
      return JSON.parse(saved) as SongProject;
    } catch {
      return starterProject();
    }
  });
  const [compareId, setCompareId] = useState<string>("");
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project]);

  const activeVersion = project.versions.find((version) => version.id === project.activeVersionId) ?? project.versions[0];
  const compareVersion = project.versions.find((version) => version.id === compareId);

  const totalBars = activeVersion.arrangement.reduce((sum, block) => sum + block.bars, 0);
  const totalWords = activeVersion.lyricSections.reduce((sum, section) => sum + wordCount(section.lines), 0);

  function updateProject(patch: Partial<SongProject>) {
    setProject((current) => ({ ...current, ...patch }));
  }

  function updateActiveVersion(patch: Partial<SongVersion>) {
    setProject((current) => ({
      ...current,
      versions: current.versions.map((version) =>
        version.id === current.activeVersionId ? { ...version, ...patch, updatedAt: now() } : version,
      ),
    }));
  }

  function branchVersion() {
    const clone = structuredClone(activeVersion);
    const nextVersion: SongVersion = {
      ...clone,
      id: id(),
      parentId: activeVersion.id,
      name: `${activeVersion.name} variation`,
      status: "idea",
      createdAt: now(),
      updatedAt: now(),
      lyricSections: clone.lyricSections.map((section) => ({ ...section, id: id() })),
      chords: clone.chords.map((chord) => ({ ...chord, id: id() })),
      arrangement: clone.arrangement.map((block) => ({ ...block, id: id() })),
      voiceMemos: [],
    };
    setProject((current) => ({
      ...current,
      activeVersionId: nextVersion.id,
      versions: [...current.versions, nextVersion],
    }));
  }

  function setActiveVersion(idToActivate: string) {
    setProject((current) => ({ ...current, activeVersionId: idToActivate }));
  }

  function updateSection(sectionId: string, patch: Partial<LyricSection>) {
    updateActiveVersion({
      lyricSections: activeVersion.lyricSections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    });
  }

  function addSection() {
    updateActiveVersion({
      lyricSections: [
        ...activeVersion.lyricSections,
        { id: id(), kind: "custom", title: "New section", lines: "" },
      ],
    });
  }

  function deleteSection(sectionId: string) {
    updateActiveVersion({
      lyricSections: activeVersion.lyricSections.filter((section) => section.id !== sectionId),
    });
  }

  function updateChord(chordId: string, patch: Partial<ChordProgression>) {
    updateActiveVersion({
      chords: activeVersion.chords.map((chord) => (chord.id === chordId ? { ...chord, ...patch } : chord)),
    });
  }

  function addChord() {
    updateActiveVersion({
      chords: [...activeVersion.chords, { id: id(), name: "New progression", text: "" }],
    });
  }

  function deleteChord(chordId: string) {
    updateActiveVersion({
      chords: activeVersion.chords.filter((chord) => chord.id !== chordId),
    });
  }

  function updateBlock(blockId: string, patch: Partial<ArrangementBlock>) {
    updateActiveVersion({
      arrangement: activeVersion.arrangement.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  }

  function addBlock() {
    updateActiveVersion({
      arrangement: [
        ...activeVersion.arrangement,
        { id: id(), kind: "verse", label: "New block", bars: 8, energy: 2 },
      ],
    });
  }

  function deleteBlock(blockId: string) {
    updateActiveVersion({
      arrangement: activeVersion.arrangement.filter((block) => block.id !== blockId),
    });
  }

  async function toggleRecording() {
    if (recording) {
      recording.recorder.stop();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => {
        const memo: VoiceMemo = {
          id: id(),
          title: `Voice memo ${activeVersion.voiceMemos.length + 1}`,
          audioUrl: String(reader.result),
          createdAt: now(),
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        };
        updateActiveVersion({ voiceMemos: [...activeVersion.voiceMemos, memo] });
        stream.getTracks().forEach((track) => track.stop());
        setRecording(null);
      };
      reader.readAsDataURL(blob);
    };
    recorder.start();
    setRecording({ recorder, chunks, startedAt });
  }

  function exportJson() {
    downloadFile(`${slug(project.title)}.arialoom.json`, JSON.stringify(project, null, 2), "application/json");
  }

  function exportMarkdown() {
    downloadFile(`${slug(project.title)}-${slug(activeVersion.name)}.md`, markdown(project, activeVersion), "text/markdown");
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as SongProject;
        setProject(imported);
        setCompareId("");
      } catch {
        window.alert("That file was not a valid Arialoom JSON export.");
      }
    };
    reader.readAsText(file);
  }

  const diff = useMemo(
    () => (compareVersion ? compareVersions(compareVersion, activeVersion) : []),
    [activeVersion, compareVersion],
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Music2 size={21} />
          </div>
          <div>
            <h1>Arialoom</h1>
            <p>songwriting workspace</p>
          </div>
        </div>

        <button className="primary-action" onClick={branchVersion}>
            <GitFork size={17} />
          Branch current version
        </button>

        <div className="panel compact">
          <div className="panel-title">
            <GitBranch size={16} />
            Versions
          </div>
          <div className="version-list">
            {treeRows(project.versions).map(({ version, depth }) => (
              <button
                className={`version-row ${version.id === activeVersion.id ? "active" : ""}`}
                key={version.id}
                onClick={() => setActiveVersion(version.id)}
                style={{ paddingLeft: 12 + depth * 18 }}
              >
                <ChevronRight size={14} />
                <span>
                  <strong>{version.name}</strong>
                  <small className={`status-text status-${version.status}`}>{version.status}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel compact">
          <div className="panel-title">
            <ArrowRightLeft size={16} />
            Compare
          </div>
          <select value={compareId} onChange={(event) => setCompareId(event.target.value)}>
            <option value="">Choose version</option>
            {project.versions
              .filter((version) => version.id !== activeVersion.id)
              .map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
          </select>
          <div className="diff-list">
            {diff.length === 0 ? <p className="muted">No comparison selected.</p> : diff.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>

        <div className="file-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importJson(file);
            }}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            <FileUp size={16} />
            Import
          </button>
          <button onClick={exportJson}>
            <Save size={16} />
            Export project
          </button>
          <button onClick={exportMarkdown}>
            <Download size={16} />
            Export lyrics
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="song-header">
          <div>
            <label>Song</label>
            <input
              className="title-input"
              value={project.title}
              onChange={(event) => updateProject({ title: event.target.value })}
            />
          </div>
          <div className="song-meta">
            <label>
              Key
              <input value={project.key} onChange={(event) => updateProject({ key: event.target.value })} />
            </label>
            <label>
              Tempo
              <input
                type="number"
                min={40}
                max={260}
                value={project.tempo}
                onChange={(event) => updateProject({ tempo: Number(event.target.value) })}
              />
            </label>
          </div>
        </header>

        <section className="version-hero">
          <div>
            <p className="eyebrow">Active version</p>
            <input
              className="version-title"
              value={activeVersion.name}
              onChange={(event) => updateActiveVersion({ name: event.target.value })}
            />
            <input
              className="summary-input"
              value={activeVersion.summary}
              placeholder="What makes this version different?"
              onChange={(event) => updateActiveVersion({ summary: event.target.value })}
            />
          </div>
          <div className="version-actions">
            <select
              className="status-pill"
              value={activeVersion.status}
              onChange={(event) => updateActiveVersion({ status: event.target.value as VersionStatus })}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <button onClick={branchVersion}>
              <GitFork size={16} />
              Branch
            </button>
          </div>
        </section>

        <div className="project-summary">
          <span>{totalWords} words</span>
          <span>{activeVersion.lyricSections.length} sections</span>
          <span>{totalBars} bars</span>
          <span>{activeVersion.voiceMemos.length} memos</span>
        </div>

        <div className="editor-grid">
          <section className="panel lyrics-panel">
            <PanelHeader icon={<Sparkles size={17} />} title="Lyrics" actionLabel="Section" onAction={addSection} />
            <div className="sections">
              {activeVersion.lyricSections.map((section) => (
                <article className="lyric-card" key={section.id}>
                  <div className="card-tools">
                    <select value={section.kind} onChange={(event) => updateSection(section.id, { kind: event.target.value as SectionKind })}>
                      {sectionKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {sectionLabels[kind]}
                        </option>
                      ))}
                    </select>
                    <input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} />
                    <button className="icon-button danger" onClick={() => deleteSection(section.id)} aria-label="Delete section">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea value={section.lines} onChange={(event) => updateSection(section.id, { lines: event.target.value })} />
                  <div className="line-meter">
                    {section.lines.split("\n").map((line, index) => (
                      <span key={`${section.id}-${index}`}>{syllableCount(line)}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="right-rail">
            <section className="panel">
              <PanelHeader icon={<Upload size={17} />} title="Voice" />
              <button className={`record-button ${recording ? "recording" : ""}`} onClick={toggleRecording}>
                {recording ? <Square size={18} /> : <Mic size={18} />}
                {recording ? "Stop recording" : "Record idea"}
              </button>
              <div className="memo-list">
                {activeVersion.voiceMemos.length === 0 ? (
                  <p className="muted">Capture melodies, toplines, spoken notes, or alternate takes.</p>
                ) : (
                  activeVersion.voiceMemos.map((memo) => (
                    <div className="memo" key={memo.id}>
                      <audio src={memo.audioUrl} controls />
                      <div>
                        <strong>{memo.title}</strong>
                        <small>{memo.durationSeconds}s</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <PanelHeader icon={<Volume2 size={17} />} title="Chords" actionLabel="Progression" onAction={addChord} />
              {activeVersion.chords.map((chord) => (
                <div className="mini-editor" key={chord.id}>
                  <div className="mini-editor-tools">
                    <input value={chord.name} onChange={(event) => updateChord(chord.id, { name: event.target.value })} />
                    <button className="icon-button danger" onClick={() => deleteChord(chord.id)} aria-label="Delete chord progression">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea value={chord.text} onChange={(event) => updateChord(chord.id, { text: event.target.value })} />
                </div>
              ))}
            </section>
          </aside>
        </div>

        <section className="panel arrangement-panel">
          <PanelHeader icon={<Archive size={17} />} title="Arrangement" actionLabel="Block" onAction={addBlock} />
          <div className="arrangement-row">
            {activeVersion.arrangement.map((block) => (
              <article className="arrangement-block" key={block.id} style={{ flexGrow: Math.max(1, block.bars / 4) }}>
                <div className="arrangement-tools">
                  <select value={block.kind} onChange={(event) => updateBlock(block.id, { kind: event.target.value as SectionKind })}>
                    {sectionKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {sectionLabels[kind]}
                      </option>
                    ))}
                  </select>
                  <button className="icon-button danger" onClick={() => deleteBlock(block.id)} aria-label="Delete arrangement block">
                    <Trash2 size={15} />
                  </button>
                </div>
                <input value={block.label} onChange={(event) => updateBlock(block.id, { label: event.target.value })} />
                <div className="block-fields">
                  <label>
                    Bars
                    <input type="number" min={1} max={64} value={block.bars} onChange={(event) => updateBlock(block.id, { bars: Number(event.target.value) })} />
                  </label>
                  <label>
                    Energy
                    <input type="range" min={1} max={5} value={block.energy} onChange={(event) => updateBlock(block.id, { energy: Number(event.target.value) })} />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel notes-panel">
          <PanelHeader icon={<Play size={17} />} title="Scratchpad" />
          <textarea value={activeVersion.notes} onChange={(event) => updateActiveVersion({ notes: event.target.value })} />
        </section>
      </section>
    </main>
  );
}

function PanelHeader({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-heading">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {actionLabel && (
        <button onClick={onAction}>
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function treeRows(versions: SongVersion[]) {
  const visit = (parentId: string | null, depth: number): Array<{ version: SongVersion; depth: number }> =>
    versions
      .filter((version) => version.parentId === parentId)
      .flatMap((version) => [{ version, depth }, ...visit(version.id, depth + 1)]);
  return visit(null, 0);
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function syllableCount(line: string) {
  return line
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .reduce((sum, word) => {
      const groups = word.replace(/e$/, "").match(/[aeiouy]+/g);
      return sum + Math.max(1, groups?.length ?? 0);
    }, 0);
}

function compareVersions(left: SongVersion, right: SongVersion) {
  const changes: string[] = [];
  if (JSON.stringify(left.lyricSections) !== JSON.stringify(right.lyricSections)) changes.push("Lyrics changed");
  if (JSON.stringify(left.chords) !== JSON.stringify(right.chords)) changes.push("Chords changed");
  if (JSON.stringify(left.arrangement) !== JSON.stringify(right.arrangement)) changes.push("Arrangement changed");
  if (left.voiceMemos.length !== right.voiceMemos.length) changes.push("Voice memo count changed");
  return changes.length > 0 ? changes : ["No differences"];
}

function markdown(project: SongProject, version: SongVersion) {
  const lyrics = version.lyricSections.map((section) => `## ${section.title}\n\n${section.lines}`).join("\n\n");
  const chords = version.chords.map((chord) => `## ${chord.name}\n\n${chord.text}`).join("\n\n");
  const arrangement = version.arrangement.map((block) => `- ${block.label}: ${block.bars} bars, energy ${block.energy}/5`).join("\n");
  return `# ${project.title}

Version: ${version.name}
Key: ${project.key}
Tempo: ${project.tempo} BPM

# Arrangement

${arrangement}

# Chords

${chords}

# Lyrics

${lyrics}

# Notes

${version.notes}
`;
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "song";
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
