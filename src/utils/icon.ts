import React from 'react'

const cache = new Map<string, React.ComponentType<any> | null>()

/**
 * Resolve a `ri-*` icon name to a React component, or `null`.
 *
 * The project ships the RemixIcon webfont (see `@font-face` in `globals.css`)
 * and names glyphs with `ri-*` classes, so this helper wraps that mechanism in
 * a component API. Names are cached; `undefined` or non-`ri-` names resolve to
 * `null` instead of throwing.
 */
export function resolveIcon(name: string | undefined): React.ComponentType<any> | null {
  if (!name) return null
  if (cache.has(name)) return cache.get(name)!
  if (!name.startsWith('ri-')) {
    cache.set(name, null)
    return null
  }

  const Icon: React.ComponentType<any> = ({ size = 16, className = '', style, color, ...rest }) =>
    React.createElement(
      'span',
      {
        'aria-hidden': true,
        className: `remix ${name}${className ? ` ${className}` : ''}`,
        style: { fontSize: size, lineHeight: 1, ...(color ? { color } : null), ...style },
        ...rest,
      },
    )
  Icon.displayName = `Ri${name.slice(3)}`

  cache.set(name, Icon)
  return Icon
}
