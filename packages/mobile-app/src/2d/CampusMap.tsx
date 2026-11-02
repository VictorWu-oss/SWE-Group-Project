import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Bathroom, Coordinates } from '../main/types';

type Props = {
  bathrooms: Bathroom[];
  location: Coordinates | null;
  selectedBathroomId: string | null;
  routeCoordinates: Coordinates[] | null;
  onSelectBathroom: (bathroomId: string) => void;
};

type BuildingLocation = { latitude: number; longitude: number };

// Building-centroid coordinates sourced from Cal Poly Facilities' public Building
// Footprints layer. They deliberately identify a building, not an indoor restroom.
const BUILDING_LOCATIONS: Record<string, BuildingLocation> = {
  'Administration Building (1)': { latitude: 35.301015, longitude: -120.658555 },
  'Cotchett Education Building (2)': { latitude: 35.300244, longitude: -120.664487 },
  'Business Building (3)': { latitude: 35.299962, longitude: -120.664883 },
  'Research Development Center Building (4)': { latitude: 35.305368, longitude: -120.664921 },
  'Aero Hangar Building (4A)': { latitude: 35.305599, longitude: -120.664683 },
  'Architecture & Environmental Design Building (5)': { latitude: 35.30078, longitude: -120.664354 },
  'Advanced Technology Laboratories Building (7)': { latitude: 35.3022, longitude: -120.665088 },
  'Bioresource & Ag Engineering Shop Building (8A)': { latitude: 35.303469, longitude: -120.662292 },
  'Farm Shop Building (9)': { latitude: 35.304399, longitude: -120.66231 },
  'Engineering Building (13)': { latitude: 35.301532, longitude: -120.665193 },
  'Frank E. Pilling Building (14)': { latitude: 35.300088, longitude: -120.66217 },
  'Beef Unit Building (16)': { latitude: 35.307229, longitude: -120.663335 },
  'Dairy Science Building (18)': { latitude: 35.307175, longitude: -120.672586 },
  'Engineering East Building (20)': { latitude: 35.300332, longitude: -120.661529 },
  'Center for Engineering Excellence (20A)': { latitude: 35.300122, longitude: -120.661542 },
  'Engineering West Building (21)': { latitude: 35.299958, longitude: -120.663232 },
  'Food Processing Building (24)': { latitude: 35.303574, longitude: -120.662979 },
  'Graphic Arts Building (26)': { latitude: 35.29929, longitude: -120.661735 },
  'Health Center Building (27)': { latitude: 35.297912, longitude: -120.661215 },
  'Clyde P. Fisher Science Hall (33)': { latitude: 35.302179, longitude: -120.659301 },
  'Walter F. Dexter Building (34)': { latitude: 35.301111, longitude: -120.66348 },
  'Grant M. Brown Engineering Building (41A)': { latitude: 35.302511, longitude: -120.666265 },
  'Recreation Center Building (43)': { latitude: 35.298253, longitude: -120.659788 },
  'Kinesiology Building (43A)': { latitude: 35.298828, longitude: -120.659816 },
  'H.P. Davidson Music Center (45)': { latitude: 35.299337, longitude: -120.657953 },
  'Old Natatorium Building (46)': { latitude: 35.299094, longitude: -120.664193 },
  'Faculty Offices North Building (47)': { latitude: 35.302311, longitude: -120.659717 },
  'Environmental Horticultural Science Building (48Q)': { latitude: 35.30868, longitude: -120.662476 },
  'Mt. Bishop Warehouse Building (50J)': { latitude: 35.3045, longitude: -120.671468 },
  'Rose Float Lab Building (50L)': { latitude: 35.304011, longitude: -120.671127 },
  'Science Building (52)': { latitude: 35.300499, longitude: -120.659962 },
  'Swine Unit Building (56)': { latitude: 35.311997, longitude: -120.672858 },
  'Veterinary Hospital Building (57)': { latitude: 35.305914, longitude: -120.670334 },
  'Crandall Gymnasium Building (60)': { latitude: 35.299518, longitude: -120.664135 },
  'University Union Building (65)': { latitude: 35.300053, longitude: -120.659212 },
  'Facilities Building (70)': { latitude: 35.30388, longitude: -120.659621 },
  'Plant Conservatory Building (72)': { latitude: 35.304809, longitude: -120.658888 },
  'Eucalyptus House Building (73)': { latitude: 35.30482, longitude: -120.660581 },
  'EHS - New Library Service Building (80)': { latitude: 35.303561, longitude: -120.660779 },
  'Corporation Warehouse Building (82)': { latitude: 35.305232, longitude: -120.67091 },
  'Chase Hall Building (115)': { latitude: 35.297914, longitude: -120.663742 },
  'Jespersen Hall Building (116)': { latitude: 35.297755, longitude: -120.664452 },
  'Student Services Building (124)': { latitude: 35.298542, longitude: -120.663984 },
  'Animal Nutrition Center Building (154)': { latitude: 35.311907, longitude: -120.67818 },
  'E. & J. Gallo Building (156)': { latitude: 35.303793, longitude: -120.669485 },
  'Lohr Family Winery Building (157)': { latitude: 35.303413, longitude: -120.669155 },
  'Aliso Building (171A)': { latitude: 35.30681, longitude: -120.659173 },
  'Inyo Building (171I)': { latitude: 35.307536, longitude: -120.658643 },
  'Warren J. Baker Center for Science and Mathematics Building (180)': { latitude: 35.301281, longitude: -120.660547 },
  'William and Linda Frost Center for Research and Innovation Building (181)': { latitude: 35.301859, longitude: -120.660686 },
  'Construction Innovations Center (186)': { latitude: 35.299238, longitude: -120.662722 },
  'Engineering IV Building (192)': { latitude: 35.302897, longitude: -120.664848 },
  'Engineering IV Building (197)': { latitude: 35.302508, longitude: -120.664193 },
};

export function getBathroomMapLocation(bathroom: Bathroom): BuildingLocation | null {
  if (typeof bathroom.latitude === 'number' && typeof bathroom.longitude === 'number') {
    return { latitude: bathroom.latitude, longitude: bathroom.longitude };
  }
  return BUILDING_LOCATIONS[bathroom.building] ?? null;
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function makeMapHtml(
  bathrooms: Bathroom[],
  location: Coordinates | null,
  selectedId: string | null,
  routeCoordinates: Coordinates[] | null,
) {
  // Directory entries represent rooms, while map pins represent their building centroid.
  const mapBathrooms = bathrooms.map((bathroom, index) => {
    const buildingLocation = getBathroomMapLocation(bathroom);
    const column = index % 8;
    const row = Math.floor(index / 8);
    return {
      ...bathroom,
      mapLatitude: buildingLocation?.latitude ?? 35.3014 - row * 0.00042,
      mapLongitude: buildingLocation?.longitude ?? -120.6638 + column * 0.00042,
      approximatePin: bathroom.latitude === null || bathroom.longitude === null,
    };
  });
  const bathroomJson = safeJson(mapBathrooms);
  const locationJson = safeJson(location);
  const selectedJson = safeJson(selectedId);
  const routeJson = safeJson(routeCoordinates);
  const selectedBathroom = mapBathrooms.find((bathroom) => bathroom.id === selectedId);
  const focus = selectedBathroom
    ? { latitude: selectedBathroom.mapLatitude, longitude: selectedBathroom.mapLongitude }
    : location;
  const focusJson = safeJson(focus);

  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html,body,#map{height:100%;width:100%;margin:0;background:#e8edf2} .leaflet-container{font-family:-apple-system,BlinkMacSystemFont,sans-serif}
.toilet-pin{width:34px;height:34px;border:2px solid #fff;border-radius:50%;background:#00b884;box-shadow:0 2px 8px #192a3a35;display:grid;place-items:center;color:#fff;font-size:19px;font-weight:700}
.toilet-pin.active{background:#3478f6;transform:scale(1.12)} .me-pin{width:19px;height:19px;border:4px solid #fff;border-radius:50%;background:#3478f6;box-shadow:0 1px 8px #1f4e9d80}
.leaflet-control-attribution{font-size:8px!important} .leaflet-bottom{bottom:4px}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const bathrooms=${bathroomJson}; const userLocation=${locationJson}; const selectedId=${selectedJson};
const routeCoordinates=${routeJson};
const focus=${focusJson}; const defaultCenter=[35.3003,-120.6625];
const center=focus?[focus.latitude,focus.longitude]:defaultCenter;
window.onerror=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}));
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView(center,selectedId?18:16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
bathrooms.forEach((bathroom)=>{
  const active=bathroom.id===selectedId;
  const icon=L.divIcon({className:'',html:'<div class="toilet-pin '+(active?'active':'')+'">&#128701;</div>',iconSize:[38,38],iconAnchor:[19,19]});
  const marker=L.marker([bathroom.mapLatitude,bathroom.mapLongitude],{icon}).addTo(map);
  if(bathroom.approximatePin){marker.bindTooltip('Approximate building pin',{direction:'top'});}
  marker.on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:bathroom.id})));
});
if(userLocation){L.marker([userLocation.latitude,userLocation.longitude],{icon:L.divIcon({className:'',html:'<div class="me-pin"></div>',iconSize:[19,19],iconAnchor:[9,9]})}).addTo(map)}
const destination=bathrooms.find((bathroom)=>bathroom.id===selectedId);
if(routeCoordinates&&routeCoordinates.length>1){
  const route=routeCoordinates.map((point)=>[point.latitude,point.longitude]);
  L.polyline(route,{color:'#3478f6',weight:5,opacity:0.9}).addTo(map);
  map.fitBounds(route,{padding:[38,38],maxZoom:16});
}
</script></body></html>`;
}

export function CampusMap({
  bathrooms, location, selectedBathroomId, routeCoordinates, onSelectBathroom,
}: Props) {
  const [mapError, setMapError] = useState(false);
  const html = useMemo(
    () => makeMapHtml(bathrooms, location, selectedBathroomId, routeCoordinates),
    [bathrooms, location, selectedBathroomId, routeCoordinates],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackTitle}>Campus map preview</Text>
        <Text style={styles.webFallbackText}>
          The interactive map is available in the iOS and Android app. Use the bathroom list below in web mode.
        </Text>
      </View>
    );
  }

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (typeof message !== 'object' || message === null || Array.isArray(message)) {
        throw new Error('Map sent an invalid message.');
      }
      if ('type' in message && message.type === 'select' && 'id' in message
        && typeof message.id === 'string') {
        onSelectBathroom(message.id);
      } else if ('type' in message && message.type === 'error') {
        setMapError(true);
      }
    } catch (error) {
      console.warn('Unable to process an embedded map message.', error);
    }
  }

  return (
    <View style={styles.mapFrame}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={styles.loading} color="#3478F6" />}
        style={styles.webView}
      />
      {mapError ? (
        <View style={styles.mapError}>
          <Text style={styles.mapErrorTitle}>Map tiles could not be loaded</Text>
          <Text style={styles.mapErrorText}>
            Check your internet connection. Bathroom search and the list remain available.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: { flex: 1, overflow: 'hidden', backgroundColor: '#E8EDF2' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  loading: { position: 'absolute', alignSelf: 'center', top: '48%', zIndex: 1 },
  mapError: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 52,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  mapErrorTitle: { color: '#253143', fontSize: 13, fontWeight: '700' },
  mapErrorText: { color: '#667085', fontSize: 11, lineHeight: 16, marginTop: 4 },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#E8EDF2' },
  webFallbackTitle: { color: '#253143', fontSize: 18, fontWeight: '700' },
  webFallbackText: { color: '#667085', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8, maxWidth: 360 },
});
