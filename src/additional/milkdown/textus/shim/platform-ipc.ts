/** The IPC bridge namespaces, no-op shim: every call resolves to a no-op
 *  promise so awaited and .then'd calls behave. A real bridge replaces these
 *  when the editor core is wired to the host. */

const noop = (..._args: unknown[]): any => Promise.resolve(undefined);

function namespace(): Record<string, (...args: unknown[]) => any> {
  return new Proxy(
    {} as Record<string, (...args: unknown[]) => any>,
    { get: () => noop },
  );
}

export const clipboardIpc = namespace();
export const fs = namespace();
export const webAssets = namespace();
export const exportDoc = namespace();
export const links = namespace();
export const ai = namespace();
export const storage = namespace();
