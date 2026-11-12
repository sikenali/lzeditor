/** Code-block indentation helper, shim: the code feature is outside the A2
 *  closure, but this helper is pure and safe, so it stays faithful. */
export function leadingWhitespaceOfLastLine(textBeforeCursor: string): string {
  const lastNewline = textBeforeCursor.lastIndexOf("\n");
  const lastLine = textBeforeCursor.slice(lastNewline + 1);
  return lastLine.match(/^[ \t]*/)?.[0] ?? "";
}
