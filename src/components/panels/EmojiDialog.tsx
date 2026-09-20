import React, { useState, useRef, useEffect } from 'react'

interface EmojiDialogProps {
  onClose: () => void
  onInsert: (text: string) => void
}

const EMOJI_CATEGORIES = [
  { id: 'smiley', label: '表情', desc: '笑脸与人物情绪', icon: 'ri-emotion-line' },
  { id: 'gesture', label: '手势', desc: '手势与互动表达', icon: 'ri-thumb-up-line' },
  { id: 'heart', label: '情感', desc: '爱心与情绪符号', icon: 'ri-heart-line' },
  { id: 'animal', label: '动物', desc: '动物与自然生物', icon: 'ri-bear-smile-line' },
  { id: 'food', label: '食物', desc: '食物与饮品', icon: 'ri-restaurant-line' },
  { id: 'travel', label: '旅行', desc: '交通与地点', icon: 'ri-plane-line' },
  { id: 'activity', label: '运动', desc: '活动、奖项、游戏', icon: 'ri-football-line' },
  { id: 'object', label: '物品', desc: '工具、设备、礼物', icon: 'ri-lightbulb-line' },
  { id: 'symbol', label: '符号', desc: '标记、形状、状态', icon: 'ri-star-line' },
  { id: 'flag', label: '旗帜', desc: '国家与旗帜', icon: 'ri-flag-line' },
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
      <div className="settings-dialog insert-dialog" onClick={e => e.stopPropagation()}>
        <div className="export-header">
          <div className="export-title">
            <span className="remix export-icon ri-emotion-line"></span>
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

        <div className="export-body export-body-split export-body-redesigned insert-dialog-body">
          {/* Left panel — category list */}
          <div className="export-left insert-left-nav">
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
            <div className="emoji-category-list">
              {EMOJI_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`insert-nav-item ${activeCat === cat.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => { setActiveCat(cat.id as CategoryId); setSearch('') }}
                >
                  <span className={`remix insert-nav-icon ${cat.icon}`}></span>
                  <span className="chip-name">{cat.label}</span>
                  <span className="chip-desc">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel — emoji grid */}
          <div className="export-right insert-right-pane emoji-right-pane">
            <div className="insert-preview-panel emoji-preview-panel">
              <div className="chart-preview-label">
                <span className="remix ri-grid-fill"></span>
                {EMOJI_CATEGORIES.find(c => c.id === activeCat)?.label || ''}
                <span className="emoji-count">{filtered.length}</span>
              </div>
              <div className="emoji-panel-scroll">
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
            <div className="export-footer">
              <div className="export-hint">
                <span className="remix ri-information-line"></span>
                <span>点击表情后将立即插入</span>
              </div>
              <div className="export-actions">
              <button className="settings-cancel-btn" onClick={onClose} type="button">关闭</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
