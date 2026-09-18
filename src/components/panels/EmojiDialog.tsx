import React, { useState, useRef, useEffect } from 'react'

interface EmojiDialogProps {
  onClose: () => void
  onInsert: (text: string) => void
}

const EMOJI_CATEGORIES = [
  { id: 'smiley', label: '表情', icon: '😀' },
  { id: 'gesture', label: '手势', icon: '👍' },
  { id: 'heart', label: '情感', icon: '❤️' },
  { id: 'animal', label: '动物', icon: '🐱' },
  { id: 'food', label: '食物', icon: '🍎' },
  { id: 'travel', label: '旅行', icon: '✈️' },
  { id: 'activity', label: '运动', icon: '⚽' },
  { id: 'object', label: '物品', icon: '💡' },
  { id: 'symbol', label: '符号', icon: '⭐' },
  { id: 'flag', label: '旗帜', icon: '🏁' },
] as const

const EMOJI_DATA: Record<string, string[]> = {
  smiley: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  gesture: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✌️','🤞','🫰','🤟','🤘','👌','🤌','🤏','👈','👉','👆','🖕','👇','☝️','🫵','👋','🤚','🖐️','🖖','🫱','🫲','🫳','🫴','👌','🤏'],
  heart: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','💌','💋'],
  animal: ['🐱','🐶','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐒','🦍','🦧','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔'],
  food: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍛','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🍏','🍐'],
  travel: ['✈️','🚀','🛸','🚁','🛶','⛵','🚢','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏗️','🏘️','🏙️','🏚️','🌃','🏙️','🌆','🌇','🌉','♨️','🎠','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧'],
  activity: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚴','🚵','🎖️','🏆','🥇','🥈','🥉','🏅','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩'],
  object: ['💡','🔦','🕯️','🧯','🗑️','🪣','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','� broom','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🪥','🪒','🧽','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','🎗️','🎟️','🎫','🎖️','🏆','🏅','🥇','🥈','🥉','⚽','⚾','🥎','🏀','🏐','🏈','🏉','🎾','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘'],
  symbol: ['⭐','🌟','✨','💫','🔥','💥','☄️','💢','💦','💨','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌊','💧','💎','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','✓','✅','✔️','❌','❎','➕','➖','➗','✖️','💲','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','🈁','🈂️','🈷️','🈶','🈯','🉐','㊙️','🈺','🈵','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','◾','◽','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲','○','●','◎','◆','◇','△','▽'],
  flag: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇨🇳','🇺🇸','🇯🇵','🇰🇷','🇬🇧','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇷🇺','🇧🇷','🇮🇳','🇦🇺','🇨🇦','🇲🇽','🇧🇯','🇰🇪','🇳🇬','🇿🇦','🇪🇬','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇹🇼','🇭🇰','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇻🇪','🇵🇹','🇳🇱','🇧🇪','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇦🇹','🇨🇭','🇬🇷','🇺🇦','🇷🇴','🇭🇺','🇮🇷','🇵🇰','🇧🇩','🇱🇰','🇳🇵','🇲🇲','🇰🇭','🇱🇦','🇲🇳','🇻🇪','🇿🇦','🇪🇹','🇲🇦','🇹🇳','🇩🇿','🇸🇳','🇬🇭','🇨🇲','🇨🇮','🇹🇿','🇰🇪','🇿🇲','🇲🇿','🇦🇴','🇳🇦','🇧🇼','🇿🇼','🇧🇧','🇯🇲','🇹🇹','🇨🇺','🇩🇴','🇵🇦','🇨🇷','🇬🇹','🇧🇪'],
}

// Add missing remixicon class names for use in preview
const REMIX_ICONS = [
  'ri-heart-fill','ri-star-fill','ri-emotion-fill','ri-rocket-fill','ri-fire-fill',
  'ri-sun-fill','ri-moon-fill','ri-thunderstorms-fill','ri-snowflake-fill',
  'ri-planet-fill','ri comet-fill','ri-sparkling-fill','ri-gift-fill','ri-cake-fill',
  'ri-trophy-fill','ri-medal-fill','ri-diamond-fill','ri-crown-fill','ri-shield-fill',
  'ri-home-fill','ri-car-fill','ri-plane-fill','ri-ship-fill','ri-bus-fill','ri-train-fill',
  'ri-camera-fill','ri-music-fill','ri-gamepad-fill','ri-movie-fill','ri-book-fill',
  'ri-global-fill','ri-weather-fill','ri-tools-fill','ri-compass-fill','ri-map-fill',
  'ri-send-fill','ri-chat-fill','ri-user-fill','ri-group-fill','ri-settings-fill',
  'ri-like-fill','ri-dislike-fill','ri-share-fill','ri-download-fill','ri-upload-fill',
  'ri-add-fill','ri-delete-fill','ri-edit-fill','ri-search-fill','ri-zoom-in-fill',
  'ri-zoom-out-fill','ri-refresh-fill','ri-history-fill','ri-time-fill','ri-calendar-fill',
  'ri-alarm-fill','ri-bell-fill','ri-lock-fill','ri-unlock-fill','ri-eye-fill','ri-eye-off-fill',
  'ri-mic-fill','ri-volume-fill','ri-volume-mute-fill','ri-power-fill','ri-plug-fill',
  'ri-terminal-fill','ri-code-fill','ri-file-fill','ri-folder-fill','ri-database-fill',
  'ri-app-fill','ri-game-fill','ri-art-fill','ri-palette-fill','ri-brush-fill',
  'ri-pen-fill','ri-pencil-fill','ri-ruler-fill','ri-scissors-fill','ri-tooltip-fill',
]

type CategoryId = typeof EMOJI_CATEGORIES[number]['id']

export const EmojiDialog: React.FC<EmojiDialogProps> = ({ onClose, onInsert }) => {
  const [activeCat, setActiveCat] = useState<CategoryId>('smiley')
  const [search, setSearch] = useState('')
  const [useRemix, setUseRemix] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const emojis = useRemix
    ? (search ? REMIX_ICONS.filter(n => n.includes(search.toLowerCase())) : REMIX_ICONS)
    : (EMOJI_DATA[activeCat] ?? [])

  const handleInsert = (item: string) => {
    onInsert(item)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="emoji-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon"><span className="remix ri-emotion-line"></span></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>插入表情图标</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {useRemix ? `Remix Icon (${REMIX_ICONS.length} 个)` : `${EMOJI_CATEGORIES.find(c => c.id === activeCat)?.label || ''} (${emojis.length} 个)`}
              </div>
            </div>
          </div>
          <button className="settings-action-btn settings-close-btn" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        {/* Search */}
        <div className="emoji-search-wrap">
          <span className="remix ri-search-line emoji-search-icon"></span>
          <input
            ref={searchRef}
            className="emoji-search-input"
            placeholder={useRemix ? '搜索图标名称...' : '搜索表情...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="emoji-search-clear" onClick={() => setSearch('')}>
              <span className="remix ri-close-line"></span>
            </button>
          )}
        </div>

        {/* Toggle: Emoji / Icon */}
        <div className="emoji-mode-toggle">
          <button className={`emoji-mode-btn ${!useRemix ? 'active' : ''}`} onClick={() => { setUseRemix(false); setSearch('') }}>
            <span className="remix ri-smile-line"></span> 表情
          </button>
          <button className={`emoji-mode-btn ${useRemix ? 'active' : ''}`} onClick={() => { setUseRemix(true); setSearch('') }}>
            <span className="remix ri-remixicon-line"></span> Remix Icon
          </button>
        </div>

        {/* Category tabs (emoji mode only) */}
        {!useRemix && (
          <div className="emoji-tabs">
            {EMOJI_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`emoji-tab ${activeCat === cat.id ? 'active' : ''}`}
                onClick={() => { setActiveCat(cat.id); setSearch('') }}
              >
                <span className="emoji-tab-emoji">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="emoji-grid">
          {emojis.length === 0 ? (
            <div className="emoji-empty">没有找到匹配的内容</div>
          ) : emojis.map((emoji, i) => (
            <button
              key={i}
              className="emoji-item"
              onClick={() => handleInsert(emoji)}
              title={emoji}
            >
              {useRemix
                ? <span className={`remix ${emoji}`} style={{ fontSize: 20 }}></span>
                : <span style={{ fontSize: 22 }}>{emoji}</span>
              }
            </button>
          ))}
        </div>

        <div className="export-actions" style={{ padding: '10px 16px 12px', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
          <button className="settings-cancel-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
