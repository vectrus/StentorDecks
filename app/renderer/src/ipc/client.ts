import type { IpcEventChannel, IpcEventMap, IpcInvokeMap } from '@stentordeck/shared';

function api(): Window['stentor'] {
  if (!window.stentor) {
    throw new Error('window.stentor missing — preload not loaded');
  }
  return window.stentor;
}

export function invoke<K extends keyof IpcInvokeMap>(
  channel: K,
  ...args: IpcInvokeMap[K]['req'] extends void ? [] : [IpcInvokeMap[K]['req']]
): Promise<IpcInvokeMap[K]['res']> {
  return api().invoke(channel, ...args);
}

export function onIpc<K extends IpcEventChannel>(
  channel: K,
  listener: (payload: IpcEventMap[K]) => void,
): () => void {
  return api().on(channel, listener);
}
