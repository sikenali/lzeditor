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
      <div className="settings-dialog chart-dialog" style={{ width: 680 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
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

        {/* Left: category list | Right: emoji grid */}
        <div className="chart-body">
          {/* Left panel — categories */}
          <div className="chart-type-panel">
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ position: 'relative' }}>
                <span className="remix ri-search-line" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' }}></span>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索…"
                  style={{
                    width: '100%',
                    padding: '5px 28px 5px 28px',
                    fontSize: 12,
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    background: 'var(--bg-code)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                  >
                    <span className="remix ri-close-line" style={{ fontSize: 13 }}></span>
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 0' }}>
              {EMOJI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`chart-type-card ${activeCat === cat.id ? 'active' : ''}`}
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
            <div className="chart-preview-wrap" style={{ flex: 1, overflow: 'hidden' }}>
              <div className="chart-preview-label"><span className="remix ri-grid-fill"></span> 表情</div>
              <div className="chart-preview" style={{ overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>没有找到匹配的表情</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: 4, padding: 8 }}>
                    {filtered.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        style={{
                          fontSize: 22,
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: 6,
                          cursor: 'pointer',
                          padding: '4px 0',
                          lineHeight: 1,
                        }}
                        onClick={() => { onInsert(emoji); onClose() }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-a5)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="export-actions" style={{ padding: '10px 12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="settings-cancel-btn" onClick={onClose} type="button">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
