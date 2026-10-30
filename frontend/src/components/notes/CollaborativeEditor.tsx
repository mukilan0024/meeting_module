"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  CheckSquare, AlignLeft, AlignCenter, AlignRight, Heading1,
  Heading2, Heading3, Quote, Underline as UnderlineIcon,
  Save, Loader2, Wifi, WifiOff,
} from "lucide-react";
import { notesApi } from "@/lib/api";
import type { NoteType } from "@/lib/types";
import { cn, getCursorColor } from "@/lib/utils";
import { toast } from "sonner";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:1234";

interface CollaborativeEditorProps {
  meetingId: string;
  noteType: NoteType;
  isLocked?: boolean;
}

export function CollaborativeEditor({ meetingId, noteType, isLocked = false }: CollaborativeEditorProps) {
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteVersion, setNoteVersion] = useState(1);

  // Synchronously initialize Yjs Doc and WebsocketProvider
  const { ydoc, provider } = useMemo(() => {
    if (typeof window === "undefined") {
      return { ydoc: null, provider: null };
    }
    const doc = new Y.Doc();
    const prov = new WebsocketProvider(WS_URL, `meeting-${meetingId}-${noteType}`, doc);
    return { ydoc: doc, provider: prov };
  }, [meetingId, noteType]);

  // Handle connection events and awareness lifecycle
  useEffect(() => {
    if (!provider || !ydoc) return;

    const handleStatus = ({ status }: { status: string }) => {
      setConnected(status === "connected");
    };
    provider.on("status", handleStatus);

    const handleAwareness = () => {
      setConnectedUsers(provider.awareness.getStates().size);
    };
    provider.awareness.on("change", handleAwareness);

    // Set local awareness state
    provider.awareness.setLocalState({
      user: { name: "Mukilan J", color: getCursorColor(0) },
    });

    return () => {
      provider.off("status", handleStatus);
      provider.awareness.off("change", handleAwareness);
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  // Bootstrap the note record in the DB
  useEffect(() => {
    notesApi
      .getOrCreate({ meeting_id: meetingId, note_type: noteType, created_by: "user_001", last_edited_by: "user_001" })
      .then((note) => {
        setNoteId(note.id);
        setNoteVersion(note.version);
      })
      .catch(() => toast.error("Failed to initialise note"));
  }, [meetingId, noteType]);

  const editor = useEditor(
    {
      editable: !isLocked,
      extensions: [
        StarterKit.configure({ history: false }),
        ...(ydoc ? [Collaboration.configure({ document: ydoc })] : []),
        ...(provider
          ? [
              CollaborationCursor.configure({
                provider,
                user: { name: "Mukilan J", color: getCursorColor(0) },
              }),
            ]
          : []),
        Placeholder.configure({
          placeholder: isLocked
            ? "Meeting notes are locked after MoM approval."
            : "Type live notes, decisions, and discussions here…",
        }),
        Highlight.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      editorProps: {
        attributes: { class: "tiptap-editor min-h-[450px] p-2 focus:outline-none" },
      },
    },
    [ydoc, provider, isLocked]
  );

  const handleSave = async () => {
    if (!editor || !noteId || isLocked) return;
    setSaving(true);
    try {
      const updated = await notesApi.update(noteId, {
        content_json: editor.getJSON() as Record<string, unknown>,
        content_html: editor.getHTML(),
        content_text: editor.getText(),
        last_edited_by: "user_001",
        version: noteVersion,
      });
      setNoteVersion(updated.version);
      toast.success("Notes saved successfully");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error("Version conflict — another user saved first. Please refresh.");
      } else {
        toast.error("Failed to save notes");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* DSM Editor Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-200 flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarGroup>
            <ToolbarBtn active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
              <Bold className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
              <Italic className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">
              <UnderlineIcon className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough">
              <Strikethrough className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()} title="Inline Code">
              <Code className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
          </ToolbarGroup>

          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          <ToolbarGroup>
            <ToolbarBtn active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
              <Heading1 className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
              <Heading2 className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
              <Heading3 className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
          </ToolbarGroup>

          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          <ToolbarGroup>
            <ToolbarBtn active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet List">
              <List className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered List">
              <ListOrdered className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("taskList")} onClick={() => editor?.chain().focus().toggleTaskList().run()} title="Checklist">
              <CheckSquare className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">
              <Quote className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
          </ToolbarGroup>

          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          <ToolbarGroup>
            <ToolbarBtn active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="Align Left">
              <AlignLeft className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="Align Center">
              <AlignCenter className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="Align Right">
              <AlignRight className="w-4 h-4 stroke-[1.5]" />
            </ToolbarBtn>
          </ToolbarGroup>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Lock indicator */}
          {isLocked && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shadow-2xs">
              <span>Locked (MoM Approved)</span>
            </div>
          )}

          {/* Connection status */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs",
              connected
                ? "bg-[#E8F7F0] text-[#177042] border-[#249E5E]/25"
                : "bg-gray-100 text-gray-600 border-gray-200"
            )}
          >
            {connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <Wifi className="w-3.5 h-3.5 stroke-[1.75] text-[#177042]" />
                <span>{connectedUsers} Live Collab</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Save button */}
          <button
            id="save-notes-btn"
            onClick={handleSave}
            disabled={saving || isLocked}
            className="btn-dsm-primary flex items-center gap-1.5 text-xs px-3.5 shadow-sm disabled:opacity-50"
            aria-label="Save Note"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 stroke-[1.75]" />}
            <span>{saving ? "Saving…" : isLocked ? "Locked" : "Save Note"}</span>
          </button>
        </div>
      </div>

      {/* Editor document sheet */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F9FAFB]">
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10 min-h-[500px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Toolbar helpers
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1">{children}</div>;
}

function ToolbarBtn({ children, active, onClick, title }: {
  children: React.ReactNode; active?: boolean; onClick: () => void; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
        active
          ? "bg-[#E8F7F0] text-[#177042] font-semibold border border-[#249E5E]/30 shadow-2xs"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
      )}
    >
      {children}
    </button>
  );
}
