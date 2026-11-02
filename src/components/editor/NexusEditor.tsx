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
          "nexus-editor-content focus:outline-none min-h-[500px] text-gray-200 text-base sm:text-[17px] leading-relaxed",
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
    <div className="flex-1 flex flex-col h-full bg-[#06080F] text-slate-100 overflow-hidden">
      {/* 1. Main Editable Canvas (Title and Body now clean at the top) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
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
      <div className="px-4 sm:px-8 py-2.5 bg-[#0B0F19]/95 border-t border-slate-800/80 flex items-center justify-between gap-3 text-slate-300 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 1 })
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 2 })
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("heading", { level: 3 })
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4.5 h-4.5" />
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-1.5 shrink-0" />

          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bold")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Bold"
          >
            <Bold className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("italic")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Italic"
          >
            <Italic className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("code")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Inline Code"
          >
            <Code className="w-4.5 h-4.5" />
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-1.5 shrink-0" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("bulletList")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Bullet List"
          >
            <List className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("orderedList")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("taskList")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Task Checklist"
          >
            <CheckSquare className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2.5 sm:p-2 rounded-lg hover:bg-slate-800 hover:text-white transition shrink-0 touch-manipulation ${
              editor.isActive("blockquote")
                ? "text-sky-300 bg-slate-800/90 shadow-xs"
                : "text-slate-400"
            }`}
            title="Blockquote"
          >
            <Quote className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Word Count & Read Time Summary */}
        <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-slate-400 shrink-0 font-medium pl-3 border-l border-slate-800">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>~{readingTime} min read</span>
        </div>
      </div>
    </div>
  );
};

