import React from 'react'
import { resolveIcon } from '../../utils/icon'

export interface UiInputProps {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  prefixIcon?: string
  clearable?: boolean
  size?: 'sm' | 'md'
  autoFocus?: boolean
  disabled?: boolean
  readOnly?: boolean
  id?: string
  name?: string
  className?: string
  style?: React.CSSProperties
  min?: number | string
  max?: number | string
  step?: number | string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

export const UiInput: React.FC<UiInputProps> = ({
  value, onChange, type = 'text', placeholder, prefixIcon, clearable = false,
  size = 'md', autoFocus, disabled, readOnly, id, name, className, style,
  min, max, step, onKeyDown, onFocus, onBlur,
}) => {
  const Prefix = resolveIcon(prefixIcon)
  const Clear = resolveIcon('ri-close-circle-line')

  return (
    <div className={`ui-input${size === 'sm' ? ' ui-input--sm' : ''}${className ? ` ${className}` : ''}`}
      style={style}>
      {Prefix && <span className="ui-input-prefix"><Prefix size={15} /></span>}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="ui-input-control"
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {clearable && value !== '' && !disabled && Clear && (
        <button type="button" className="ui-input-clear" onClick={() => onChange('')} aria-label="清除">
          <Clear size={15} />
        </button>
      )}
    </div>
  )
}
