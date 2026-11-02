import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Bathroom, Coordinates } from '../main/types';

type Props = {
  bathrooms: Bathroom[];
  location: Coordinates | null;
  selectedBathroomId: string | null;
  onSelectBathroom: (bathroomId: string) => void;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function makeMapHtml(bathrooms: Bathroom[], location: Coordinates | null, selectedId: string | null) {
  const bathroomJson = safeJson(bathrooms);
  const locationJson = safeJson(location);
  const selectedJson = safeJson(selectedId);
  const selectedBathroom = bathrooms.find((bathroom) => (
    bathroom.id === selectedId
    && bathroom.latitude !== null
    && bathroom.longitude !== null
  ));
  const focus = selectedBathroom
    ? { latitude: selectedBathroom.latitude, longitude: selectedBathroom.longitude }
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
const focus=${focusJson}; const defaultCenter=[35.3003,-120.6625];
const center=focus?[focus.latitude,focus.longitude]:defaultCenter;
window.onerror=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}));
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView(center,selectedId?18:16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
bathrooms.forEach((bathroom)=>{
  if(typeof bathroom.latitude!=='number'||typeof bathroom.longitude!=='number') return;
  const active=bathroom.id===selectedId;
  const icon=L.divIcon({className:'',html:'<div class="toilet-pin '+(active?'active':'')+'">&#128701;</div>',iconSize:[38,38],iconAnchor:[19,19]});
  L.marker([bathroom.latitude,bathroom.longitude],{icon}).addTo(map).on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:bathroom.id})));
});
if(userLocation){L.marker([userLocation.latitude,userLocation.longitude],{icon:L.divIcon({className:'',html:'<div class="me-pin"></div>',iconSize:[19,19],iconAnchor:[9,9]})}).addTo(map)}
</script></body></html>`;
}

export function CampusMap({ bathrooms, location, selectedBathroomId, onSelectBathroom }: Props) {
  const [mapError, setMapError] = useState(false);
  const html = useMemo(
    () => makeMapHtml(bathrooms, location, selectedBathroomId),
    [bathrooms, location, selectedBathroomId],
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
