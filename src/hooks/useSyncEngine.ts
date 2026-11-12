import { useState, useEffect, useCallback } from 'react';
import { syncEngine, SyncEngineState } from '../services/syncEngine';
import { QueuedOrder, Product, TeamDivision } from '../types';

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

  const setTeam = useCallback((team: TeamDivision) => {
    syncEngine.setTeam(team);
  }, []);

  const setMenuSheetId = useCallback((sheetInput: string) => {
    syncEngine.setMenuSheetId(sheetInput);
  }, []);

  const fetchMenuFromCentralSheet = useCallback(
    async (teamOverride?: TeamDivision, sheetInputOverride?: string, existingProducts?: Product[], preserveCustom = true) => {
      return syncEngine.fetchMenuFromCentralSheet(teamOverride, sheetInputOverride, existingProducts, preserveCustom);
    },
    []
  );

  const parseMenuFromCsv = useCallback(
    (csvText: string, targetTeam: TeamDivision, existingProducts?: Product[], preserveCustom = true) => {
      return syncEngine.parseMenuFromCsv(csvText, targetTeam, existingProducts, preserveCustom);
    },
    []
  );

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
    team: state.team,
    menuSheetId: state.menuSheetId,
    isBatterySaver: state.isBatterySaver,
    setApiUrl,
    setTeam,
    setMenuSheetId,
    fetchMenuFromCentralSheet,
    parseMenuFromCsv,
    setBatterySaver,
    enqueue,
    processQueue,
    saveProductsToSheet,
    fetchHistoryFromSheet,
  };
}
