import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { sortBathrooms, formatDistance } from './location.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

function App() {
  const [bathrooms, setBathrooms] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/bathrooms?installationId=web-browser`).then((response) => {
      if (!response.ok) throw new Error('Unable to load bathrooms.');
      return response.json();
    }).then((data) => setBathrooms(data.bathrooms || [])).catch(() => setError('Bathrooms could not be loaded. Check that the API is running.'));
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState('unavailable'); return; }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationState('granted');
    }, () => { setLocation(null); setLocationState('denied'); }, { enableHighAccuracy: false, timeout: 10000 });
  }

  const results = useMemo(() => sortBathrooms(bathrooms, search, location), [bathrooms, search, location]);
  const selected = results.find(({ bathroom }) => bathroom.id === selectedId)?.bathroom;
  const center = selected || location || { latitude: 35.3003, longitude: -120.6625 };

  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">TOILETTRACKER</p><h1>Find a bathroom</h1></div><button className="location-button" onClick={requestLocation} disabled={locationState === 'loading'}>{locationState === 'loading' ? 'Locating…' : location ? 'Location enabled' : 'Use my location'}</button></header>
    {locationState === 'denied' || locationState === 'unavailable' ? <p className="notice">Location is optional. You can still browse the map and list; results are sorted by name.</p> : null}
    {error ? <p className="error">{error}</p> : null}
    <section className="workspace"><div className="map-card" aria-label="Bathroom map"><div className="map-grid">
      {results.map(({ bathroom }) => bathroom.latitude === null || bathroom.longitude === null ? null : <button key={bathroom.id} className={`map-marker ${selectedId === bathroom.id ? 'selected' : ''}`} style={{ left: `${50 + (bathroom.longitude - center.longitude) * 700}%`, top: `${50 - (bathroom.latitude - center.latitude) * 700}%` }} title={`Open ${bathroom.name}`} aria-label={`Open ${bathroom.name}`} onClick={() => setSelectedId(bathroom.id)}>●</button>)}
      {location ? <span className="user-marker" title="Your location" aria-label="Your location" /> : null}<div className="map-attribution">Map preview · © OpenStreetMap contributors</div>
    </div><p className="map-help">Select a marker to view its bathroom details.</p></div>
    <aside className="directory"><label htmlFor="search">Search bathrooms or buildings</label><input id="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" /><p className="result-summary">{location ? 'Sorted by distance' : 'Sorted alphabetically; location optional'}</p>
      {results.length === 0 ? <p className="empty">No bathrooms found.</p> : results.map(({ bathroom, distanceKilometers }) => <button className={`directory-row ${selectedId === bathroom.id ? 'active' : ''}`} key={bathroom.id} onClick={() => setSelectedId(bathroom.id)}><span className="pin">●</span><span><strong>{bathroom.name}</strong><small>{bathroom.building}</small></span><small>{formatDistance(distanceKilometers)}</small></button>)}
      {selected ? <div className="details"><h2>{selected.name}</h2><p>{selected.building}</p><p>{selected.directoryVerified ? 'Verified directory' : 'Demo / unverified'}</p><p>{selected.indoorDirections || 'Directions are not available yet.'}</p></div> : null}
    </aside></section>
  </main>;
}

export default App;
