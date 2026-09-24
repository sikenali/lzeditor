import React, { useState } from 'react'
import { UnifiedDialog } from '../ui/UnifiedDialog'
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'

// Return local paths for Apple-style emoji instead of CDN URLs
const getLocalEmojiUrl = (unified: string, emojiStyle?: 'apple' | 'facebook' | 'twitter' | 'google' | 'native') => {
  if (!emojiStyle || emojiStyle === 'apple') return `/emoji/apple-15.1/64/${unified}.png`
  return `/emoji/apple-15.1/64/${unified}.png`
}

export const EmojiDialog: React.FC<{ onClose: () => void; onInsert: (text: string) => void }> = ({ onClose, onInsert }) => {
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT)

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onInsert(emojiData.emoji)
    onClose()
  }

  return (
    <UnifiedDialog
      onClose={onClose}
      icon="ri-emotion-happy-fill"
      title="表情符号"
      subtitle="选择表情插入到文档中"
      size="lg"
      rightContent={(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 主题切换 - 与插入图片标签样式一致 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`ud-btn${theme === Theme.LIGHT ? ' ud-btn--primary' : ''}`}
              onClick={() => setTheme(Theme.LIGHT)}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-sun-line" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>浅色</span>
            </button>
            <button
              className={`ud-btn${theme === Theme.DARK ? ' ud-btn--primary' : ''}`}
              onClick={() => setTheme(Theme.DARK)}
              style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 4, padding: '12px 8px' }}
            >
              <span className="remix ri-moon-line" style={{ fontSize: 18 }}></span>
              <span style={{ fontSize: 12 }}>深色</span>
            </button>
          </div>

          {/* Emoji 选择器 - Apple 风格，图片来自本地 */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', maxHeight: 380, minHeight: 320 }}>
            <EmojiPicker
              width="100%"
              height={380}
              emojiStyle={EmojiStyle.APPLE}
              getEmojiUrl={getLocalEmojiUrl}
              lazyLoadEmojis
              onEmojiClick={handleEmojiClick}
              previewConfig={{ showPreview: false }}
              theme={theme}
              autoFocusSearch={false}
              skinTonesDisabled={true}
            />
          </div>
        </div>
      )}
      hint="点击表情即可插入到当前光标位置"
    />
  )
}
