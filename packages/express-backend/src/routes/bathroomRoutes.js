const express = require('express');
const {
  getBathroomSummaries,
  getBathroomSummary,
  submitReview,
} = require('../services/reviewService');
const {
  getMaintenanceReports,
  createMaintenanceReport,
  updateMaintenanceStatus,
} = require('../services/maintenanceService');
const { updateBathroomDirectory } = require('../services/directoryService');
const { timingSafeEqual } = require('node:crypto');

function createBathroomRouter(database, { adminToken, adminName }) {
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

  router.patch('/:bathroomId/directory', (request, response, next) => {
    if (!authorizeAdmin(request, response, adminToken)) return undefined;
    try {
      const row = updateBathroomDirectory(
        database,
        request.params.bathroomId,
        request.body,
        new Date(),
        adminName,
      );
      return response.json({ bathroom: getBathroomSummary(database, row.id, '') });
    } catch (error) {
      return sendServiceError(error, response, next);
    }
  });

  router.get('/:bathroomId/maintenance-reports', (request, response) => {
    if (!database.prepare('SELECT 1 FROM bathrooms WHERE id = ?').get(request.params.bathroomId)) {
      return response.status(404).json({ error: 'Bathroom not found.' });
    }
    return response.json({ reports: getMaintenanceReports(database, request.params.bathroomId) });
  });

  router.post('/:bathroomId/maintenance-reports', (request, response, next) => {
    try {
      const report = createMaintenanceReport(
        database,
        request.params.bathroomId,
        request.body,
      );
      return response.status(201).json({ report });
    } catch (error) {
      return sendServiceError(error, response, next);
    }
  });

  router.patch('/maintenance-reports/:reportId', (request, response, next) => {
    if (!authorizeAdmin(request, response, adminToken)) return undefined;
    const reportId = Number(request.params.reportId);
    if (!Number.isSafeInteger(reportId) || reportId < 1) {
      return response.status(400).json({ error: 'Maintenance report ID must be a positive integer.' });
    }
    try {
      const report = updateMaintenanceStatus(
        database,
        reportId,
        request.body,
        new Date(),
        adminName,
      );
      return response.json({ report });
    } catch (error) {
      return sendServiceError(error, response, next);
    }
  });

  return router;
}

function authorizeAdmin(request, response, expectedToken) {
  if (!expectedToken) {
    response.status(503).json({ error: 'Administrative actions are not configured.' });
    return false;
  }
  const authorization = request.get('authorization') || '';
  const suppliedToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  const expected = Buffer.from(expectedToken);
  const supplied = Buffer.from(suppliedToken);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    response.status(401).json({ error: 'A valid administrator token is required.' });
    return false;
  }
  return true;
}

function sendServiceError(error, response, next) {
  if (error.statusCode) return response.status(error.statusCode).json({ error: error.message });
  return next(error);
}

module.exports = { createBathroomRouter };