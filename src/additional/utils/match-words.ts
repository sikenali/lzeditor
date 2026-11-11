/** Text lowercased and Latin accents stripped, for the search. */
export function searchFold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Whether `text` holds every word of `query`, case and Latin accents
 *  aside: the extension lists' search. */
export function matchesWords(text: string, query: string): boolean {
  const folded = searchFold(text);
  return searchFold(query)
    .split(/\s+/)
    .every((word) => folded.includes(word));
}
