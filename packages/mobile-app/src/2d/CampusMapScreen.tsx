import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { Bathroom, Coordinates } from '../main/types';
import {
  filterAndSortBathrooms,
  formatDistance,
  type AccessibilityFilter,
  type AmenityFilter,
  type BathroomSort,
  type BusynessFilter,
  type CleanlinessFilter,
} from '../main/discovery';
import { CampusMap, getBathroomMapLocation } from './CampusMap';
import { BathroomDirectoryDetails } from '../rating/BathroomDirectoryDetails';
import { fetchWalkingRoute, type WalkingRoute } from '../main/api';

type Props = {
  bathrooms: Bathroom[];
};

type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

const busynessFilters: Exclude<BusynessFilter, 'any' | null>[] = ['Low', 'Medium', 'High'];
const accessibilityFilters: AccessibilityFilter[] = [
  'wheelchairAccessible',
  'grabBars',
  'accessibleSink',
  'stepFreeRoute',
];
const amenityFilters: AmenityFilter[] = [
  'babyChanging',
  'menstrualProducts',
  'hooks',
  'shelves',
];
const filterLabels: Record<string, string> = {
  'single-stall': 'Single stall',
  'multi-stall': 'Multi-stall',
  wheelchairAccessible: 'Wheelchair accessible',
  grabBars: 'Grab bars',
  accessibleSink: 'Accessible sink',
  stepFreeRoute: 'Step-free route',
  babyChanging: 'Baby changing',
  menstrualProducts: 'Menstrual products',
  hooks: 'Hooks',
  shelves: 'Shelves',
};

function restroomRoomLabel(name: string) {
  return name.replace(/^All-gender restrooms?\s*·\s*/i, '') || 'Room information unavailable';
}

export function CampusMapScreen({ bathrooms }: Props) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [selectedBathroomId, setSelectedBathroomId] = useState<string | null>(null);
  const [cleanlinessFilter, setCleanlinessFilter] = useState<CleanlinessFilter>('any');
  const [busynessFilter, setBusynessFilter] = useState<BusynessFilter>('any');
  const [restroomTypes, setRestroomTypes] = useState<Array<'single-stall' | 'multi-stall'>>([]);
  const [accessibility, setAccessibility] = useState<AccessibilityFilter[]>([]);
  const [amenities, setAmenities] = useState<AmenityFilter[]>([]);
  const [sort, setSort] = useState<BathroomSort>('recommended');
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeMessage, setRouteMessage] = useState('');

  function toggleValue<T extends string>(current: T[], value: T, update: (next: T[]) => void) {
    update(current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]);
  }

  async function locateUser(keepSelection = false): Promise<Coordinates | null> {
    if (!keepSelection) setSelectedBathroomId(null);
    setLocationStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocation(null);
        setLocationStatus('denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(coordinates);
      setLocationStatus('granted');
      return coordinates;
    } catch {
      setLocation(null);
      setLocationStatus('unavailable');
      return null;
    }
  }

  const orderedBathrooms = useMemo(
    () => filterAndSortBathrooms(
      bathrooms,
      search,
      location,
      cleanlinessFilter,
      busynessFilter,
      { restroomTypes, accessibility, amenities, sort },
    ),
    [accessibility, amenities, bathrooms, busynessFilter, cleanlinessFilter, location, restroomTypes, search, sort],
  );
  const visibleBathrooms = useMemo(
    () => orderedBathrooms.map(({ bathroom }) => bathroom),
    [orderedBathrooms],
  );
  const selectedIsVisible = visibleBathrooms.some(({ id }) => id === selectedBathroomId);
  const focusedBathroomId = selectedIsVisible ? selectedBathroomId : null;
  const selectedBathroom = focusedBathroomId
    ? bathrooms.find(({ id }) => id === focusedBathroomId) ?? null
    : null;
  const hasActiveFilters = cleanlinessFilter !== 'any'
    || busynessFilter !== 'any'
    || restroomTypes.length > 0
    || accessibility.length > 0
    || amenities.length > 0
    || sort !== 'recommended';
  const bathroomSections = useMemo(() => {
    const byBuilding = new Map<string, typeof orderedBathrooms>();
    orderedBathrooms.forEach((item) => {
      const building = item.bathroom.building || 'Other locations';
      const entries = byBuilding.get(building) ?? [];
      entries.push(item);
      byBuilding.set(building, entries);
    });
    return [...byBuilding.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([title, data]) => ({ title, data }));
  }, [orderedBathrooms]);

  function clearFilters() {
    setCleanlinessFilter('any');
    setBusynessFilter('any');
    setRestroomTypes([]);
    setAccessibility([]);
    setAmenities([]);
    setSort('recommended');
  }

  function selectBathroom(id: string) {
    setSelectedBathroomId(id);
    setWalkingRoute(null);
    setRouteMessage('');
  }

  async function showRouteInApp() {
    if (!selectedBathroom) return;
    const destination = getBathroomMapLocation(selectedBathroom);
    if (!destination) {
      setRouteMessage('Directions are not available for this building yet.');
      return;
    }
    setRouteLoading(true);
    setRouteMessage('');
    const origin = location ?? await locateUser(true);
    if (!origin) {
      setRouteLoading(false);
      setRouteMessage('Turn on location access to create a walking route from your current position.');
      return;
    }
    try {
      setWalkingRoute(await fetchWalkingRoute(origin, destination));
    } catch {
      setRouteMessage('A walking route could not be found right now. Please try again.');
    } finally {
      setRouteLoading(false);
    }
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
          routeCoordinates={walkingRoute?.coordinates ?? null}
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
          <Text style={styles.mapTagText}>BUILDING-CENTER PINS</Text>
        </View>
      </View>

      <View style={styles.nearbyPanel}>
        {selectedBathroom ? (
          <ScrollView
            contentContainerStyle={styles.detailsContent}
            showsVerticalScrollIndicator
            accessibilityLabel="Selected bathroom details"
          >
            <View style={styles.sheetHandle} />
            <View style={styles.detailsHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to bathroom list"
                onPress={() => {
                  setSelectedBathroomId(null);
                  setWalkingRoute(null);
                  setRouteMessage('');
                }}
                style={styles.backToList}
              >
                <MaterialCommunityIcons name="arrow-left" size={18} color="#225CC2" />
                <Text style={styles.backToListText}>Bathroom list</Text>
              </Pressable>
              <Text style={styles.detailsKicker}>BUILDING RESTROOM</Text>
            </View>
            <Text style={styles.detailsTitle}>{selectedBathroom.building}</Text>
            <Text style={styles.detailsRoom}>
              All-gender restroom · {restroomRoomLabel(selectedBathroom.name)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={['Show route to', selectedBathroom.building, 'on the campus map'].join(' ')}
              onPress={() => { void showRouteInApp(); }}
              style={styles.directionsButton}
            >
              {routeLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialCommunityIcons name="directions" size={20} color="#fff" />}
              <Text style={styles.directionsButtonText}>
                {routeLoading ? 'Finding walking route…' : 'Show walking route'}
              </Text>
            </Pressable>
            <Text style={styles.directionsNote}>
              Uses campus paths and pedestrian-accessible roads. The destination is the building entrance area.
            </Text>
            {routeMessage ? <Text style={styles.directionsError}>{routeMessage}</Text> : null}
            {walkingRoute ? (
              <View style={styles.routeCard}>
                <Text style={styles.routeTitle}>
                  {Math.round(walkingRoute.distanceMeters)} m · about {Math.max(1, Math.round(walkingRoute.durationSeconds / 60))} min walk
                </Text>
                {walkingRoute.instructions.map((instruction, index) => (
                  <Text key={instruction + index} style={styles.routeInstruction}>
                    {index + 1}. {instruction}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={styles.detailsSummary}>
              <View style={styles.detailsMetric}>
                <MaterialCommunityIcons name="star" size={17} color="#E89A18" />
                <Text style={styles.detailsMetricValue}>
                  {selectedBathroom.averageCleanliness?.toFixed(1) ?? 'N/A'}
                </Text>
                <Text style={styles.detailsMetricLabel}>cleanliness</Text>
              </View>
              <View style={styles.detailsMetric}>
                <MaterialCommunityIcons name="account-group-outline" size={17} color="#3478F6" />
                <Text style={styles.detailsMetricValue}>{selectedBathroom.busyness ?? 'No reports'}</Text>
                <Text style={styles.detailsMetricLabel}>busyness</Text>
              </View>
            </View>
            <View style={styles.directoryNote}>
              <MaterialCommunityIcons
                name={selectedBathroom.directoryVerified ? 'check-decagram-outline' : 'alert-circle-outline'}
                size={18}
                color={selectedBathroom.directoryVerified ? '#16845D' : '#8D5812'}
              />
              <Text style={styles.directoryNoteText}>
                {selectedBathroom.directoryVerified
                  ? 'Verified in the Cal Poly restroom directory.'
                  : 'This location has not been verified in the campus directory.'}
              </Text>
            </View>
            <BathroomDirectoryDetails
              bathroom={selectedBathroom}
              directionError=""
              onOpenDirections={() => { void showRouteInApp(); }}
              showDirections={false}
            />
          </ScrollView>
        ) : (
          <>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filters}
          accessibilityLabel="Bathroom filters"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: sort === 'name' }}
            onPress={() => setSort((current) => current === 'name' ? 'recommended' : 'name')}
            style={[styles.filterChip, sort === 'name' && styles.filterSelected]}
          >
            <Text style={[styles.filterText, sort === 'name' && styles.filterTextSelected]}>Name A-Z</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: sort === 'distance' }}
            onPress={() => setSort((current) => current === 'distance' ? 'recommended' : 'distance')}
            style={[styles.filterChip, sort === 'distance' && styles.filterSelected]}
          >
            <Text style={[styles.filterText, sort === 'distance' && styles.filterTextSelected]}>Nearest</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: sort === 'rating' }}
            onPress={() => setSort((current) => current === 'rating' ? 'recommended' : 'rating')}
            style={[styles.filterChip, sort === 'rating' && styles.filterSelected]}
          >
            <Text style={[styles.filterText, sort === 'rating' && styles.filterTextSelected]}>Top rated</Text>
          </Pressable>
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
          {(['single-stall', 'multi-stall'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: restroomTypes.includes(value) }}
              onPress={() => toggleValue(restroomTypes, value, setRestroomTypes)}
              style={[styles.filterChip, restroomTypes.includes(value) && styles.filterSelected]}
            >
              <Text style={[styles.filterText, restroomTypes.includes(value) && styles.filterTextSelected]}>
                {filterLabels[value]}
              </Text>
            </Pressable>
          ))}
          {accessibilityFilters.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: accessibility.includes(value) }}
              onPress={() => toggleValue(accessibility, value, setAccessibility)}
              style={[styles.filterChip, accessibility.includes(value) && styles.filterSelected]}
            >
              <Text style={[styles.filterText, accessibility.includes(value) && styles.filterTextSelected]}>
                {filterLabels[value]}
              </Text>
            </Pressable>
          ))}
          {amenityFilters.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: amenities.includes(value) }}
              onPress={() => toggleValue(amenities, value, setAmenities)}
              style={[styles.filterChip, amenities.includes(value) && styles.filterSelected]}
            >
              <Text style={[styles.filterText, amenities.includes(value) && styles.filterTextSelected]}>
                {filterLabels[value]}
              </Text>
            </Pressable>
          ))}
          {hasActiveFilters ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all bathroom filters"
              onPress={clearFilters}
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear all</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {orderedBathrooms.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="map-search-outline" size={28} color="#98A2B3" />
            <Text style={styles.emptyTitle}>No bathrooms found</Text>
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? 'No bathrooms match all selected filters. Change or clear filters to see more results.'
                : 'Try another bathroom name or building.'}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={bathroomSections}
            keyExtractor={({ bathroom }) => bathroom.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section }) => (
              <Text style={styles.buildingHeader}>{section.title}</Text>
            )}
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
                      {item.bathroom.building}
                    </Text>
                    <Text style={styles.buildingName} numberOfLines={1}>
                      {restroomRoomLabel(item.bathroom.name)}
                    </Text>
                    <Text style={item.bathroom.directoryVerified ? styles.verifiedText : styles.unverifiedText}>
                      {item.bathroom.directoryVerified ? 'Verified directory' : 'Demo / unverified'}
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
          </>
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
    height: '59%',
    minHeight: 410,
    maxHeight: 650,
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
  detailsContent: { paddingBottom: 18 },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  backToList: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backToListText: { color: '#225CC2', fontSize: 13, fontWeight: '700' },
  detailsKicker: { color: '#667085', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  detailsTitle: { color: '#17212F', fontSize: 20, fontWeight: '800', lineHeight: 25 },
  detailsRoom: { color: '#667085', fontSize: 14, lineHeight: 20, marginTop: 4 },
  directionsButton: {
    backgroundColor: '#3478F6',
    borderRadius: 14,
    minHeight: 48,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  directionsButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  directionsNote: { color: '#667085', fontSize: 12, lineHeight: 17, marginTop: 8 },
  directionsError: { color: '#B42318', fontSize: 12, lineHeight: 17, marginTop: 7 },
  routeCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  routeTitle: { color: '#225CC2', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  routeInstruction: { color: '#344054', fontSize: 13, lineHeight: 19, marginTop: 4 },
  detailsSummary: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  detailsMetric: {
    flex: 1,
    minHeight: 68,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsMetricValue: { color: '#344054', fontSize: 15, fontWeight: '800', marginTop: 3 },
  detailsMetricLabel: { color: '#667085', fontSize: 11, marginTop: 2 },
  directoryNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF8',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  directoryNoteText: { flex: 1, color: '#126B4B', fontSize: 12, lineHeight: 17 },
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
  filterScroll: { flexGrow: 0, maxHeight: 162, marginBottom: 11 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, paddingRight: 4, paddingBottom: 4 },
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
  buildingHeader: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.15,
    marginTop: 7,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
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
  verifiedText: { fontSize: 11, color: '#126B4B', fontWeight: '600' },
  unverifiedText: { fontSize: 11, color: '#8D5812', fontWeight: '600' },
  rowMeta: { alignItems: 'flex-end', gap: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingValue: { color: '#475467', fontSize: 13, fontWeight: '600' },
  distanceText: { color: '#667085', fontSize: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 12 },
  emptyTitle: { color: '#263244', fontWeight: '700', fontSize: 16 },
  emptyText: { color: '#667085', fontSize: 14, textAlign: 'center' },
});
