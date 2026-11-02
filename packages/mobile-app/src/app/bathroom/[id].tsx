import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchBathroom } from '../../main/api';
import { useAppData } from '../../main/AppProvider';
import { ScreenState } from '../../main/ScreenState';
import type { Bathroom } from '../../main/types';
import { BathroomDetailsScreen } from '../../rating/BathroomDetailsScreen';

export default function BathroomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { installationId, updateBathroom } = useAppData();
  const [bathroom, setBathroom] = useState<Bathroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!installationId || !id) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    fetchBathroom(id, installationId)
      .then((result) => {
        if (active) setBathroom(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load bathroom details.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, installationId, attempt]);

  function closeDetails() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (loading || !installationId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState title="Loading bathroom" message="Getting the latest bathroom details." loading />
      </SafeAreaView>
    );
  }

  if (!bathroom || error) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState
          title="Couldn't load bathroom"
          message={error || 'This bathroom is not in the directory.'}
          actionLabel={error ? 'Try again' : 'Back to map'}
          onAction={error ? () => setAttempt((current) => current + 1) : closeDetails}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <BathroomDetailsScreen
        bathroom={bathroom}
        installationId={installationId}
        onClose={closeDetails}
        onBathroomUpdated={(updatedBathroom) => {
          setBathroom(updatedBathroom);
          updateBathroom(updatedBathroom);
        }}
      />
    </SafeAreaView>
  );
}
