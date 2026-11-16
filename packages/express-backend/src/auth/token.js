const jwt = require('jsonwebtoken');

const TOKEN_LIFETIME = '1d';

function signAccessToken(username, secret) {
  return jwt.sign({ username }, secret, { expiresIn: TOKEN_LIFETIME });
}

// Throws jwt.TokenExpiredError or jwt.JsonWebTokenError on failure.
function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret);
}

module.exports = { signAccessToken, verifyAccessToken, TOKEN_LIFETIME };
