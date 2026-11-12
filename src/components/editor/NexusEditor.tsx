"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Folder } from "@/types/vault";
import { sanitizeCorruptedContent } from "@/lib/storage";
import { loadReadingFont, ReadingFont } from "@/lib/preferences";
import { AskAIPanel } from "@/components/editor/AskAIPanel";
import { WriteWithAIPanel } from "@/components/editor/WriteWithAIPanel";
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Sparkles,
  Wand2,
  Undo2,
  Redo2,
  Minus,
  Folder as FolderIcon,
  Clock,
  Hash,
  Plus,
  Check,
  ChevronDown,
} from "lucide-react";

interface NexusEditorProps {
  noteId: string;
  initialContent: string;
  noteTitle: string;
  folderId?: string;
  folders: Folder[];
  tags?: string[];
  updatedAt: number;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateContent: (content: string) => void;
  onMoveToFolder: (folderId: string | undefined) => void;
  currentUserId?: string;
  onOpenAISettings?: () => void;
}

interface MarkdownSerializerStateLike {
  write: (text: string) => void;
  renderContent: (node: ProseMirrorNode) => void;
}

const CustomTaskItem = TaskItem.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerStateLike, node: ProseMirrorNode) {
          const check = node.attrs.checked ? "[x]" : "[ ]";
          state.write(`${check} `);
          state.renderContent(node);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll<HTMLElement>(".task-list-item").forEach((item) => {
              const input = item.querySelector<HTMLInputElement>("input");
              item.setAttribute("data-type", "taskItem");
              if (input) {
                item.setAttribute("data-checked", input.checked ? "true" : "false");
                input.remove();
              }
            });

            element.querySelectorAll<HTMLElement>("li").forEach((li) => {
              if (li.getAttribute("data-type") === "taskItem") return;
              const text = li.textContent?.trim() || "";
              const match = text.match(/^\[([ xX])\](?:\s*(.*))?$/);
              if (match) {
                li.setAttribute("data-type", "taskItem");
                li.setAttribute("data-checked", match[1].toLowerCase() === "x" ? "true" : "false");
                const remainingText = match[2] || "";
                li.innerHTML = `<p>${remainingText}</p>`;
              }
            });

            element.querySelectorAll<HTMLElement>('li[data-type="taskItem"]').forEach((li) => {
              const parent = li.parentElement;
              if (parent && parent.tagName === "UL") {
                parent.setAttribute("data-type", "taskList");
              }
            });
          },
        },
      },
    };
  },
});

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    link: {
      openOnClick: false,
      HTMLAttributes: {
        class: "text-sky-400 hover:text-sky-300 underline underline-offset-2",
      },
    },
  }),
  Placeholder.configure({
    placeholder: "Write thoughts, record insights, or organize concepts...",
  }),
  TaskList,
  CustomTaskItem.configure({
    nested: true,
  }),
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: "-",
    linkify: true,
    breaks: true,
  }),
];

const EDITOR_PROPS = {
  attributes: {
    class:
      "nexus-editor-content focus:outline-none min-h-[220px] sm:min-h-[380px] text-gray-200 text-base sm:text-[17px] leading-relaxed",
  },
};

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Just now";
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const NexusEditor: React.FC<NexusEditorProps> = ({
  noteId,
  initialContent,
  noteTitle,
  folderId,
  folders,
  tags = [],
  updatedAt,
  onUpdateTitle,
  onUpdateContent,
  onMoveToFolder,
  currentUserId,
  onOpenAISettings,
}) => {
  const lastEmittedMarkdownRef = useRef<string>(sanitizeCorruptedContent(initialContent));
  const currentNoteIdRef = useRef<string>(noteId);
  const [activeAIPanel, setActiveAIPanel] = useState<"ask" | "write" | null>(null);
  const [readingFont, setReadingFont] = useState<ReadingFont>(() => loadReadingFont());

  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const folderPickerRef = useRef<HTMLDivElement | null>(null);

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleFontChange = (e: Event) => {
      const customEvent = e as CustomEvent<ReadingFont>;
      if (customEvent.detail) {
        setReadingFont(customEvent.detail);
      }
    };
    window.addEventListener("astro_pref_font_changed", handleFontChange);
    return () => window.removeEventListener("astro_pref_font_changed", handleFontChange);
  }, []);

  useEffect(() => {
    if (!isFolderPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setIsFolderPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFolderPickerOpen]);

  useEffect(() => {
    if (isAddingTag) {
      tagInputRef.current?.focus();
    }
  }, [isAddingTag]);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: sanitizeCorruptedContent(initialContent),
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: EDITOR_PROPS,
    onUpdate: ({ editor }) => {
      const storage = editor.storage as unknown as {
        markdown?: { getMarkdown: () => string };
      };
      const md = storage.markdown?.getMarkdown() ?? "";
      lastEmittedMarkdownRef.current = md;
      onUpdateContent(md);
    },
  });

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    const sanitized = sanitizeCorruptedContent(initialContent);

    if (currentNoteIdRef.current !== noteId) {
      currentNoteIdRef.current = noteId;
      lastEmittedMarkdownRef.current = sanitized;
      editor.commands.setContent(sanitized, { emitUpdate: false });
      try {
        const cleanState = EditorState.create({
          schema: editor.state.schema,
          doc: editor.state.doc,
          plugins: editor.state.plugins,
        });
        editor.view.updateState(cleanState);
      } catch (err) {
        console.warn("Could not reset history state:", err);
      }
      return;
    }

    const storage = editor.storage as unknown as {
      markdown?: { getMarkdown: () => string };
    };
    const currentMd = storage.markdown?.getMarkdown() ?? "";

    if (sanitized !== lastEmittedMarkdownRef.current && sanitized !== currentMd) {
      lastEmittedMarkdownRef.current = sanitized;
      editor.commands.setContent(sanitized, { emitUpdate: false });
    }
  }, [noteId, initialContent, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-base">
        Loading editor...
      </div>
    );
  }

  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const currentFolder = folders.find((f) => f.id === folderId);

  const handleApproveDraft = (draftMarkdown: string) => {
    const trimmed = draftMarkdown.trim();
    if (!trimmed) return;

    const currentDocText = editor.getText().trim();
    if (!currentDocText) {
      editor.commands.setContent(trimmed);
    } else {
      editor.chain().focus().insertContent(`\n\n${trimmed}\n`).run();
    }

    const storage = editor.storage as unknown as {
      markdown?: { getMarkdown: () => string };
    };
    const md = storage.markdown?.getMarkdown() ?? "";
    lastEmittedMarkdownRef.current = md;
    onUpdateContent(md);

    setActiveAIPanel(null);
  };

  const handleAddTag = () => {
    const cleaned = newTagInput
      .trim()
      .replace(/^#+/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();
    if (cleaned && !tags.includes(cleaned)) {
      const currentText = editor.getText().trim();
      const prefix = currentText ? "\n\n" : "";
      editor.chain().focus("end").insertContent(`${prefix}#${cleaned} `).run();
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full bg-[#06080F] text-slate-100 overflow-hidden relative">
      {/* 1. Main Editable Canvas */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-28 ${
          readingFont === "serif" ? "font-reading-serif" : ""
        }`}
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-10 pt-7 sm:pt-10 pb-8">
          {/* Canonical Title Input */}
          <div className="mb-3">
            <input
              ref={titleInputRef}
              type="text"
              value={noteTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor.commands.focus("start");
                }
              }}
              placeholder="Untitled Note"
              className="w-full text-3xl sm:text-4xl md:text-[2.6rem] font-extrabold bg-transparent text-white border-none focus:outline-none placeholder-slate-600 tracking-tight leading-tight"
            />
          </div>

          {/* Subtle Metadata & Context Bar */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-4 mb-6 border-b border-slate-800/70 text-xs text-slate-400">
            {/* Folder Picker Pill */}
            <div className="relative" ref={folderPickerRef}>
              <button
                type="button"
                onClick={() => setIsFolderPickerOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#111827] border border-slate-800/90 hover:border-slate-700 text-slate-300 transition"
                title="Change folder"
              >
                <FolderIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="max-w-[140px] truncate font-medium">
                  {currentFolder ? currentFolder.name : "Unfiled"}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isFolderPickerOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-48 p-1.5 bg-[#0B0F19]/98 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl z-30 text-xs animate-pop-in">
                  <button
                    type="button"
                    onClick={() => {
                      onMoveToFolder(undefined);
                      setIsFolderPickerOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#162032] text-slate-300 text-left"
                  >
                    <span>Unfiled</span>
                    {!folderId && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        onMoveToFolder(folder.id);
                        setIsFolderPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#162032] text-slate-300 text-left"
                    >
                      <span className="truncate">{folder.name}</span>
                      {folderId === folder.id && (
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Last Edited */}
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Edited {formatRelativeTime(updatedAt)}</span>
            </span>

            {/* Word Count & Read Time */}
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              {wordCount} {wordCount === 1 ? "word" : "words"} · ~{readingTime} min read
            </span>

            {/* Extracted Tags + Quick Add */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-950/50 border border-sky-800/50 text-sky-300 text-[11px] font-medium"
                >
                  <Hash className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </span>
              ))}

              {isAddingTag ? (
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    } else if (e.key === "Escape") {
                      setIsAddingTag(false);
                      setNewTagInput("");
                    }
                  }}
                  onBlur={handleAddTag}
                  placeholder="tag..."
                  className="w-20 px-2 py-0.5 rounded-full bg-[#0B0F19] border border-sky-500/70 text-[11px] text-white focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0B0F19] hover:bg-[#111827] border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition"
                  title="Add #tag to note"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Tag</span>
                </button>
              )}
            </div>
          </div>

          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Floating AI Panels */}
      {activeAIPanel === "ask" && (
        <AskAIPanel
          key={noteId}
          noteId={noteId}
          noteTitle={noteTitle}
          getCurrentContent={() => lastEmittedMarkdownRef.current}
          currentUserId={currentUserId}
          onClose={() => setActiveAIPanel(null)}
          onOpenSettings={onOpenAISettings}
        />
      )}

      {activeAIPanel === "write" && (
        <WriteWithAIPanel
          noteTitle={noteTitle}
          getCurrentContent={() => lastEmittedMarkdownRef.current}
          currentUserId={currentUserId}
          onApprove={handleApproveDraft}
          onDecline={() => setActiveAIPanel(null)}
          onOpenSettings={onOpenAISettings}
        />
      )}

      {/* 2. Floating Centered Pill Dock */}
      <div className="shrink-0 z-20 sm:absolute sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto sm:max-w-[calc(100%-2rem)]">
        <div className="px-2.5 sm:px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-1.5 bg-[#0E1525]/95 backdrop-blur-xl border-t sm:border border-slate-700/80 sm:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)] sm:shadow-[0_12px_36px_rgba(0,0,0,0.75)] flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar text-slate-200">
          {/* 1-Click Direct AI Buttons */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveAIPanel((prev) => (prev === "ask" ? null : "ask"))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 touch-manipulation border ${
              activeAIPanel === "ask"
                ? "text-sky-100 bg-sky-900/80 border-sky-500/80 shadow-xs"
                : "text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/50 border-sky-800/50"
            }`}
            title="Ask AI about this note"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Ask AI</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveAIPanel((prev) => (prev === "write" ? null : "write"))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 touch-manipulation border ${
              activeAIPanel === "write"
                ? "text-indigo-100 bg-indigo-900/80 border-indigo-500/80 shadow-xs"
                : "text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-900/50 border-indigo-800/50"
            }`}
            title="Draft or expand with AI"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Write</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Undo / Redo */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition shrink-0 touch-manipulation"
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition shrink-0 touch-manipulation"
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Headings */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 1 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 2 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 3 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Inline Styles */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bold")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("italic")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("code")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Lists & Blocks */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bulletList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("orderedList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("taskList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Task Checklist"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("blockquote")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60"
                : "text-slate-300 border border-transparent"
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition shrink-0 touch-manipulation border border-transparent"
            title="Divider"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
