import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import {
  TextB, TextItalic, ListBullets, ListNumbers,
  Link as LinkIcon, LinkBreak, ArrowUUpLeft, ArrowUUpRight,
} from '@phosphor-icons/react'

interface RichTextEditorProps {
  value?:       string
  placeholder?: string
  onChange?:    (html: string) => void
  minHeight?:   number
}

interface ToolbarButtonProps {
  onClick:    () => void
  active?:    boolean
  disabled?:  boolean
  title:      string
  children:   React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={[
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-sm',
        active
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({
  value       = '',
  placeholder = 'Write something…',
  onChange,
  minHeight   = 120,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'outline-none font-body text-sm text-gray-800 leading-relaxed',
      },
    },
  })

  function addLink() {
    const prev = editor?.getAttributes('link').href ?? ''
    const url  = window.prompt('Enter URL', prev)
    if (!url) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  if (!editor) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <TextB size={14} weight="bold" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <TextItalic size={14} weight="bold" />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <ListBullets size={14} weight="bold" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListNumbers size={14} weight="bold" />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="Add link"
        >
          <LinkIcon size={14} weight="bold" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          title="Remove link"
        >
          <LinkBreak size={14} weight="bold" />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <ArrowUUpLeft size={14} weight="bold" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <ArrowUUpRight size={14} weight="bold" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div className="relative px-3 py-2.5" style={{ minHeight }}>
        {editor.isEmpty && (
          <p className="absolute top-2.5 left-3 font-body text-sm text-gray-300 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
