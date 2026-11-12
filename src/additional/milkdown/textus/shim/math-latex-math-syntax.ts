/** LaTeX math writing helper, no-op shim: writes nothing. */

/** What a `$…$`/`\(…\)` delimiter pair writes, or null when it would not;
 *  no-op: null (nothing is written as LaTeX). */
export function writeLatexMath(
  _value: string,
  _delimiter: string,
  _ownLines: boolean,
): string | null {
  return null;
}
