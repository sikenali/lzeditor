/**
 * Rich-text clipboard copy for WeChat Official Account.
 * Writes both text/html and text/plain so pasting into WeChat's UEditor
 * derivative keeps every inline style.
 */

/** Strip preview-only markers before copying */
export function stripPreviewMeta(html: string): string {
  return html
    .replace(/ data-line="\d+"/g, '')
    .replace(/ data-tip(?=[ >])/g, '')
    .replace(/ data-md-marker="[^"]*"/g, '');
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'SECTION', 'OL', 'UL', 'TABLE', 'BLOCKQUOTE', 'PRE', 'HR']);

function isMarkerSpan(node: Node): boolean {
  return (
    node instanceof HTMLElement &&
    node.tagName === 'SPAN' &&
    node.style.display === 'inline-block' &&
    node.style.width !== ''
  );
}

/**
 * Reshape list items so WeChat's normalizer doesn't split them in two.
 */
export function prepareListsForPaste(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const li of Array.from(doc.querySelectorAll('li'))) {
    if (li.firstChild && isMarkerSpan(li.firstChild)) continue;
    const run: ChildNode[] = [];
    for (const child of Array.from(li.childNodes)) {
      if (child instanceof HTMLElement && BLOCK_TAGS.has(child.tagName)) break;
      run.push(child);
    }
    if (!run.some(n => n.textContent?.trim())) continue;
    const section = doc.createElement('section');
    li.insertBefore(section, run[0]!);
    section.append(...run);
  }
  return doc.body.innerHTML;
}

const BLOCK_SELECTOR = 'p,div,section,h1,h2,h3,h4,h5,h6,li,tr,pre,pre code,blockquote,hr,table';

function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  doc.body.querySelectorAll(BLOCK_SELECTOR).forEach(el => el.append('\n'));
  return (doc.body.textContent ?? '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Copy rich text to clipboard; returns whether it worked */
export async function copyRichText(html: string): Promise<boolean> {
  const stripped = stripPreviewMeta(html);
  const plain = htmlToPlainText(stripped);
  const clean = prepareListsForPaste(stripped);

  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([clean], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return true;
    } catch {
      // fall through
    }
  }
  return copyViaExecCommand(clean);
}

function copyViaExecCommand(html: string): boolean {
  const container = document.createElement('div');
  container.setAttribute('contenteditable', 'true');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  selection?.removeAllRanges();
  document.body.removeChild(container);
  return ok;
}
