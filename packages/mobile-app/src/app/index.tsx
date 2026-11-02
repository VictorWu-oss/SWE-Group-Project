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
    errorCode,
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
    const guidance = errorCode === 'API_UNREACHABLE'
      ? 'Meaning: your phone cannot reach the computer running the API. Make sure both devices share Wi-Fi, the backend is running, and .env uses the computer Wi-Fi IPv4 address (not the WSL address).'
      : errorCode === 'API_TIMEOUT'
        ? 'Meaning: the API did not respond in time. Check that npm run dev:api is running and that Windows Firewall allows Node.js on your private network.'
        : errorCode === 'API_HTTP_ERROR'
          ? 'Meaning: the server was reached but returned an error. Check the backend terminal for the matching status or error message.'
          : errorCode === 'API_INVALID_RESPONSE'
            ? 'Meaning: the server responded with data the app could not understand. Restart the backend and try again.'
            : '';
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScreenState
          title="Couldn't load bathrooms"
          message={`${error || 'The anonymous installation ID is unavailable.'}${guidance ? `\n\n${guidance}` : ''}`}
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
