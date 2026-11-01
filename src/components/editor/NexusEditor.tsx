"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { Note } from "@/types/vault";
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
  Plus,
  FileText,
} from "lucide-react";

interface NexusEditorProps {
  initialContent: string;
  noteTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateContent: (content: string) => void;
  subpages?: Note[];
  onCreateSubpage?: () => void;
  onSelectNote?: (noteId: string) => void;
}

export const NexusEditor: React.FC<NexusEditorProps> = ({
  initialContent,
  noteTitle,
  onUpdateTitle,
  onUpdateContent,
  subpages = [],
  onCreateSubpage,
  onSelectNote,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Write thoughts, record insights, or organize concepts...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-400 hover:text-sky-300 underline underline-offset-2",
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: true,
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "nexus-editor-content focus:outline-none min-h-[450px] text-gray-200 text-sm leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as any).markdown?.getMarkdown();
      onUpdateContent(md || editor.getHTML());
    },
  });

  // Sync editor content if note switches
  useEffect(() => {
    if (editor) {
      const current =
        (editor.storage as any).markdown?.getMarkdown() ?? editor.getHTML();
      if (current !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }
  }, [initialContent, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Loading editor...
      </div>
    );
  }

  // Calculate statistics
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#06080F] text-slate-100 overflow-hidden">
      {/* 1. Formatting Toolbar / Toolbox (Docked at top) */}
      <div className="px-3 sm:px-8 py-2 bg-[#0B0F19]/80 border-b border-slate-800/80 flex items-center gap-1 text-slate-400 text-xs overflow-x-auto no-scrollbar flex-nowrap backdrop-blur-sm">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 1 }) ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 2 }) ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 3 }) ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-1 shrink-0" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("bold") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("italic") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("code") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-1 shrink-0" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("bulletList") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("orderedList") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("taskList") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Task Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-slate-800/60 hover:text-white transition shrink-0 touch-manipulation ${
            editor.isActive("blockquote") ? "text-sky-300 bg-slate-800/90" : ""
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Main Editable Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {/* Main Canonical Title Input - Right Above Body */}
          <div className="mb-4 sm:mb-6">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full text-2xl sm:text-3xl md:text-4xl font-extrabold bg-transparent text-white border-none focus:outline-none placeholder-slate-600 tracking-tight"
            />
          </div>

          <EditorContent editor={editor} />

          {/* 4. Hierarchical Subpages Section */}
          <div className="mt-12 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Subpages ({subpages.length})</span>
              </span>
              {onCreateSubpage && (
                <button
                  onClick={onCreateSubpage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/50 text-xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subpage</span>
                </button>
              )}
            </div>

            {subpages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subpages.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelectNote?.(sub.id)}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0B0F19] hover:bg-[#111827] border border-slate-800/80 hover:border-sky-700/50 text-left transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                        {sub.title}
                      </span>
                    </div>
                    <span className="text-slate-500 group-hover:text-sky-300 text-xs ml-2">
                      →
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No subpages yet. Group related concepts under this note by clicking Add Subpage.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Minimalist Bottom Status Bar */}
      <div className="px-4 sm:px-6 py-2 bg-[#0B0F19] border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <div>
          <span>{wordCount} words</span>
          <span className="mx-2">·</span>
          <span>~{readingTime} min read</span>
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          Astro
        </div>
      </div>
    </div>
  );
};
