import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import {
  IPC_EVENT_CHANNELS,
  IPC_INVOKE_CHANNELS,
  type IpcEventMap,
  type StentorApi,
} from '@stentordeck/shared';

const invokeChannels = new Set<string>(IPC_INVOKE_CHANNELS);
const eventChannels = new Set<string>(IPC_EVENT_CHANNELS);

const api: StentorApi = {
  invoke(channel, ...args) {
    if (!invokeChannels.has(channel)) {
      return Promise.reject(new Error(`Unknown IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, args[0]);
  },
  on(channel, listener) {
    if (!eventChannels.has(channel)) {
      throw new Error(`Unknown IPC event: ${channel}`);
    }
    const wrapped = (_event: IpcRendererEvent, payload: IpcEventMap[typeof channel]) => {
      listener(payload);
    };
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },
};

contextBridge.exposeInMainWorld('stentor', api);
