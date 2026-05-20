import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clearChunkReloadFlag } from './lazyWithRetry';

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('lazyWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears reload flag via clearChunkReloadFlag', () => {
    sessionStorage.setItem('vite-chunk-reload', '1');
    clearChunkReloadFlag();
    expect(sessionStorage.getItem('vite-chunk-reload')).toBeNull();
  });
});
