/** Undo/redo of filesystem changes, no-op shim: every call is a resolved
 *  no-op promise so awaited and .then'd calls behave. */

const noop = (..._args: unknown[]): any => Promise.resolve(undefined);

export const undoFiles = new Proxy(
  {} as Record<string, (...args: unknown[]) => any>,
  { get: () => noop },
);
