/** Undo/redo of filesystem changes, no-op shim: every call is a resolved
 *  no-op promise so awaited and .then'd calls behave. */

const noop = (..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined);

export const undoFiles = new Proxy(
  {} as {
    load: (..._args: unknown[]) => Promise<string | undefined>;
    save: (..._args: unknown[]) => Promise<void>;
  },
  { get: () => noop },
);
