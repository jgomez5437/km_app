"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { BacklinkItem } from "@/types/vault";
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
  incomingBacklinks?: BacklinkItem[];
}

export const NexusEditor: React.FC<NexusEditorProps> = ({
  initialContent,
  noteTitle,
  onUpdateTitle,
  onUpdateContent,
  onOpenWikilink,
  incomingBacklinks = [],
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
          "nexus-editor-content focus:outline-none min-h-[500px] text-gray-200 text-sm leading-relaxed p-4 sm:p-6",
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
      <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-2 border-b border-gray-800/80">
        <input
          type="text"
          value={noteTitle}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Note Title..."
          className="w-full text-xl sm:text-2xl font-bold bg-transparent text-white border-none focus:outline-none placeholder-gray-600 tracking-tight"
        />
      </div>

      {/* Touch-Friendly Horizontally Scrollable Formatting Toolbar */}
      <div className="px-3 sm:px-8 py-2 bg-[#161b22]/70 border-b border-gray-800/60 flex items-center gap-1 text-gray-400 text-xs overflow-x-auto no-scrollbar flex-nowrap">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 1 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 2 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("heading", { level: 3 }) ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1 shrink-0" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("bold") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("italic") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("code") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1 shrink-0" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("bulletList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("orderedList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("taskList") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Task Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 sm:p-1.5 rounded-md hover:bg-gray-800 transition shrink-0 touch-manipulation ${
            editor.isActive("blockquote") ? "text-purple-400 bg-gray-800" : ""
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1 shrink-0" />

        {/* Wikilink action */}
        <button
          onClick={insertWikilink}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-900/30 text-purple-300 hover:bg-purple-900/50 transition border border-purple-800/40 shrink-0 touch-manipulation"
          title="Insert [[Link]]"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">[[link]]</span>
        </button>
      </div>

      {/* Main Editable Canvas */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <EditorContent editor={editor} />

          {/* Clean Document-Level Linked Notes (Minimalist Backlinks) */}
          {incomingBacklinks.length > 0 && (
            <div className="mt-12 pt-6 border-t border-gray-800/80">
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-2.5">
                Linked from {incomingBacklinks.length} {incomingBacklinks.length === 1 ? "note" : "notes"}:
              </span>
              <div className="flex flex-wrap gap-2">
                {incomingBacklinks.map((bl) => (
                  <button
                    key={bl.noteId}
                    onClick={() => onOpenWikilink?.(bl.noteTitle)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-purple-950/40 text-purple-300 hover:text-purple-200 border border-gray-800 hover:border-purple-800/50 text-xs transition active:scale-95"
                  >
                    <span className="text-gray-500 text-[10px]">↗</span>
                    <span>[[{bl.noteTitle}]]</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Minimalist Bottom Status Bar (No Jargon) */}
      <div className="px-4 sm:px-6 py-2 bg-[#161b22] border-t border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
        <div>
          <span>{wordCount} words</span>
          <span className="mx-2">·</span>
          <span>~{readingTime} min read</span>
        </div>
        <div className="text-[11px] text-gray-500">
          Nexus
        </div>
      </div>
    </div>
  );
};

