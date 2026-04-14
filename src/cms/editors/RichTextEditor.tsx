import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon, Check, X } from 'lucide-react'

interface RichTextEditorProps {
  content: unknown
  onChange: (json: unknown) => void
  placeholder?: string
  onImageInsert?: () => void
}

interface ToolBtnProps {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title: string
}

function ToolBtn({ onClick, active, children, title }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'}`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ content, onChange, placeholder, onImageInsert }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? 'Write something…' }),
    ],
    content: (content as object) ?? {},
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  const [linkInputOpen, setLinkInputOpen] = useState(false)
  const [linkInputValue, setLinkInputValue] = useState('')

  if (!editor) return null

  const openLinkDialog = () => {
    setLinkInputValue(editor.getAttributes('link').href ?? '')
    setLinkInputOpen(true)
  }

  const confirmLink = () => {
    if (linkInputValue.trim()) {
      editor.chain().focus().setLink({ href: linkInputValue.trim() }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setLinkInputOpen(false)
    setLinkInputValue('')
  }

  const cancelLink = () => {
    setLinkInputOpen(false)
    setLinkInputValue('')
  }

  return (
    <div className="border border-zinc-700 rounded overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-card border-b border-zinc-700">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered size={15} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote size={15} />
        </ToolBtn>
        <ToolBtn onClick={openLinkDialog} active={editor.isActive('link')} title="Link">
          <LinkIcon size={15} />
        </ToolBtn>
        {onImageInsert && (
          <ToolBtn onClick={onImageInsert} title="Insert Image">
            <ImageIcon size={15} />
          </ToolBtn>
        )}
      </div>

      {linkInputOpen && (
        <div className="flex items-center gap-2 p-2 bg-zinc-800 border-b border-zinc-700">
          <input
            type="url"
            value={linkInputValue}
            onChange={e => setLinkInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmLink() } if (e.key === 'Escape') cancelLink() }}
            placeholder="https://…"
            autoFocus
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            aria-label="Link URL"
          />
          <button type="button" onClick={confirmLink} className="text-green-400 hover:text-green-300 p-1" aria-label="Confirm link">
            <Check size={14} />
          </button>
          <button type="button" onClick={cancelLink} className="text-zinc-400 hover:text-zinc-300 p-1" aria-label="Cancel link">
            <X size={14} />
          </button>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-invert prose-sm max-w-none p-3 bg-zinc-950 text-zinc-100 min-h-[200px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-zinc-600 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left"
      />
    </div>
  )
}
