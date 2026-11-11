import { useState, useEffect, useCallback } from 'react';
import { syncEngine, SyncEngineState } from '../services/syncEngine';
import { QueuedOrder, Product } from '../types';

export function useSyncEngine() {
  const [state, setState] = useState<SyncEngineState>(syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((next) => {
      setState(next);
    });
    return unsubscribe;
  }, []);

  const setApiUrl = useCallback((url: string) => {
    syncEngine.setApiUrl(url);
  }, []);

  const enqueue = useCallback((order: QueuedOrder) => {
    syncEngine.enqueue(order);
  }, []);

  const processQueue = useCallback(async () => {
    return syncEngine.processQueue();
  }, []);

  const saveProductsToSheet = useCallback(async (url: string, products: Product[]) => {
    return syncEngine.saveProductsToSheet(url, products);
  }, []);

  const fetchHistoryFromSheet = useCallback(async (urlOverride?: string) => {
    return syncEngine.fetchHistoryFromSheet(urlOverride);
  }, []);

  const setBatterySaver = useCallback((enabled: boolean) => {
    syncEngine.setBatterySaver(enabled);
  }, []);

  return {
    queue: state.queue,
    queueLength: state.queue.length,
    pendingTextCount: state.pendingTextCount,
    pendingPhotoCount: state.pendingPhotoCount,
    isSyncing: state.isSyncing,
    hasSyncError: state.hasSyncError,
    apiUrl: state.apiUrl,
    isBatterySaver: state.isBatterySaver,
    setApiUrl,
    setBatterySaver,
    enqueue,
    processQueue,
    saveProductsToSheet,
    fetchHistoryFromSheet,
  };
}
