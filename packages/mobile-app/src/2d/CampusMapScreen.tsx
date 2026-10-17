import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { Bathroom, Coordinates } from '../main/types';
import { CampusMap } from './CampusMap';
import { BathroomDetailsSheet } from '../rating/BathroomDetailsSheet';

type Props = {
  bathrooms: Bathroom[];
  installationId: string;
  onBathroomUpdated: (bathroom: Bathroom) => void;
  onReload: () => Promise<void>;
};

function distanceBetween(first: Coordinates, second: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(second.latitude - first.latitude);
  const lonDelta = radians(second.longitude - first.longitude);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(kilometers: number | null) {
  if (kilometers == null) return 'Distance unavailable';
  const miles = kilometers * 0.621371;
  return miles < 0.1 ? `${Math.round(miles * 5280)} ft away` : `${miles.toFixed(1)} mi away`;
}

export function CampusMapScreen({ bathrooms, installationId, onBathroomUpdated, onReload }: Props) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [selectedBathroomId, setSelectedBathroomId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Location.requestForegroundPermissionsAsync()
      .then(async ({ status }) => {
        if (status !== 'granted') {
          if (active) setLocationMessage('Location off | sorted by name');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setLocationMessage('');
        }
      })
      .catch(() => {
        if (active) setLocationMessage('Location unavailable | sorted by name');
      })
      .finally(() => { if (active) setLocationLoading(false); });
    return () => { active = false; };
  }, []);

  const orderedBathrooms = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return bathrooms
      .filter((bathroom) => `${bathroom.name} ${bathroom.building}`.toLocaleLowerCase().includes(normalizedSearch))
      .map((bathroom) => ({
        bathroom,
        distance: location
          ? distanceBetween(location, { latitude: bathroom.latitude, longitude: bathroom.longitude })
          : null,
      }))
      .sort((first, second) => first.distance == null || second.distance == null
        ? first.bathroom.name.localeCompare(second.bathroom.name)
        : first.distance - second.distance);
  }, [bathrooms, location, search]);

  const selectedBathroom = bathrooms.find((bathroom) => bathroom.id === selectedBathroomId) || null;

  function selectBathroom(id: string) {
    setSelectedBathroomId(id);
    setShowDetails(true);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mapArea}>
        <CampusMap
          bathrooms={bathrooms}
          location={location}
          selectedBathroomId={selectedBathroomId}
          onSelectBathroom={selectBathroom}
        />
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#667085" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search bathrooms or buildings"
            placeholderTextColor="#858FA0"
            returnKeyType="search"
            accessibilityLabel="Search bathrooms or buildings"
            style={styles.searchInput}
          />
          <MaterialCommunityIcons name="tune-variant" size={19} color="#475467" />
        </View>
        <View style={styles.mapTag}><Text style={styles.mapTagText}>2D CAMPUS MAP</Text></View>
      </View>

      <View style={styles.nearbyPanel}>
        <View style={styles.sheetHandle} />
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Nearby bathrooms</Text>
            <Text style={styles.panelSubtitle}>{location ? 'Sorted by distance' : 'Demo locations | sorted by name'}</Text>
          </View>
          <View style={styles.locationStatus}>
            {locationLoading ? <ActivityIndicator size="small" color="#3478F6" /> : (
              <MaterialCommunityIcons name={location ? 'crosshairs-gps' : 'map-marker-off-outline'} size={16} color={location ? '#3478F6' : '#667085'} />
            )}
            <Text style={styles.locationText}>{location ? 'You are here' : 'Location optional'}</Text>
          </View>
        </View>
        {!locationLoading && locationMessage ? <Text style={styles.permissionNote}>{locationMessage}</Text> : null}
        {orderedBathrooms.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-search-outline" size={28} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No bathrooms found</Text>
            <Text style={styles.emptyText}>Try another bathroom name or building.</Text>
          </View>
        ) : (
          <FlatList
            data={orderedBathrooms}
            keyExtractor={({ bathroom }) => bathroom.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.bathroom.name}, ${item.bathroom.building}`}
                onPress={() => selectBathroom(item.bathroom.id)}
                style={({ pressed }) => [styles.bathroomRow, pressed && styles.rowPressed]}
              >
                <View style={styles.pinIcon}>
                  <MaterialCommunityIcons name="toilet" size={17} color="#00A978" />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.bathroomName} numberOfLines={1}>{item.bathroom.name}</Text>
                  <Text style={styles.buildingName} numberOfLines={1}>{item.bathroom.building}</Text>
                </View>
                <View style={styles.rowMeta}>
                  <View style={styles.ratingLine}>
                    <MaterialCommunityIcons name="star" size={13} color="#E89A18" />
                    <Text style={styles.ratingValue}>{item.bathroom.averageCleanliness?.toFixed(1) || 'N/A'}</Text>
                  </View>
                  <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      <BathroomDetailsSheet
        bathroom={selectedBathroom}
        installationId={installationId}
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        onBathroomUpdated={onBathroomUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F6FA' },
  mapArea: { flex: 1, minHeight: 250, position: 'relative' },
  searchBar: { position: 'absolute', top: 12, left: 16, right: 16, height: 48, borderRadius: 24, backgroundColor: '#fff', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 3, shadowColor: '#1F2937', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  searchInput: { flex: 1, color: '#182230', fontSize: 14, paddingVertical: 0 },
  mapTag: { position: 'absolute', left: 16, bottom: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, elevation: 2 },
  mapTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#475467' },
  nearbyPanel: { height: '41%', minHeight: 270, maxHeight: 390, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 9, elevation: 10, shadowColor: '#182230', shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: -4 } },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DCE2EA', alignSelf: 'center', marginBottom: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#17212F' },
  panelSubtitle: { fontSize: 11, color: '#7A8493', marginTop: 2 },
  locationStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#F4F7FB', borderRadius: 12 },
  locationText: { fontSize: 10, color: '#566274' },
  permissionNote: { color: '#758094', fontSize: 11, marginTop: -7, marginBottom: 7 },
  listContent: { paddingBottom: 12 },
  bathroomRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 7, gap: 10 },
  rowPressed: { backgroundColor: '#EEF4FF' },
  pinIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E7FBF4', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 3 },
  bathroomName: { fontSize: 13, fontWeight: '600', color: '#202B3A' },
  buildingName: { fontSize: 11, color: '#778294' },
  rowMeta: { alignItems: 'flex-end', gap: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingValue: { color: '#5E6878', fontSize: 11, fontWeight: '600' },
  distanceText: { color: '#778294', fontSize: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 12 },
  emptyTitle: { color: '#263244', fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#7A8493', fontSize: 12, textAlign: 'center' },
});