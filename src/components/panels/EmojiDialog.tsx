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
  gesture: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✌️','🤞','🫰','🤟','🤘','👌','🤌','🤏','👈','👉','👆','🖕','👇','☝️','🫵','👋','🤚','🖐️','🖖','🫱','�2','🫳','🫴','👌','🤏'],
  heart: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','💌','💋'],
  animal: ['🐱','🐶','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐒','🦍','🦧','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔'],
  food: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🫘','🥐','🥖','🍞','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍛','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🍏','🍐'],
  travel: ['✈️','🚀','🛸','🚁','🛶','⛵','🚢','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏗️','🏘️','🏙️','🏚️','🌃','🏙️','🌆','🌇','🌉','♨️','🎠','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️','🏍️','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚨','🚥','🚦','🛑','🚧'],
  activity: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚴','🚵','🎖️','🏆','🥇','🥈','🥉','🏅','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🕹️','🧩'],
  object: ['💡','🔦','🕯️','🧯','🗑️','🪣','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','🩻','🩼','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🪥','🪒','🧽','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','🎗️','🎟️','🎫','🎖️','🏆','🏅','🥇','🥈','🥉','⚽','⚾','🥎','🏀','🏐','🏈','🏉','🎾','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘'],
  symbol: ['⭐','🌟','✨','💫','🔥','💥','☄️','💢','💦','💨','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','🌊','💧','💎','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','✓','✅','✔️','❌','❎','➕','➖','➗','✖️','💲','©️','®️','™️','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','🈁','🈂️','🈷️','🈶','🈯','🉐','㊙️','🈺','🈵','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','◾','◽','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲','○','●','◎','◆','◇','△','▽'],
  flag: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇨🇳','🇺🇸','🇯🇵','🇰🇷','🇬🇧','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇷🇺','🇧🇷','🇮🇳','🇦🇺','🇨🇦','🇲🇽','🇧🇯','🇰🇪','🇳🇬','🇿🇦','🇪🇬','🇹🇷','🇸🇦','🇦🇪','🇮🇱','🇹🇭','🇻🇳','🇮🇩','🇵🇭','🇲🇾','🇸🇬','🇹🇼','🇭🇰','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇻🇪','🇵🇹','🇳🇱','🇧🇪','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇦🇹','🇨🇭','🇬🇷','🇺🇦','🇷🇴','🇭🇺','🇮🇷','🇵🇰','🇧🇩','🇱🇰','🇳🇵','🇲🇲','🇰🇭','🇱🇦','🇲🇳','🇿🇦','🇪🇹','🇲🇦','🇹🇳','🇩🇿','🇸🇳','🇬🇭','🇨🇲','🇨🇮','🇹🇿','🇰🇪','🇿🇲','🇲🇿','🇦🇴','🇳🇦','🇧🇼','🇿🇼','🇧🇧','🇯🇲','🇹🇹','🇨🇺','🇩🇴','🇵🇦','🇨🇷','🇬🇹','🇧🇪'],
}

type CategoryId = typeof EMOJI_CATEGORIES[number]['id']

export const EmojiDialog: React.FC<EmojiDialogProps> = ({ onClose, onInsert }) => {
  const [activeCat, setActiveCat] = useState<CategoryId>('smiley')
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const emojis = EMOJI_DATA[activeCat] ?? []
  const filtered = search ? emojis.filter(e => e.includes(search)) : emojis

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-dialog chart-dialog" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <div className="settings-icon"><span className="remix ri-emotion-line"></span></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)' }}>插入表情</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                {EMOJI_CATEGORIES.find(c => c.id === activeCat)?.label || ''} · {filtered.length} 个
              </div>
            </div>
          </div>
          <button className="settings-action-btn settings-close-btn" onClick={onClose} title="关闭">
            <span className="remix ri-close-line"></span>
          </button>
        </div>

        <div className="chart-body">
          {/* Left panel — category list */}
          <div className="chart-type-panel">
            <div className="emoji-search-wrap">
              <span className="remix ri-search-line emoji-search-icon"></span>
              <input
                ref={searchRef}
                className="emoji-search-input"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索…"
              />
              {search && (
                <button type="button" className="emoji-search-clear" onClick={() => setSearch('')}>
                  <span className="remix ri-close-line"></span>
                </button>
              )}
            </div>
            <div className="chart-type-grid">
              {EMOJI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`chart-type-card ${activeCat === cat.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => { setActiveCat(cat.id as CategoryId); setSearch('') }}
                >
                  <span className="chart-type-icon">{cat.icon}</span>
                  <span className="chart-type-label">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — emoji grid */}
          <div className="chart-right-panel">
            <div className="chart-preview-wrap">
              <div className="chart-preview-label">
                <span className="remix ri-grid-fill"></span>
                {EMOJI_CATEGORIES.find(c => c.id === activeCat)?.label || ''}
                <span className="emoji-count">{filtered.length}</span>
              </div>
              <div className="chart-preview">
                {filtered.length === 0 ? (
                  <div className="emoji-empty">没有找到匹配的表情</div>
                ) : (
                  <div className="emoji-grid">
                    {filtered.map((emoji, i) => (
                      <button
                        key={i}
                        className="emoji-item"
                        type="button"
                        onClick={() => { onInsert(emoji); onClose() }}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="export-actions">
              <button className="settings-cancel-btn" onClick={onClose} type="button">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
