const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('./token');

// Reusable middleware for routes that require a signed-in user.
// Expects "Authorization: Bearer <JWT>" and sets request.user on success.
// Every failure is a 401 with { error } so clients can show a clear message.
function createRequireUser(tokenSecret) {
  return function requireUser(request, response, next) {
    if (!tokenSecret) {
      return response.status(503).json({ error: 'Sign-in is not configured.' });
    }

    const authorization = request.get('authorization');
    if (!authorization) {
      return response.status(401).json({ error: 'Sign in to continue.' });
    }

    const parts = authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return response.status(401).json({
        error: 'Authorization header must use the format "Bearer <token>".',
      });
    }

    try {
      const payload = verifyAccessToken(parts[1], tokenSecret);
      request.user = { username: payload.username };
      return next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return response.status(401).json({ error: 'Your session has expired. Sign in again.' });
      }
      return response.status(401).json({ error: 'Your sign-in token is invalid. Sign in again.' });
    }
  };
}

module.exports = { createRequireUser };
