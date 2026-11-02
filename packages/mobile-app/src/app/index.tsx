import { SafeAreaView } from 'react-native-safe-area-context';
import { CampusMapScreen } from '../2d/CampusMapScreen';
import { ScreenState } from '../main/ScreenState';
import { useAppData } from '../main/AppProvider';

export default function DiscoveryRoute() {
  const {
    installationId,
    bathrooms,
    loading,
    error,
    reloadBathrooms,
  } = useAppData();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState title="Finding campus bathrooms" message="Loading the bathroom directory." loading />
      </SafeAreaView>
    );
  }

  if (error || !installationId) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState
          title="Couldn't load bathrooms"
          message={error || 'The anonymous installation ID is unavailable.'}
          actionLabel="Try again"
          onAction={() => { void reloadBathrooms(); }}
        />
      </SafeAreaView>
    );
  }

  if (bathrooms.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState
          title="No bathrooms in the directory yet"
          message="The service is available, but it has not returned any locations."
          actionLabel="Refresh directory"
          onAction={() => { void reloadBathrooms(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <CampusMapScreen
        bathrooms={bathrooms}
      />
    </SafeAreaView>
  );
}
