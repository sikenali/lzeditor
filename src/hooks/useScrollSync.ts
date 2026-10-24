/**
 * Scroll-sync channel between editor and preview panes.
 *
 * Uses a mutable object instead of React state to avoid re-renders on every
 * scroll frame. Each side subscribes, reads inside rAF, writes the DOM.
 */
import React from 'react'
export type ScrollSource = 'editor' | 'preview';

export interface ScrollSyncState {
  position: number;
  endPosition: number;
  atTop: boolean;
  atBottom: boolean;
  source: ScrollSource;
}

const COOLDOWN_MS = 150;

export interface ScrollSyncChannel {
  readonly state: ScrollSyncState;
  publish(next: ScrollSyncState): void;
  subscribe(fn: () => void): () => void;
  canDrive(side: ScrollSource): boolean;
  shouldFollow(side: ScrollSource): boolean;
}

export function createScrollSyncChannel(): ScrollSyncChannel {
  const state: ScrollSyncState = {
    position: 0,
    endPosition: 0,
    atTop: true,
    atBottom: false,
    source: 'editor',
  };
  const listeners = new Set<() => void>();
  let driver: ScrollSource = 'editor';
  let drivenAt = 0;

  return {
    state,
    publish(next) {
      state.position = next.position;
      state.endPosition = next.endPosition;
      state.atTop = next.atTop;
      state.atBottom = next.atBottom;
      state.source = next.source;
      driver = next.source;
      drivenAt = performance.now();
      for (const fn of listeners) fn();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    canDrive(side) {
      return driver === side || performance.now() - drivenAt > COOLDOWN_MS;
    },
    shouldFollow(side) {
      return state.source !== side;
    },
  };
}

/**
 * Hook that attaches scroll listeners to two panes and keeps them synced.
 *
 * @param editorRef  The scrollable editor container
 * @param previewRef The scrollable preview container
 * @param enabled    Whether sync is active (default true)
 */
export function useScrollSync(
  editorRef: React.RefObject<HTMLDivElement | null>,
  previewRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean = true,
) {
  const channelRef = React.useRef<ScrollSyncChannel | null>(null);
  const editorScrollTimer = React.useRef<number | null>(null);
  const previewScrollTimer = React.useRef<number | null>(null);
  const programmaticRef = React.useRef<ScrollSource | null>(null);

  if (!channelRef.current && enabled) {
    channelRef.current = createScrollSyncChannel();
  }

  React.useEffect(() => {
    if (!enabled || !channelRef.current) return;
    const channel = channelRef.current;
    const editorEl = editorRef.current;
    const previewEl = previewRef.current;
    if (!editorEl || !previewEl) return;

    const computePosition = (el: HTMLElement, maxScroll: number): number => {
      if (maxScroll <= 0) return el.scrollTop > 0 ? 0 : 0;
      return el.scrollTop / maxScroll;
    };

    const onEditorScroll = () => {
      if (programmaticRef.current === 'editor') {
        programmaticRef.current = null;
        return;
      }
      if (!channel.canDrive('editor')) return;
      const max = editorEl.scrollHeight - editorEl.clientHeight;
      const pos = computePosition(editorEl, max);
      const atTop = editorEl.scrollTop <= 2;
      const atBottom = editorEl.scrollTop >= max - 2;
      channel.publish({ position: pos, endPosition: 1, atTop, atBottom, source: 'editor' });
      // Drive preview via rAF
      if (previewScrollTimer.current) cancelAnimationFrame(previewScrollTimer.current);
      previewScrollTimer.current = requestAnimationFrame(() => {
        const s = channel.state;
        if (!channel.shouldFollow('preview')) return;
        const previewMax = previewEl.scrollHeight - previewEl.clientHeight;
        programmaticRef.current = 'preview';
        previewEl.scrollTop = s.position * previewMax;
      });
    };

    const onPreviewScroll = () => {
      if (programmaticRef.current === 'preview') {
        programmaticRef.current = null;
        return;
      }
      if (!channel.canDrive('preview')) return;
      const max = previewEl.scrollHeight - previewEl.clientHeight;
      const pos = computePosition(previewEl, max);
      const atTop = previewEl.scrollTop <= 2;
      const atBottom = previewEl.scrollTop >= max - 2;
      channel.publish({ position: pos, endPosition: 1, atTop, atBottom, source: 'preview' });
      if (editorScrollTimer.current) cancelAnimationFrame(editorScrollTimer.current);
      editorScrollTimer.current = requestAnimationFrame(() => {
        const s = channel.state;
        if (!channel.shouldFollow('editor')) return;
        const editorMax = editorEl.scrollHeight - editorEl.clientHeight;
        programmaticRef.current = 'editor';
        editorEl.scrollTop = s.position * editorMax;
      });
    };

    editorEl.addEventListener('scroll', onEditorScroll, { passive: true });
    previewEl.addEventListener('scroll', onPreviewScroll, { passive: true });

    return () => {
      editorEl.removeEventListener('scroll', onEditorScroll);
      previewEl.removeEventListener('scroll', onPreviewScroll);
      if (editorScrollTimer.current) cancelAnimationFrame(editorScrollTimer.current);
      if (previewScrollTimer.current) cancelAnimationFrame(previewScrollTimer.current);
    };
  }, [editorRef, previewRef, enabled]);
}
