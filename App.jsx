import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  Settings,
  Link2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Copy,
  Eraser,
  Check,
  X,
  FileText,
  Plus,
  Trash2,
  BookOpen,
  Tags,
  ListTree,
  ClipboardCheck,
  Cpu,
  Timer,
  RefreshCw,
} from "lucide-react";

const STYLES = [
  { id: "general", label: "ทั่วไป (นิยายทั่วไป)" },
  { id: "xianxia", label: "Xianxia / Wuxia (กำลังภายใน-เทพเซียน)" },
  { id: "litrpg", label: "LitRPG (ระบบ/เกมออนไลน์)" },
  { id: "republican", label: "ย้อนยุค / สาธารณรัฐจีน" },
  { id: "entertainment", label: "บันเทิง / วงการบันเทิง" },
  { id: "romance", label: "โรแมนติกร่วมสมัย" },
];

const PRONOUN_RULES = [
  { id: "modern", label: "ยุคปัจจุบัน: เป็นกันเอง (ฉัน/แก/นาย)" },
  { id: "ancient", label: "ยุคจีนโบราณ: ข้า/เจ้า/ท่าน" },
  { id: "formal", label: "เป็นทางการ: ผม/ดิฉัน/คุณ" },
  { id: "auto", label: "ตามบริบทอัตโนมัติ (ให้ AI เลือกเอง)" },
];

const POVS = [
  { id: "third", label: "มุมมองบุคคลที่ 3 (เขา/เธอ/ชื่อตัวละคร) — แนะนำ" },
  { id: "first", label: "มุมมองบุคคลที่ 1 (ฉัน/ผม)" },
  { id: "original", label: "ตามต้นฉบับ" },
];

const SOURCE_LANGS = [
  { code: "auto", label: "อัตโนมัติ (Auto-Detect)" },
  { code: "Chinese", label: "จีน" },
  { code: "English", label: "อังกฤษ" },
  { code: "Korean", label: "เกาหลี" },
];

const DEFAULT_SETTINGS = {
  sourceLang: "auto",
  style: "general",
  pronounRule: "modern",
  pov: "third",
  customPrompt: "",
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Split long text into manageable chunks (by paragraph) so each AI call stays within output limits.
function splitIntoChunks(text, maxChars = 800) {
  const paragraphs = text.split(/\n+/);
  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && (current + "\n" + p).length > maxChars) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? current + "\n" + p : p;
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text];
}

function styleLabel(id) {
  return STYLES.find((s) => s.id === id)?.label || "ทั่วไป";
}
function pronounLabel(id) {
  return PRONOUN_RULES.find((s) => s.id === id)?.label || "";
}
function povLabel(id) {
  return POVS.find((s) => s.id === id)?.label || "";
}

function buildTranslatePrompt({ text, sourceLang, glossary, settings, isChunk, chunkIndex, chunkTotal }) {
  const langHint =
    sourceLang === "auto"
      ? "ตรวจจับภาษาต้นฉบับโดยอัตโนมัติ"
      : `ต้นฉบับเป็นภาษา${
          sourceLang === "Chinese" ? "จีน" : sourceLang === "English" ? "อังกฤษ" : "เกาหลี"
        }`;
  const glossaryBlock =
    glossary && glossary.length
      ? `\n\nใช้คำแปลของชื่อ/คำศัพท์เฉพาะต่อไปนี้ให้สอดคล้องกันเสมอ:\n${glossary
          .filter((g) => g.original && g.translation)
          .map((g) => `- ${g.original} = ${g.translation}`)
          .join("\n")}`
      : "";
  const customBlock = settings.customPrompt?.trim()
    ? `\n\nกฎเพิ่มเติมจากผู้ใช้ (ต้องทำตามเคร่งครัด):\n${settings.customPrompt.trim()}`
    : "";
  const chunkNote =
    isChunk && chunkTotal > 1
      ? `\n\n(นี่คือส่วนที่ ${chunkIndex + 1}/${chunkTotal} ของบทเดียวกัน แปลต่อเนื่องให้สำนวนและคำศัพท์สอดคล้องกับส่วนอื่น ห้ามสรุปย่อ ห้ามตัดเนื้อหา)`
      : "";

  return `คุณคือนักแปลนิยายมืออาชีพ ${langHint}

สไตล์การแปล: ${styleLabel(settings.style)}
กฎสรรพนามและบริบทยุคสมัย: ${pronounLabel(settings.pronounRule)}
มุมมองผู้เล่าเรื่อง: ${povLabel(settings.pov)}

แปลข้อความต่อไปนี้เป็นภาษาไทยที่อ่านลื่น สำนวนธรรมชาติแบบนิยายแปล คงชื่อตัวละคร ชื่อสถานที่ และคำเฉพาะให้สอดคล้องกัน ห้ามใส่คำอธิบายเพิ่มเติม ห้ามใส่หัวข้อ ตอบเฉพาะเนื้อความคำแปลเท่านั้น${glossaryBlock}${customBlock}${chunkNote}

ข้อความ:
${text}`;
}

function buildGlossaryPrompt(text) {
  return `จากข้อความต่อไปนี้ ให้ดึงชื่อตัวละคร ชื่อสถานที่ และคำศัพท์เฉพาะที่ควรแปลให้สอดคล้องกันทุกครั้งที่ปรากฏ พร้อมเสนอคำแปลภาษาไทยที่เหมาะสมสำหรับแต่ละคำ ตอบเป็น JSON array เท่านั้น ห้ามมีคำอธิบายหรือข้อความอื่นใดนอกจาก JSON รูปแบบที่ต้องการ: [{"original":"...","translation":"..."}]\n\nข้อความ:\n${text.slice(
    0,
    6000
  )}`;
}

// Calls our own /api/gemini serverless function, which holds the real Gemini API key
// server-side and forwards the request to Google's Generative Language API.
async function callAI(prompt, maxTokens = 1000) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      msg = data?.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await response.json();
  const out = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!out) throw new Error("ไม่ได้รับคำตอบจากโมเดล");
  return out;
}

// Calls the AI model to pull character/place names and special terms out of a block of text.
// Returns [] (instead of throwing) on any parse/network failure so callers can treat
// glossary scanning as a best-effort background step.
async function extractGlossaryCandidates(text) {
  if (!text || !text.trim()) return [];
  try {
    const raw = await callAI(buildGlossaryPrompt(text), 1000);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.original === "string") : [];
  } catch {
    return [];
  }
}

function mergeGlossary(existing, candidates) {
  const existingKeys = new Set(
    existing.map((t) => (t.original || "").trim().toLowerCase()).filter(Boolean)
  );
  const additions = [];
  for (const c of candidates) {
    const orig = (c.original || "").trim();
    if (!orig) continue;
    const key = orig.toLowerCase();
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    additions.push({ id: uid(), original: orig, translation: (c.translation || "").trim() });
  }
  return additions.length ? [...existing, ...additions] : existing;
}

export default function NovelTranslatorApp() {
  const [novels, setNovels] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [novel, setNovel] = useState(null);
  const [tab, setTab] = useState("chapters");
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingNovel, setLoadingNovel] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [newNovelTitle, setNewNovelTitle] = useState("");
  const [showNewNovel, setShowNewNovel] = useState(false);
  const [glossaryScanState, setGlossaryScanState] = useState("idle");
  const [scanningChapterId, setScanningChapterId] = useState(null);
  const [translateProgress, setTranslateProgress] = useState(null);
  const [mobileView, setMobileView] = useState("novels");
  const [copyAllState, setCopyAllState] = useState("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("novels-index");
        setNovels(result ? JSON.parse(result.value) : []);
      } catch {
        setNovels([]);
      } finally {
        setLoadingIndex(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setNovel(null);
      return;
    }
    (async () => {
      setLoadingNovel(true);
      try {
        const result = await window.storage.get(`novel:${selectedId}`);
        const parsed = result ? JSON.parse(result.value) : null;
        if (parsed && !parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
        setNovel(parsed);
      } catch {
        setNovel(null);
      } finally {
        setLoadingNovel(false);
      }
      setActiveChapterId(null);
      setTab("chapters");
    })();
  }, [selectedId]);

  async function persistIndex(next) {
    setNovels(next);
    try {
      await window.storage.set("novels-index", JSON.stringify(next));
    } catch {}
  }

  async function persistNovel(next) {
    setNovel(next);
    setSaveState("saving");
    try {
      await window.storage.set(`novel:${next.id}`, JSON.stringify(next));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("idle");
    }
  }

  async function createNovel() {
    const title = newNovelTitle.trim() || "เรื่องใหม่ไม่มีชื่อ";
    const id = uid();
    const entry = { id, title };
    const nextIndex = [...(novels || []), entry];
    await persistIndex(nextIndex);
    const fullNovel = { id, title, chapters: [], glossary: [], settings: { ...DEFAULT_SETTINGS } };
    await window.storage.set(`novel:${id}`, JSON.stringify(fullNovel));
    setNewNovelTitle("");
    setShowNewNovel(false);
    setSelectedId(id);
    setMobileView("list");
  }

  async function deleteNovel(id) {
    const nextIndex = (novels || []).filter((n) => n.id !== id);
    await persistIndex(nextIndex);
    try {
      await window.storage.delete(`novel:${id}`);
    } catch {}
    if (selectedId === id) {
      setSelectedId(null);
      setMobileView("novels");
    }
  }

  async function updateNovelTitle(title) {
    if (!novel) return;
    const next = { ...novel, title };
    await persistNovel(next);
    await persistIndex((novels || []).map((n) => (n.id === novel.id ? { ...n, title } : n)));
  }

  function openSettings() {
    setSettingsDraft(novel?.settings || { ...DEFAULT_SETTINGS });
    setShowSettings(true);
  }

  async function saveSettings() {
    if (!novel) {
      setShowSettings(false);
      return;
    }
    await persistNovel({ ...novel, settings: settingsDraft });
    setShowSettings(false);
  }

  async function addChapter() {
    if (!novel) return;
    const chapter = {
      id: uid(),
      number: novel.chapters.length + 1,
      title: `บทที่ ${novel.chapters.length + 1}`,
      original: "",
      translated: "",
      status: "pending",
      errorMsg: "",
    };
    const next = { ...novel, chapters: [...novel.chapters, chapter] };
    await persistNovel(next);
    setActiveChapterId(chapter.id);
    setMobileView("editor");
  }

  async function deleteChapter(chapterId) {
    if (!novel) return;
    const next = { ...novel, chapters: novel.chapters.filter((c) => c.id !== chapterId) };
    await persistNovel(next);
    if (activeChapterId === chapterId) {
      setActiveChapterId(null);
      setMobileView("list");
    }
  }

  async function updateChapter(chapterId, patch) {
    if (!novel) return;
    const next = {
      ...novel,
      chapters: novel.chapters.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
    };
    await persistNovel(next);
  }

  async function addGlossaryTerm() {
    if (!novel) return;
    const term = { id: uid(), original: "", translation: "" };
    await persistNovel({ ...novel, glossary: [...novel.glossary, term] });
  }

  async function updateGlossaryTerm(termId, patch) {
    if (!novel) return;
    const next = {
      ...novel,
      glossary: novel.glossary.map((t) => (t.id === termId ? { ...t, ...patch } : t)),
    };
    await persistNovel(next);
  }

  async function deleteGlossaryTerm(termId) {
    if (!novel) return;
    await persistNovel({ ...novel, glossary: novel.glossary.filter((t) => t.id !== termId) });
  }

  async function scanNovelGlossary() {
    if (!novel || !novel.chapters.length) return;
    setGlossaryScanState("scanning");
    try {
      const sample = novel.chapters
        .slice(0, 5)
        .map((c) => c.original)
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 6000);
      const candidates = await extractGlossaryCandidates(sample);
      const nextGlossary = mergeGlossary(novel.glossary, candidates);
      if (nextGlossary !== novel.glossary) {
        await persistNovel({ ...novel, glossary: nextGlossary });
      }
    } finally {
      setGlossaryScanState("idle");
    }
  }

  // Scans a single chapter's original text for character/place names and merges any new
  // terms straight into the project glossary. Used both as a standalone manual action from
  // the chapter editor, and automatically right before that chapter gets translated.
  async function scanChapterGlossary(chapterId) {
    const chapter = novel.chapters.find((c) => c.id === chapterId);
    if (!chapter || !chapter.original.trim()) return;
    setScanningChapterId(chapterId);
    try {
      const candidates = await extractGlossaryCandidates(chapter.original);
      const nextGlossary = mergeGlossary(novel.glossary, candidates);
      if (nextGlossary !== novel.glossary) {
        await persistNovel({ ...novel, glossary: nextGlossary });
      }
    } finally {
      setScanningChapterId(null);
    }
  }

  async function translateChapter(chapterId) {
    const chapter = novel.chapters.find((c) => c.id === chapterId);
    if (!chapter || !chapter.original.trim()) return;
    const settings = novel.settings || DEFAULT_SETTINGS;

    // Auto-scan this chapter's own text for names/terms first, so the translation below
    // can already use them for consistent naming. Scan failures are non-fatal — we just
    // fall back to whatever glossary already existed.
    setScanningChapterId(chapterId);
    const candidates = await extractGlossaryCandidates(chapter.original);
    setScanningChapterId(null);
    const glossary = mergeGlossary(novel.glossary, candidates);

    // Persist the merged glossary together with the "translating" status in one write,
    // since updateChapter/persistNovel below would otherwise be built off a stale `novel`
    // closure and clobber whichever of the two updates happened second.
    await persistNovel({
      ...novel,
      glossary,
      chapters: novel.chapters.map((c) =>
        c.id === chapterId ? { ...c, status: "translating", errorMsg: "" } : c
      ),
    });

    try {
      const chunks = splitIntoChunks(chapter.original, 800);
      const results = [];
      setTranslateProgress({ chapterId, completed: 0, total: chunks.length, startedAt: Date.now() });
      for (let i = 0; i < chunks.length; i++) {
        const prompt = buildTranslatePrompt({
          text: chunks[i],
          sourceLang: settings.sourceLang,
          glossary,
          settings,
          isChunk: chunks.length > 1,
          chunkIndex: i,
          chunkTotal: chunks.length,
        });
        const out = await callAI(prompt, 1500);
        results.push(out);
        setTranslateProgress((p) => (p && p.chapterId === chapterId ? { ...p, completed: i + 1 } : p));
      }
      await updateChapter(chapterId, { translated: results.join("\n\n"), status: "done", errorMsg: "" });
    } catch (err) {
      await updateChapter(chapterId, { status: "error", errorMsg: err.message || "แปลไม่สำเร็จ" });
    } finally {
      setTranslateProgress((p) => (p && p.chapterId === chapterId ? null : p));
    }
  }

  async function copyAllTranslated() {
    if (!novel) return;
    const sorted = [...novel.chapters].sort((a, b) => a.number - b.number);
    const parts = sorted
      .filter((c) => c.translated && c.translated.trim())
      .map((c) => `${c.title}\n\n${c.translated.trim()}`);
    if (!parts.length) return;
    const combined = parts.join("\n\n\n");
    try {
      await navigator.clipboard.writeText(combined);
      setCopyAllState("done");
      setTimeout(() => setCopyAllState("idle"), 1500);
    } catch {}
  }

  const activeChapter = novel?.chapters.find((c) => c.id === activeChapterId) || null;
  const translatedCount = novel ? novel.chapters.filter((c) => c.status === "done").length : 0;

  return (
    <div className="h-screen w-full flex flex-col bg-stone-50 text-stone-800 font-sans overflow-hidden">
      {/* Global top bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-stone-200 shrink-0">
        {selectedId ? (
          <button
            onClick={() => {
              if (mobileView === "editor") setMobileView("list");
              else if (mobileView === "list") {
                setSelectedId(null);
                setMobileView("novels");
              }
            }}
            className="p-1.5 -ml-1 text-stone-500 hover:text-stone-700 md:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}
        <BookOpen className="w-5 h-5 text-amber-700 hidden md:block" />
        <div className="flex-1 min-w-0">
          {novel ? (
            <input
              value={novel.title}
              onChange={(e) => updateNovelTitle(e.target.value)}
              className="text-base font-semibold text-stone-800 bg-transparent focus:outline-none w-full truncate"
            />
          ) : (
            <span className="text-base font-semibold text-stone-800">นักแปลนิยาย</span>
          )}
        </div>
        {saveState === "saving" && <span className="text-xs text-stone-400 hidden md:inline">กำลังบันทึก...</span>}
        {saveState === "saved" && <span className="text-xs text-green-600 hidden md:inline">บันทึกแล้ว</span>}
        {novel && (
          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-stone-200 text-stone-500 hover:border-stone-300"
          >
            <Settings className="w-3.5 h-3.5" /> ตั้งค่าโปรเจกต์
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Novels list */}
        <div
          className={`${
            mobileView === "novels" ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-64 border-r border-stone-200 bg-white shrink-0`}
        >
          <div className="p-3 border-b border-stone-100">
            {showNewNovel ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newNovelTitle}
                  onChange={(e) => setNewNovelTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createNovel()}
                  placeholder="ชื่อเรื่อง..."
                  className="flex-1 min-w-0 text-sm px-2.5 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <button onClick={createNovel} className="text-sm font-medium bg-amber-700 hover:bg-amber-800 text-white px-3 rounded-md">
                  สร้าง
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewNovel(true)}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-amber-700 hover:bg-amber-800 text-white px-3 py-2.5 rounded-md"
              >
                <Plus className="w-4 h-4" /> เรื่องใหม่
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingIndex && <p className="text-sm text-stone-400 text-center py-8">กำลังโหลด...</p>}
            {!loadingIndex && (novels || []).length === 0 && (
              <p className="text-sm text-stone-400 text-center py-8">ยังไม่มีเรื่อง</p>
            )}
            {(novels || []).map((n) => (
              <div
                key={n.id}
                className={`group flex items-center gap-1 rounded-lg px-3 py-2.5 mb-1 cursor-pointer ${
                  selectedId === n.id ? "bg-amber-50 text-amber-800" : "hover:bg-stone-50 text-stone-700"
                }`}
                onClick={() => {
                  setSelectedId(n.id);
                  setMobileView("list");
                }}
              >
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{n.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNovel(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {loadingNovel && (
          <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">กำลังโหลดเรื่อง...</div>
        )}

        {novel && !loadingNovel && (
          <>
            {/* Chapters / glossary nav */}
            <nav
              className={`${
                mobileView === "list" ? "flex" : "hidden"
              } md:flex flex-col w-full md:w-72 border-r border-stone-200 bg-white shrink-0 overflow-hidden`}
            >
              <div className="flex border-b border-stone-100 shrink-0">
                <button
                  onClick={() => setTab("chapters")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 border-b-2 ${
                    tab === "chapters" ? "border-amber-700 text-amber-800" : "border-transparent text-stone-400"
                  }`}
                >
                  <ListTree className="w-4 h-4" /> บท ({novel.chapters.length})
                </button>
                <button
                  onClick={() => setTab("glossary")}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 border-b-2 ${
                    tab === "glossary" ? "border-amber-700 text-amber-800" : "border-transparent text-stone-400"
                  }`}
                >
                  <Tags className="w-4 h-4" /> คำศัพท์ ({novel.glossary.length})
                </button>
              </div>

              {tab === "chapters" && (
                <>
                  <div className="p-3 flex gap-2 shrink-0">
                    <button
                      onClick={addChapter}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-700 hover:bg-amber-800 text-white px-3 py-2 rounded-md"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มบท
                    </button>
                    <button
                      onClick={copyAllTranslated}
                      disabled={translatedCount === 0}
                      title="คัดลอกคำแปลทั้งหมดของเรื่องนี้"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md"
                    >
                      {copyAllState === "done" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ClipboardCheck className="w-3.5 h-3.5" />
                      )}
                      {copyAllState === "done" ? "คัดลอกแล้ว" : `คัดลอกคำแปล (${translatedCount})`}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 pb-3">
                    {novel.chapters.length === 0 && (
                      <p className="text-sm text-stone-400 text-center py-8">ยังไม่มีบท</p>
                    )}
                    {[...novel.chapters]
                      .sort((a, b) => a.number - b.number)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveChapterId(c.id);
                            setMobileView("editor");
                          }}
                          className={`w-full flex items-center gap-2 text-left rounded-lg px-3 py-2.5 mb-1 ${
                            activeChapterId === c.id ? "bg-amber-50 text-amber-800" : "hover:bg-stone-50 text-stone-700"
                          }`}
                        >
                          <span className="flex-1 min-w-0 truncate text-sm">{c.title}</span>
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              c.status === "done"
                                ? "bg-green-500"
                                : c.status === "translating"
                                ? "bg-amber-500"
                                : c.status === "error"
                                ? "bg-red-500"
                                : "bg-stone-300"
                            }`}
                            title={
                              c.status === "done"
                                ? "แปลแล้ว"
                                : c.status === "translating"
                                ? "กำลังแปล"
                                : c.status === "error"
                                ? "ผิดพลาด"
                                : "ยังไม่แปล"
                            }
                          />
                        </button>
                      ))}
                  </div>
                </>
              )}

              {tab === "glossary" && (
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="text-xs text-stone-500 mb-3 px-1">
                    ชื่อตัวละคร/ศัพท์เฉพาะ ให้แปลสอดคล้องกันทุกบท — ใช้เป็นข้อมูลอ้างอิงทุกครั้งที่แปล
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={addGlossaryTerm}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-md"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มเอง
                    </button>
                    <button
                      onClick={scanNovelGlossary}
                      disabled={glossaryScanState === "scanning" || novel.chapters.length === 0}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md"
                    >
                      {glossaryScanState === "scanning" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {glossaryScanState === "scanning" ? "กำลังสแกน..." : "สแกนอัตโนมัติ"}
                    </button>
                  </div>
                  {novel.glossary.length === 0 && (
                    <p className="text-xs text-stone-400 text-center py-8">ยังไม่มีคำศัพท์ในเรื่องนี้</p>
                  )}
                  <div className="space-y-2">
                    {novel.glossary.map((t) => (
                      <div key={t.id} className="bg-white border border-stone-200 rounded-lg px-3 py-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            value={t.original}
                            onChange={(e) => updateGlossaryTerm(t.id, { original: e.target.value })}
                            placeholder="คำต้นฉบับ"
                            className="flex-1 min-w-0 text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-600"
                          />
                          <button onClick={() => deleteGlossaryTerm(t.id)} className="p-1">
                            <X className="w-3.5 h-3.5 text-stone-300 hover:text-red-500" />
                          </button>
                        </div>
                        <input
                          value={t.translation}
                          onChange={(e) => updateGlossaryTerm(t.id, { translation: e.target.value })}
                          placeholder="คำแปลภาษาไทย"
                          className="w-full text-xs px-2 py-1 border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Editor */}
            <main className={`${mobileView === "editor" ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0`}>
              {tab === "chapters" && !activeChapter && (
                <div className="flex-1 items-center justify-center text-stone-400 text-sm hidden md:flex">
                  เลือกบทจากรายการด้านซ้าย หรือเพิ่มบทใหม่
                </div>
              )}
              {tab === "chapters" && activeChapter && (
                <ChapterEditor
                  chapter={activeChapter}
                  onChange={(patch) => updateChapter(activeChapter.id, patch)}
                  onTranslate={() => translateChapter(activeChapter.id)}
                  onScanGlossary={() => scanChapterGlossary(activeChapter.id)}
                  scanningGlossary={scanningChapterId === activeChapter.id}
                  progress={translateProgress?.chapterId === activeChapter.id ? translateProgress : null}
                  onDelete={() => deleteChapter(activeChapter.id)}
                  onBack={() => setMobileView("list")}
                />
              )}
              {tab === "glossary" && (
                <div className="flex-1 items-center justify-center text-stone-400 text-sm text-center px-8 hidden md:flex">
                  จัดการคำศัพท์ได้จากรายการด้านซ้าย คำเหล่านี้จะถูกใช้ทุกครั้งที่แปลบทในเรื่องนี้
                </div>
              )}
            </main>
          </>
        )}

        {!selectedId && !loadingNovel && (
          <div className="flex-1 items-center justify-center text-stone-400 text-sm hidden md:flex">
            เลือกเรื่องจากรายการด้านซ้าย หรือสร้างเรื่องใหม่
          </div>
        )}
      </div>

      {/* Project settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-stone-100 z-10">
              <h2 className="text-lg font-bold">ตั้งค่าโปรเจกต์</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <SettingsField icon={<Cpu className="w-4 h-4" />} label="AI MODEL">
                <div className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-500">
                  Google Gemini (ผ่าน API key ของคุณเอง)
                </div>
              </SettingsField>

              <SettingsField label="ภาษาต้นฉบับ (SOURCE LANGUAGE)">
                <SelectBox
                  value={settingsDraft.sourceLang}
                  onChange={(v) => setSettingsDraft((s) => ({ ...s, sourceLang: v }))}
                  options={SOURCE_LANGS.map((l) => ({ value: l.code, label: l.label }))}
                />
              </SettingsField>

              <SettingsField label="สไตล์การแปล (TRANSLATION STYLE)">
                <SelectBox
                  value={settingsDraft.style}
                  onChange={(v) => setSettingsDraft((s) => ({ ...s, style: v }))}
                  options={STYLES.map((s) => ({ value: s.id, label: s.label }))}
                />
              </SettingsField>

              <SettingsField label="กฏสรรพนามและบริบทยุคสมัย (PRONOUN RULES)">
                <SelectBox
                  value={settingsDraft.pronounRule}
                  onChange={(v) => setSettingsDraft((s) => ({ ...s, pronounRule: v }))}
                  options={PRONOUN_RULES.map((s) => ({ value: s.id, label: s.label }))}
                />
              </SettingsField>

              <SettingsField label="มุมมองผู้เล่าเรื่องหลัก (NOVEL POV)">
                <SelectBox
                  value={settingsDraft.pov}
                  onChange={(v) => setSettingsDraft((s) => ({ ...s, pov: v }))}
                  options={POVS.map((s) => ({ value: s.id, label: s.label }))}
                />
              </SettingsField>

              <SettingsField label="CUSTOM PROMPT / กฎเพิ่มเติม (OPTIONAL)">
                <textarea
                  value={settingsDraft.customPrompt}
                  onChange={(e) => setSettingsDraft((s) => ({ ...s, customPrompt: e.target.value }))}
                  placeholder={"เช่น\n群演 → ตัวประกอบ\n跑龙套 → ตัวประกอบ"}
                  rows={4}
                  className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                />
              </SettingsField>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-stone-100 p-4 flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 text-sm font-medium border border-stone-200 rounded-md py-2.5 text-stone-600 hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 text-sm font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded-md py-2.5"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsField({ icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 mb-1.5">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function SelectBox({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm px-3 py-2.5 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TranslateProgressCard({ completed, total, elapsedSeconds }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const elapsedMinutes = elapsedSeconds / 60;
  const rpm = completed > 0 && elapsedMinutes > 0 ? completed / elapsedMinutes : 0;
  const rpmDisplay = rpm > 0 ? rpm.toFixed(1) : "—";

  return (
    <div className="mb-4 rounded-2xl border border-stone-200 bg-white shadow-sm p-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800 truncate">กำลังแปล... {percent}%</p>
          <p className="text-xs text-stone-400 truncate">
            [⚡ ความเร็ว: {rpmDisplay} RPM] แปลสำเร็จแล้ว {completed}/{total} ส่วน
          </p>
        </div>
        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
          {percent}%
        </span>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 flex items-center gap-2">
        <Timer className="w-4 h-4 text-stone-400 shrink-0" />
        <span className="text-xs text-stone-400">เวลาที่ใช้</span>
        <span className="text-sm font-bold text-stone-700 ml-auto">
          {elapsedSeconds.toFixed(1)} <span className="text-xs font-normal text-stone-400">วิ</span>
        </span>
      </div>
    </div>
  );
}

function ChapterEditor({ chapter, onChange, onTranslate, onScanGlossary, scanningGlossary, progress, onDelete, onBack }) {
  const [titleDraft, setTitleDraft] = useState(chapter.title);
  const [originalDraft, setOriginalDraft] = useState(chapter.original);
  const [activeTab, setActiveTab] = useState("original");
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!progress) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => setElapsedSeconds((Date.now() - progress.startedAt) / 1000);
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
    // Only re-arm the ticker when a *new* translation run starts, not on every
    // completed-chunk update, so the interval isn't torn down/recreated mid-run.
  }, [progress?.chapterId, progress?.startedAt]);

  useEffect(() => {
    setTitleDraft(chapter.title);
    setOriginalDraft(chapter.original);
    setActiveTab("original");
    setUrlOpen(false);
    setUrlError("");
  }, [chapter.id]);

  const busy = chapter.status === "translating" || scanningGlossary;

  async function handleImportUrl() {
    if (!urlValue.trim()) return;
    setUrlBusy(true);
    setUrlError("");
    try {
      const res = await fetch(urlValue.trim());
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      doc.querySelectorAll("script,style,nav,header,footer").forEach((el) => el.remove());
      const text = (doc.body?.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
      if (text) {
        setOriginalDraft(text);
        onChange({ original: text });
      }
      setUrlOpen(false);
      setUrlValue("");
    } catch {
      setUrlError("ดึงเนื้อหาจากลิงก์นี้ไม่สำเร็จ (อาจติด CORS ของเว็บไซต์ต้นทาง) ลองวางข้อความเองแทน");
    } finally {
      setUrlBusy(false);
    }
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setOriginalDraft(text);
      onChange({ original: text });
      setActiveTab("original");
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function handleCopyTranslation() {
    try {
      await navigator.clipboard.writeText(chapter.translated || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 md:px-6 py-3 border-b border-stone-200 bg-white flex items-center gap-2 md:gap-3 shrink-0">
        <button onClick={onBack} className="md:hidden text-stone-500 p-1 -ml-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => onChange({ title: titleDraft })}
          className="text-base md:text-sm font-medium flex-1 min-w-0 focus:outline-none border-b border-transparent focus:border-amber-400"
        />
        <button onClick={onDelete} className="p-1">
          <Trash2 className="w-4 h-4 text-stone-300 hover:text-red-500" />
        </button>
      </div>

      <div className="border-b border-stone-200 bg-white shrink-0">
        <button
          onClick={() => setUrlOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 md:px-6 py-2.5 text-sm text-stone-600"
        >
          {urlOpen ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
          <Link2 className="w-4 h-4 text-stone-400" />
          <span className="flex-1 text-left text-xs md:text-sm font-medium">ดึงเนื้อหาจากลิงก์ (URL Import)</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="text-xs font-medium text-stone-500 border border-stone-200 rounded-md px-2 py-1 flex items-center gap-1 hover:bg-stone-50"
          >
            <FileText className="w-3.5 h-3.5" /> นำเข้าไฟล์
          </button>
        </button>
        <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFilePick} className="hidden" />
        {urlOpen && (
          <div className="px-4 md:px-6 pb-3 flex gap-2">
            <input
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="วางลิงก์ตอนนิยาย..."
              className="flex-1 min-w-0 text-sm px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <button
              onClick={handleImportUrl}
              disabled={urlBusy || !urlValue.trim()}
              className="text-sm font-medium bg-stone-800 hover:bg-stone-900 disabled:bg-stone-300 text-white px-3 py-2 rounded-md"
            >
              {urlBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ดึงข้อมูล"}
            </button>
          </div>
        )}
        {urlError && <p className="px-4 md:px-6 pb-2 text-xs text-red-600">{urlError}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 flex flex-col">
        {progress && (
          <TranslateProgressCard
            completed={progress.completed}
            total={progress.total}
            elapsedSeconds={elapsedSeconds}
          />
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-stone-100 rounded-full p-1 w-fit">
            <button
              onClick={() => setActiveTab("original")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === "original" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"
              }`}
            >
              ต้นฉบับ
            </button>
            <button
              onClick={() => setActiveTab("translation")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === "translation" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400"
              }`}
            >
              คำแปล
            </button>
          </div>
          {busy && (
            <div className="flex items-center gap-1.5 text-stone-400 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-medium">รอสักครู่</span>
            </div>
          )}
        </div>

        {activeTab === "original" ? (
          <textarea
            value={originalDraft}
            onChange={(e) => setOriginalDraft(e.target.value)}
            onBlur={() => onChange({ original: originalDraft })}
            placeholder="วางข้อความต้นฉบับของบทนี้..."
            className="flex-1 min-h-[220px] md:min-h-[300px] rounded-lg border border-stone-300 bg-white p-4 text-base md:text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-[220px] md:min-h-[300px]">
            {chapter.translated && (
              <div className="flex justify-end mb-1.5">
                <button
                  onClick={handleCopyTranslation}
                  className="flex items-center gap-1 text-xs font-medium text-stone-500 border border-stone-200 rounded-md px-2 py-1 hover:bg-stone-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </button>
              </div>
            )}
            <div className="flex-1 rounded-lg border border-stone-200 bg-white p-4 text-base md:text-sm leading-relaxed overflow-auto whitespace-pre-wrap">
              {chapter.status === "translating" && (
                <div className="flex items-center gap-2 text-stone-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังแปล...
                </div>
              )}
              {chapter.status === "error" && (
                <span className="text-red-600">{chapter.errorMsg || "แปลไม่สำเร็จ ลองใหม่อีกครั้ง"}</span>
              )}
              {chapter.status !== "translating" &&
                chapter.status !== "error" &&
                (chapter.translated || <span className="text-stone-300">คำแปลจะแสดงที่นี่</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 md:px-6 pb-6 flex flex-col md:flex-row justify-center items-stretch md:items-center gap-2 shrink-0">
        <button
          onClick={async () => {
            await onChange({ original: originalDraft });
            onScanGlossary();
          }}
          disabled={busy || !originalDraft.trim()}
          title="ดึงชื่อตัวละคร/ศัพท์เฉพาะจากบทนี้เข้าคลังคำศัพท์ โดยไม่ต้องแปล"
          className="inline-flex items-center justify-center gap-2 border border-stone-200 hover:bg-stone-50 disabled:text-stone-300 disabled:cursor-not-allowed text-stone-600 text-base md:text-sm font-medium px-5 py-3 md:py-2.5 rounded-md transition-colors"
        >
          {scanningGlossary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tags className="w-4 h-4" />}
          {scanningGlossary ? "กำลังสแกน..." : "สแกนคำศัพท์บทนี้"}
        </button>
        <button
          onClick={async () => {
            await onChange({ original: originalDraft });
            onTranslate();
          }}
          disabled={busy || !originalDraft.trim()}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-base md:text-sm font-medium px-6 py-3 md:py-2.5 rounded-md transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {scanningGlossary ? "กำลังสแกนคำศัพท์..." : busy ? "กำลังแปล..." : "แปลบทนี้"}
        </button>
      </div>
    </div>
  );
}
