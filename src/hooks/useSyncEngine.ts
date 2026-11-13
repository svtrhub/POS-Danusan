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

  const setApiUrl = useCallback((url: string, targetTeam?: TeamDivision) => {
    syncEngine.setApiUrl(url, targetTeam);
  }, []);

  const setTeam = useCallback((team: TeamDivision) => {
    syncEngine.setTeam(team);
  }, []);

  const getActivationUrlForTeam = useCallback((team: TeamDivision) => {
    return syncEngine.getActivationUrlForTeam(team);
  }, []);

  const getDefaultUrlForTeam = useCallback((team: TeamDivision) => {
    return syncEngine.getDefaultUrlForTeam(team);
  }, []);

  const getCachedMenuForTeam = useCallback((team: TeamDivision) => {
    return syncEngine.getCachedMenuForTeam(team);
  }, []);

  const saveCachedMenuForTeam = useCallback((team: TeamDivision, products: Product[]) => {
    syncEngine.saveCachedMenuForTeam(team, products);
  }, []);

  const fetchMenuFromCentralSheet = useCallback(
    async (teamOverride?: TeamDivision, existingProducts?: Product[], preserveCustom = true) => {
      const fetched = await syncEngine.fetchMenuFromCentralSheet(teamOverride, existingProducts, preserveCustom);
      if (fetched && fetched.length > 0) {
        syncEngine.saveCachedMenuForTeam(teamOverride || syncEngine.getState().team, fetched);
      }
      return fetched;
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
    isBatterySaver: state.isBatterySaver,
    setApiUrl,
    setTeam,
    getActivationUrlForTeam,
    getDefaultUrlForTeam,
    getCachedMenuForTeam,
    saveCachedMenuForTeam,
    fetchMenuFromCentralSheet,
    parseMenuFromCsv,
    setBatterySaver,
    enqueue,
    processQueue,
    saveProductsToSheet,
    fetchHistoryFromSheet,
  };
}
