import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
const center=[35.3003,-120.6625];
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView(center,16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
bathrooms.forEach((bathroom)=>{
  const active=bathroom.id===selectedId;
  const icon=L.divIcon({className:'',html:'<div class="toilet-pin '+(active?'active':'')+'">&#128701;</div>',iconSize:[38,38],iconAnchor:[19,19]});
  L.marker([bathroom.latitude,bathroom.longitude],{icon}).addTo(map).on('click',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',id:bathroom.id})));
});
if(userLocation){L.marker([userLocation.latitude,userLocation.longitude],{icon:L.divIcon({className:'',html:'<div class="me-pin"></div>',iconSize:[19,19],iconAnchor:[9,9]})}).addTo(map)}
</script></body></html>`;
}

export function CampusMap({ bathrooms, location, selectedBathroomId, onSelectBathroom }: Props) {
  const html = useMemo(
    () => makeMapHtml(bathrooms, location, selectedBathroomId),
    [bathrooms, location, selectedBathroomId],
  );

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (message.type === 'select' && message.id) onSelectBathroom(message.id);
    } catch {
      // Ignore malformed messages from the embedded map.
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
    </View>
  );
}

const styles = StyleSheet.create({
  mapFrame: { flex: 1, overflow: 'hidden', backgroundColor: '#E8EDF2' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  loading: { position: 'absolute', alignSelf: 'center', top: '48%', zIndex: 1 },
});