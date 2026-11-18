import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { fetchBathrooms } from './api';
import { ApiError } from './apiErrors';
import type { Bathroom } from './types';

const INSTALLATION_KEY = 'toilet-tracker-installation-id';
const ACCESS_TOKEN_KEY = 'toilet-tracker-access-token';

type AppData = {
  installationId: string | null;
  accessToken: string | null;
  bathrooms: Bathroom[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  reloadBathrooms: () => Promise<void>;
  updateBathroom: (bathroom: Bathroom) => void;
  saveAccessToken: (token: string) => Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

function createInstallationId() {
  return `tt-${Crypto.randomUUID()}`;
}

async function getInstallationId() {
  if (Platform.OS === 'web') {
    const storedId = window.localStorage.getItem(INSTALLATION_KEY);
    const id = storedId || createInstallationId();
    if (!storedId) window.localStorage.setItem(INSTALLATION_KEY, id);
    return id;
  }

  const storedId = await SecureStore.getItemAsync(INSTALLATION_KEY);
  const id = storedId || createInstallationId();
  if (!storedId) await SecureStore.setItemAsync(INSTALLATION_KEY, id);
  return id;
}

async function getAccessToken() {
  if (Platform.OS === 'web') return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

async function persistAccessToken(token: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bathrooms, setBathrooms] = useState<Bathroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function loadBathrooms(id: string) {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      setBathrooms(await fetchBathrooms(id));
    } catch (loadError) {
      setError(loadError instanceof ApiError
        ? `${loadError.message} [${loadError.code}]`
        : loadError instanceof Error ? loadError.message : 'Unable to load bathrooms.');
      setErrorCode(loadError instanceof ApiError ? loadError.code : null);
    } finally {
      setLoading(false);
    }
  }

  async function initialize() {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const [id, token] = await Promise.all([getInstallationId(), getAccessToken()]);
      setInstallationId(id);
      setAccessToken(token);
      await loadBathrooms(id);
    } catch (loadError) {
      setLoading(false);
      setError(loadError instanceof Error
        ? `This device could not create its anonymous installation ID: ${loadError.message}`
        : 'This device could not create its anonymous installation ID.');
      setErrorCode(null);
    }
  }

  useEffect(() => {
    void initialize();
  }, []);

  function updateBathroom(updatedBathroom: Bathroom) {
    setBathrooms((current) => current.map((bathroom) => (
      bathroom.id === updatedBathroom.id ? updatedBathroom : bathroom
    )));
  }

  async function saveAccessToken(token: string) {
    await persistAccessToken(token);
    setAccessToken(token);
  }

  async function reloadBathrooms() {
    if (installationId) await loadBathrooms(installationId);
    else await initialize();
  }

  return (
    <AppDataContext.Provider
      value={{
        installationId,
        accessToken,
        bathrooms,
        loading,
        error,
        errorCode,
        reloadBathrooms,
        updateBathroom,
        saveAccessToken,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppProvider.');
  return context;
}
