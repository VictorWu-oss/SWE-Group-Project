const express = require('express');

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

function validCoordinate(value) {
  return value
    && typeof value.latitude === 'number'
    && Number.isFinite(value.latitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && typeof value.longitude === 'number'
    && Number.isFinite(value.longitude)
    && value.longitude >= -180
    && value.longitude <= 180;
}

function decodePolyline(shape, precision = 6) {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const factor = 10 ** precision;

  while (index < shape.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = shape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = shape.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({ latitude: latitude / factor, longitude: longitude / factor });
  }
  return coordinates;
}

function createRoutingRouter({ routingFetch = fetch } = {}) {
  const router = express.Router();

  router.post('/walking', async (request, response, next) => {
    const { origin, destination } = request.body || {};
    if (!validCoordinate(origin) || !validCoordinate(destination)) {
      return response.status(400).json({ error: 'Origin and destination must be valid coordinates.' });
    }

    try {
      const routeResponse = await routingFetch(VALHALLA_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Client-Id': process.env.ROUTING_CLIENT_ID || 'toilet-tracker-development',
        },
        body: JSON.stringify({
          locations: [
            { lat: origin.latitude, lon: origin.longitude, type: 'break' },
            { lat: destination.latitude, lon: destination.longitude, type: 'break' },
          ],
          costing: 'pedestrian',
          units: 'kilometers',
          language: 'en-US',
        }),
      });
      if (!routeResponse.ok) {
        return response.status(502).json({ error: 'Walking route service is unavailable. Please try again.' });
      }
      const routeBody = await routeResponse.json();
      const leg = routeBody?.trip?.legs?.[0];
      if (!leg || typeof leg.shape !== 'string' || !Array.isArray(leg.maneuvers)) {
        return response.status(502).json({ error: 'Walking route service returned an invalid route.' });
      }

      return response.json({
        route: {
          coordinates: decodePolyline(leg.shape),
          distanceMeters: Math.round((routeBody.trip.summary?.length || 0) * 1000),
          durationSeconds: Math.round(routeBody.trip.summary?.time || 0),
          instructions: leg.maneuvers
            .filter((maneuver) => typeof maneuver.instruction === 'string')
            .map((maneuver) => maneuver.instruction),
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createRoutingRouter, decodePolyline };
