import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { fetchBathrooms } from './api';
import type { Bathroom } from './types';
import { CampusMapScreen } from '../2d/CampusMapScreen';

const INSTALLATION_KEY = 'toilet-tracker-installation-id';

function createInstallationId() {
  return `tt-${Crypto.randomUUID()}`;
}

export default function App() {
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [bathrooms, setBathrooms] = useState<Bathroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadBathrooms(id: string) {
    setError(null);
    try {
      setBathrooms(await fetchBathrooms(id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load bathrooms.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(INSTALLATION_KEY)
      .then(async (storedId) => {
        const id = storedId || createInstallationId();
        if (!storedId) await SecureStore.setItemAsync(INSTALLATION_KEY, id);
        if (!active) return;
        setInstallationId(id);
        await loadBathrooms(id);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError('This device could not create its anonymous installation ID.');
        }
      });
    return () => { active = false; };
  }, []);

  function updateBathroom(updatedBathroom: Bathroom) {
    setBathrooms((current) => current.map((bathroom) => (
      bathroom.id === updatedBathroom.id ? updatedBathroom : bathroom
    )));
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        {installationId && !loading && bathrooms.length > 0 ? (
          <CampusMapScreen
            bathrooms={bathrooms}
            installationId={installationId}
            onBathroomUpdated={updateBathroom}
            onReload={() => loadBathrooms(installationId)}
          />
        ) : loading ? (
          <View style={styles.state}>
            <ActivityIndicator color="#3478F6" size="large" />
            <Text style={styles.stateText}>Finding campus bathrooms</Text>
          </View>
        ) : (
          <View style={styles.state}>
            <Text style={styles.errorTitle}>Couldn't load the map</Text>
            <Text style={styles.stateText}>{error || 'The bathroom service returned no locations.'}</Text>
            <Text style={styles.setupText}>Check that the API is running and EXPO_PUBLIC_API_URL points to your computer on this network.</Text>
            <Text onPress={() => installationId && loadBathrooms(installationId)} style={styles.retry}>Try again</Text>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F6FA' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  stateText: { color: '#667085', textAlign: 'center', fontSize: 14 },
  errorTitle: { color: '#182230', fontWeight: '700', fontSize: 20 },
  setupText: { color: '#667085', textAlign: 'center', fontSize: 13, lineHeight: 19 },
  retry: { color: '#3478F6', fontWeight: '700', padding: 12 },
});