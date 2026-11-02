const express = require('express');
const {
  getBathroomSummaries,
  getBathroomSummary,
  submitReview,
} = require('../services/reviewService');

function createBathroomRouter(database) {
  const router = express.Router();

  router.get('/', (request, response) => {
    const installationId = request.query.installationId || '';
    const search = request.query.search || '';
    if (typeof installationId !== 'string' || typeof search !== 'string') {
      return response.status(400).json({ error: 'Installation ID and search must be strings.' });
    }
    return response.json({
      bathrooms: getBathroomSummaries(database, installationId, new Date(), search),
    });
  });

  router.get('/:bathroomId', (request, response) => {
    const installationId = request.query.installationId || '';
    if (typeof installationId !== 'string') {
      return response.status(400).json({ error: 'Installation ID must be a string.' });
    }
    const bathroom = getBathroomSummary(
      database,
      request.params.bathroomId,
      installationId,
    );
    if (!bathroom) return response.status(404).json({ error: 'Bathroom not found.' });
    return response.json({ bathroom });
  });

  router.post('/:bathroomId/reviews', (request, response, next) => {
    try {
      const requestBody = request.body;
      const reviewInput = typeof requestBody === 'object'
        && requestBody !== null
        && !Array.isArray(requestBody)
        ? { ...requestBody, bathroomId: request.params.bathroomId }
        : requestBody;
      const bathroom = submitReview(database, reviewInput);
      return response.status(201).json({ bathroom });
    } catch (error) {
      if (error.statusCode) {
        return response.status(error.statusCode).json({ error: error.message });
      }
      return next(error);
    }
  });

  return router;
}

module.exports = { createBathroomRouter };