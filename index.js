'use strict';

const Hashids = require('hashids');
const NODE_ENV = process.env.NODE_ENV;
const isProduction = (NODE_ENV === 'production');
const IGNORE_AUTH_PATH_REGEX = process.env.IGNORE_AUTH_PATH_REGEX || /(web)/;

function isIgnoredPath(path) {
  return path.search(IGNORE_AUTH_PATH_REGEX) >= 0;
}

function hashKeyMiddlewareWrapper (options = {
  salt: process.env.SALT || 'my salt',
  hashkeyAliveTime: process.env.HASHKEY_ALIVE_TIME || 15,
}) {
  const hashSalt = options.salt;
  const idHashids = new Hashids(hashSalt, 32, '0123456789abcdef');
  // Hashkey alive time (minutes)
  const HASHKEY_ALIVE_TIME = options.hashkeyAliveTime  * 60 * 1000;

  return function hashKeyMiddleware(req, res, next) {
    if (isIgnoredPath(req.path)) {
      return next();
    }

    const hashKey = req.query.hashkey || req.query.access_token;
    const decodedKey = idHashids.decode(hashKey);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const err = new Error('E_ACCESS_DENIED');
          err.name = 'E_ACCESS_DENIED';
          err.statusCode = 403;

    if (decodedKey.length < 2) {
      next(err);
      return;
    }

    const now = Date.now();
    const timeFromHash = decodedKey[1];

    if (isProduction && (HASHKEY_ALIVE_TIME > 0) && (timeFromHash + (HASHKEY_ALIVE_TIME) < now)) {
      next(err);
      return;
    }

    res.locals.userId = decodedKey[0];
    res.locals.hashKey = hashKey;
    res.locals.ip = ip;
    next();
  };
};

module.exports = hashKeyMiddlewareWrapper;