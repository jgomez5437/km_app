"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
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
} from "lucide-react";

interface NexusEditorProps {
  initialContent: string;
  noteTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateContent: (content: string) => void;
}

export const NexusEditor: React.FC<NexusEditorProps> = ({
  initialContent,
  noteTitle,
  onUpdateTitle,
  onUpdateContent,
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
        html: false,
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
          "nexus-editor-content focus:outline-none min-h-[200px] sm:min-h-[380px] text-gray-200 text-base sm:text-[17px] leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const storage = editor.storage as unknown as {
        markdown?: { getMarkdown: () => string };
      };
      const md = storage.markdown?.getMarkdown();
      onUpdateContent(md || editor.getHTML());
    },
  });

  // Sync editor content if note switches
  useEffect(() => {
    if (editor) {
      const storage = editor.storage as unknown as {
        markdown?: { getMarkdown: () => string };
      };
      const current = storage.markdown?.getMarkdown() ?? editor.getHTML();
      if (current !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }
  }, [initialContent, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-base">
        Loading editor...
      </div>
    );
  }

  // Calculate statistics
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full bg-[#06080F] text-slate-100 overflow-hidden relative">
      {/* 1. Main Editable Canvas (Title and Body now clean at the top) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-5 sm:px-10 py-7 sm:py-10">
          {/* Main Canonical Title Input */}
          <div className="mb-6 sm:mb-8">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => onUpdateTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full text-3xl sm:text-4xl md:text-5xl font-extrabold bg-transparent text-white border-none focus:outline-none placeholder-slate-600 tracking-tight"
            />
          </div>

          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 2. Formatting Toolbar Docked at the Bottom */}
      <div className="fixed bottom-0 inset-x-0 md:static shrink-0 z-20 px-3 sm:px-8 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0E1525]/95 backdrop-blur-md border-t border-slate-700/90 shadow-[0_-8px_24px_rgba(0,0,0,0.65)] flex items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 1 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 2 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 3 })
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700 mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bold")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Bold"
          >
            <Bold className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("italic")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Italic"
          >
            <Italic className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("code")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Inline Code"
          >
            <Code className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-5 bg-slate-700 mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bulletList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Bullet List"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("orderedList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("taskList")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Task Checklist"
          >
            <CheckSquare className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("blockquote")
                ? "text-sky-300 bg-sky-950/80 border border-sky-700/60 shadow-xs"
                : "text-slate-200"
            }`}
            title="Blockquote"
          >
            <Quote className="w-5 h-5" />
          </button>
        </div>

        {/* Word Count & Read Time Summary */}
        <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-300 shrink-0 font-medium pl-3 border-l border-slate-700">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>~{readingTime} min read</span>
        </div>
      </div>
    </div>
  );
};

