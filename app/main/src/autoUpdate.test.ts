import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: () => '0.1.0-test',
  },
}));

vi.mock('./ipcBroadcast', () => ({
  broadcast: vi.fn(),
}));

describe('autoUpdate (dev / unpackaged)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('checkForAppUpdates is disabled when not packaged', async () => {
    const { checkForAppUpdates, getUpdateStatus } = await import('./autoUpdate');
    const status = await checkForAppUpdates();
    expect(status.phase).toBe('disabled');
    expect(status.packaged).toBe(false);
    expect(status.currentVersion).toBe('0.1.0-test');
    expect(getUpdateStatus().phase).toBe('disabled');
  });

  it('installAppUpdate refuses when not packaged', async () => {
    const { installAppUpdate } = await import('./autoUpdate');
    const res = await installAppUpdate();
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toMatch(/installed app/i);
    }
  });

  it('resolveAutoUpdater handles both interop shapes (getter export hides behind .default)', async () => {
    const { resolveAutoUpdater } = await import('./autoUpdate');
    const updater = { checkForUpdates: vi.fn() };
    // Named export visible (plain require / bundled)
    expect(resolveAutoUpdater({ autoUpdater: updater as never })).toBe(updater);
    // Native dynamic import of CJS: getter export invisible to cjs-module-lexer,
    // only .default carries the module (the packaged-app crash).
    expect(resolveAutoUpdater({ default: { autoUpdater: updater as never } })).toBe(updater);
    expect(() => resolveAutoUpdater({})).toThrow(/autoUpdater export missing/);
  });
});
