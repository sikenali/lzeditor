/** A message dialog, no-op shim: shows nothing, resolves immediately. */
export async function showMessage(
  _text: string,
  _options: unknown = {},
): Promise<void> {}
