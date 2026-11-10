import type { FacadeSelection, SearchQueryOptions } from "../EditorFacade";
/**
 * Search/replace over the facade's canonical source string, with the same
 * semantics the previous editor exposed:
 *  - regex / case-sensitive / whole-word (`(?<!\S)…(?!\S)`)
 *  - zero-length matches skipped (never infinite-loop)
 *  - invalid regex throws `RangeError` (caller shows the error)
 *  - `replaceCurrent` advances the highlight past the replacement
 *  - `replaceAll` replaces back-to-front so offsets stay valid
 */

function buildSearchRegex(options: SearchQueryOptions): RegExp {
  const raw = options.regex
    ? options.term
    : options.term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const flags = options.caseSensitive ? "g" : "gi";
  const body = options.wholeWord ? `(?<!\\S)${raw}(?!\\S)` : raw;
  try {
    return new RegExp(body, flags);
  } catch (error) {
    throw new RangeError(
      `search regex invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function sameSearchOptions(a: SearchQueryOptions, b: SearchQueryOptions): boolean {
  return (
    a.term === b.term &&
    a.regex === b.regex &&
    a.caseSensitive === b.caseSensitive &&
    a.wholeWord === b.wholeWord
  );
}

export interface SearchSession {
  searchMatches(options: SearchQueryOptions): number;
  findNext(): boolean;
  findPrev(): boolean;
  replaceCurrent(text: string): number;
  replaceAll(text: string): number;
}

interface SearchFacade {
  getText(): string;
  replaceRange(from: number, to: number, text: string): void;
  setSelection(from: number, to: number): void;
}

export function createSearchSession(facade: SearchFacade): SearchSession {
  let searchOptions: SearchQueryOptions | null = null;
  let matches: FacadeSelection[] = [];
  let matchIndex = -1;

  function computeMatches(options: SearchQueryOptions): FacadeSelection[] {
    const regex = buildSearchRegex(options);
    const source = facade.getText();
    const found: FacadeSelection[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1; // zero-length match guard
        continue;
      }
      found.push({ from: match.index, to: match.index + match[0].length });
    }
    searchOptions = options;
    matches = found;
    return found;
  }

  function highlightCurrent(): void {
    const match = matches[matchIndex];
    if (!match) return;
    facade.setSelection(match.from, match.to);
  }

  return {
    searchMatches(options: SearchQueryOptions): number {
      const sameOptions =
        searchOptions !== null && sameSearchOptions(searchOptions, options);
      const found = computeMatches(options);
      if (!sameOptions) {
        matchIndex = found.length > 0 ? 0 : -1;
        if (matchIndex >= 0) highlightCurrent();
      }
      return found.length;
    },

    findNext(): boolean {
      const count = matches.length;
      if (count === 0) return false;
      matchIndex = (matchIndex + 1) % count;
      highlightCurrent();
      return true;
    },

    findPrev(): boolean {
      const count = matches.length;
      if (count === 0) return false;
      matchIndex = (matchIndex - 1 + count) % count;
      highlightCurrent();
      return true;
    },

    replaceCurrent(text: string): number {
      if (!searchOptions || matches.length === 0) {
        return searchOptions ? this.searchMatches(searchOptions) : 0;
      }
      const match = matches[matchIndex >= 0 ? matchIndex : 0];
      const source = facade.getText();
      if (!match || match.from < 0 || match.to > source.length) {
        return this.searchMatches(searchOptions);
      }
      try {
        facade.replaceRange(match.from, match.to, text);
      } catch {
        return this.searchMatches(searchOptions);
      }
      const replacementEnd = match.from + text.length;
      const fresh = computeMatches(searchOptions);
      const next = fresh.findIndex((candidate) => candidate.from >= replacementEnd);
      matchIndex = next >= 0 ? next : fresh.length > 0 ? 0 : -1;
      if (matchIndex >= 0) highlightCurrent();
      return fresh.length;
    },

    replaceAll(text: string): number {
      const found = matches;
      const source = facade.getText();
      if (found.length === 0) return 0;
      let replaced = 0;
      for (let index = found.length - 1; index >= 0; index--) {
        const match = found[index];
        if (!match || match.from < 0 || match.to > source.length) continue;
        try {
          facade.replaceRange(match.from, match.to, text);
          replaced += 1;
        } catch {
          // single failure skipped, continue replacing the rest
        }
      }
      matches = [];
      matchIndex = -1;
      searchOptions = null;
      return replaced;
    },
  };
}
