const express = require('express');
const {
  getBathroomSummaries,
  getBathroomSummary,
  submitReview,
} = require('../services/reviewService');

function createBathroomRouter(database) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({ bathrooms: getBathroomSummaries(database, request.query.installationId || '') });
  });

  router.get('/:bathroomId', (request, response) => {
    const bathroom = getBathroomSummary(
      database,
      request.params.bathroomId,
      request.query.installationId || '',
    );
    if (!bathroom) return response.status(404).json({ error: 'Bathroom not found.' });
    return response.json({ bathroom });
  });

  router.post('/:bathroomId/reviews', (request, response, next) => {
    try {
      const bathroom = submitReview(database, {
        bathroomId: request.params.bathroomId,
        installationId: request.body.installationId,
        cleanliness: request.body.cleanliness,
        busyness: request.body.busyness,
      });
      return response.status(201).json({ bathroom });
    } catch (error) {
      if (error.statusCode) return response.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = { createBathroomRouter };