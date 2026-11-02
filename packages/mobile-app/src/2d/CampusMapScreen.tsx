import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { Bathroom, Coordinates } from '../main/types';
import {
  filterAndSortBathrooms,
  formatDistance,
  type BusynessFilter,
  type CleanlinessFilter,
} from '../main/discovery';
import { CampusMap } from './CampusMap';

type Props = {
  bathrooms: Bathroom[];
};

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

const busynessFilters: Exclude<BusynessFilter, 'any' | null>[] = ['Low', 'Medium', 'High'];

export function CampusMapScreen({ bathrooms }: Props) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [selectedBathroomId, setSelectedBathroomId] = useState<string | null>(null);
  const [cleanlinessFilter, setCleanlinessFilter] = useState<CleanlinessFilter>('any');
  const [busynessFilter, setBusynessFilter] = useState<BusynessFilter>('any');

  async function locateUser() {
    setSelectedBathroomId(null);
    setLocationStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocation(null);
        setLocationStatus('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus('granted');
    } catch {
      setLocation(null);
      setLocationStatus('unavailable');
    }
  }

  const orderedBathrooms = useMemo(
    () => filterAndSortBathrooms(
      bathrooms,
      search,
      location,
      cleanlinessFilter,
      busynessFilter,
    ),
    [bathrooms, busynessFilter, cleanlinessFilter, location, search],
  );
  const visibleBathrooms = useMemo(
    () => orderedBathrooms.map(({ bathroom }) => bathroom),
    [orderedBathrooms],
  );
  const selectedIsVisible = visibleBathrooms.some(({ id }) => id === selectedBathroomId);
  const focusedBathroomId = selectedIsVisible ? selectedBathroomId : null;

  function selectBathroom(id: string) {
    setSelectedBathroomId(id);
    router.push({ pathname: '/bathroom/[id]', params: { id } });
  }

  const locationLabel = {
    idle: 'Use location',
    loading: 'Locating',
    granted: 'Your location',
    denied: 'Location off',
    unavailable: 'Location unavailable',
  }[locationStatus];
  const locationDescription = {
    idle: 'Location is optional. Tap to request permission and sort by distance.',
    loading: 'Checking optional location permission.',
    granted: 'Nearby results are sorted by distance.',
    denied: 'Map and search still work; results are sorted by name.',
    unavailable: 'Map and search still work; results are sorted by name.',
  }[locationStatus];

  return (
    <View style={styles.screen}>
      <View style={styles.mapArea}>
        <CampusMap
          bathrooms={visibleBathrooms}
          location={location}
          selectedBathroomId={focusedBathroomId}
          onSelectBathroom={selectBathroom}
        />
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#667085" />
          <TextInput
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setSelectedBathroomId(null);
            }}
            placeholder="Search bathrooms or buildings"
            placeholderTextColor="#858FA0"
            returnKeyType="search"
            accessibilityLabel="Search bathrooms or buildings"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable
              onPress={() => {
                setSearch('');
                setSelectedBathroomId(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear bathroom search"
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close-circle" size={19} color="#667085" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.mapTag}>
          <Text style={styles.mapTagText}>2D CAMPUS MAP</Text>
        </View>
      </View>

      <View style={styles.nearbyPanel}>
        <View style={styles.sheetHandle} />
        <View style={styles.panelHeader}>
          <View style={styles.headerText}>
            <Text style={styles.panelTitle}>Bathrooms</Text>
            <Text style={styles.panelSubtitle}>{location
              ? 'Sorted by distance'
              : locationStatus === 'denied' || locationStatus === 'unavailable'
                ? 'Sorted by name; location unavailable'
                : 'Location is optional; sorted by name'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            accessibilityHint={locationDescription}
            accessibilityState={{ disabled: locationStatus === 'loading' }}
            disabled={locationStatus === 'loading'}
            onPress={() => { void locateUser(); }}
            style={styles.locationButton}
          >
            {locationStatus === 'loading'
              ? <ActivityIndicator size="small" color="#3478F6" />
              : <MaterialCommunityIcons
                name={location ? 'crosshairs-gps' : 'map-marker-off-outline'}
                size={16}
                color={location ? '#3478F6' : '#667085'}
              />}
            <Text style={styles.locationText}>{locationLabel}</Text>
          </Pressable>
        </View>
        {locationStatus === 'denied' || locationStatus === 'unavailable' ? (
          <Text style={styles.permissionNote}>{locationDescription}</Text>
        ) : null}
        <View style={styles.filters} accessibilityLabel="Bathroom rating filters">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: cleanlinessFilter === 'four-plus' }}
            onPress={() => setCleanlinessFilter((current) => (
              current === 'four-plus' ? 'any' : 'four-plus'
            ))}
            style={[styles.filterChip, cleanlinessFilter === 'four-plus' && styles.filterSelected]}
          >
            <Text style={[
              styles.filterText,
              cleanlinessFilter === 'four-plus' && styles.filterTextSelected,
            ]}
            >
              Cleanliness 4+
            </Text>
          </Pressable>
          {busynessFilters.map((level) => (
            <Pressable
              key={level}
              accessibilityRole="button"
              accessibilityState={{ selected: busynessFilter === level }}
              onPress={() => setBusynessFilter((current) => (
                current === level ? 'any' : level
              ))}
              style={[styles.filterChip, busynessFilter === level && styles.filterSelected]}
            >
              <Text style={[
                styles.filterText,
                busynessFilter === level && styles.filterTextSelected,
              ]}
              >
                {level}
              </Text>
            </Pressable>
          ))}
          {(cleanlinessFilter !== 'any' || busynessFilter !== 'any') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCleanlinessFilter('any');
                setBusynessFilter('any');
              }}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {orderedBathrooms.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-search-outline" size={28} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No bathrooms found</Text>
            <Text style={styles.emptyText}>
              {cleanlinessFilter !== 'any' || busynessFilter !== 'any'
                ? 'Try changing or clearing the rating filters.'
                : 'Try another bathroom name or building.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={orderedBathrooms}
            keyExtractor={({ bathroom }) => bathroom.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.bathroom.id === selectedBathroomId;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Open ${item.bathroom.name}, ${item.bathroom.building}`}
                  onPress={() => selectBathroom(item.bathroom.id)}
                  style={({ pressed }) => [
                    styles.bathroomRow,
                    selected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.pinIcon}>
                    <MaterialCommunityIcons name="toilet" size={17} color="#00A978" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.bathroomName} numberOfLines={1}>
                      {item.bathroom.name}
                    </Text>
                    <Text style={styles.buildingName} numberOfLines={1}>
                      {item.bathroom.building}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <View style={styles.ratingLine}>
                      <MaterialCommunityIcons name="star" size={13} color="#E89A18" />
                      <Text style={styles.ratingValue}>
                        {item.bathroom.averageCleanliness?.toFixed(1) ?? 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.distanceText}>
                      {formatDistance(item.distanceKilometers)}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F6FA' },
  mapArea: { flex: 1, minHeight: 250, position: 'relative' },
  searchBar: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 3,
    shadowColor: '#1F2937',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  searchInput: { flex: 1, color: '#182230', fontSize: 14, paddingVertical: 0 },
  mapTag: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    elevation: 2,
  },
  mapTagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: '#475467' },
  nearbyPanel: {
    height: '41%',
    minHeight: 270,
    maxHeight: 390,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 9,
    elevation: 10,
    shadowColor: '#182230',
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DCE2EA',
    alignSelf: 'center',
    marginBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerText: { flex: 1 },
  panelTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#17212F' },
  panelSubtitle: { fontSize: 13, color: '#667085', marginTop: 3 },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 8,
    backgroundColor: '#F4F7FB',
    borderRadius: 12,
  },
  locationText: { fontSize: 12, color: '#475467' },
  permissionNote: { color: '#667085', fontSize: 13, marginTop: -7, marginBottom: 7 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9, flexWrap: 'wrap' },
  filterChip: {
    borderWidth: 1,
    borderColor: '#D5DCE6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  filterSelected: { backgroundColor: '#EAF1FF', borderColor: '#3478F6' },
  filterText: { color: '#475467', fontSize: 12, fontWeight: '600' },
  filterTextSelected: { color: '#225CC2' },
  clearFilters: { paddingHorizontal: 6, paddingVertical: 5 },
  clearFiltersText: { color: '#225CC2', fontSize: 12, fontWeight: '600' },
  listContent: { paddingBottom: 12 },
  bathroomRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
    marginBottom: 7,
    gap: 10,
  },
  rowSelected: { borderColor: '#3478F6', backgroundColor: '#EEF4FF' },
  rowPressed: { backgroundColor: '#EEF4FF' },
  pinIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E7FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  bathroomName: { fontSize: 16, fontWeight: '600', color: '#202B3A' },
  buildingName: { fontSize: 13, color: '#667085' },
  rowMeta: { alignItems: 'flex-end', gap: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingValue: { color: '#475467', fontSize: 13, fontWeight: '600' },
  distanceText: { color: '#667085', fontSize: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 12 },
  emptyTitle: { color: '#263244', fontWeight: '700', fontSize: 16 },
  emptyText: { color: '#667085', fontSize: 14, textAlign: 'center' },
});
