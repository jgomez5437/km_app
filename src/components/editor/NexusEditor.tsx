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
  Link as LinkIcon,
  Sparkles,
  FileText,
} from "lucide-react";

interface NexusEditorProps {
  initialContent: string;
  noteTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onUpdateContent: (content: string) => void;
  onOpenWikilink?: (targetTitle: string) => void;
}

export const NexusEditor: React.FC<NexusEditorProps> = ({
  initialContent,
  noteTitle,
  onUpdateTitle,
  onUpdateContent,
  onOpenWikilink,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Write thoughts, record insights, or type [[ to link another note...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-purple-400 hover:text-purple-300 underline underline-offset-2",
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
          "nexus-editor-content focus:outline-none min-h-[500px] text-gray-200 text-sm leading-relaxed p-6",
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
        Loading editor engine...
      </div>
    );
  }

  // Calculate statistics
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200);

  const insertWikilink = () => {
    const target = prompt("Enter target note title to link:");
    if (target) {
      editor
        .chain()
        .focus()
        .insertContent(`[[${target.trim()}]] `)
        .run();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] text-gray-100 overflow-hidden">
      {/* Note Header / Title Bar */}
      <div className="px-8 pt-6 pb-2 border-b border-gray-800/80">
        <input
          type="text"
          value={noteTitle}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Note Title..."
          className="w-full text-2xl font-bold bg-transparent text-white border-none focus:outline-none placeholder-gray-600 tracking-tight"
        />
      </div>

      {/* Editor Formatting Toolbar */}
      <div className="px-8 py-2 bg-[#161b22]/50 border-b border-gray-800/60 flex flex-wrap items-center gap-1 text-gray-400 text-xs">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("heading", { level: 1 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("heading", { level: 2 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("heading", { level: 3 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("bold") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("italic") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("code") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("bulletList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("orderedList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("taskList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Task Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-gray-800 transition ${
            editor.isActive("blockquote") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1" />

        {/* Wikilink action */}
        <button
          onClick={insertWikilink}
          className="flex items-center gap-1 px-2 py-1 rounded bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 transition border border-purple-800/40"
          title="Insert [[Wikilink]]"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">[[link]]</span>
        </button>
      </div>

      {/* Main Editable Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto py-4">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Bottom Editor Status Bar */}
      <div className="px-6 py-1.5 bg-[#161b22] border-t border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span>~{readingTime} min read</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-gray-400">Local-First CRDT Active</span>
        </div>
      </div>
    </div>
  );
};
