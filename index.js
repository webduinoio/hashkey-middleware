'use strict';

const Hashids = require('hashids/cjs');
const NODE_ENV = process.env.NODE_ENV;
const isProduction = (NODE_ENV === 'production');
const IGNORE_AUTH_PATH_REGEX = process.env.IGNORE_AUTH_PATH_REGEX || '';

function isIgnoredPath(path) {
  return IGNORE_AUTH_PATH_REGEX !== '' && path.search(IGNORE_AUTH_PATH_REGEX) >= 0;
}

function genHashId(idHashids, id = 141236) {
  const time = Date.now();    // Timestamp
  const idHash = idHashids.encode([id, time]);  // encode id and time to fake hex
  return idHash;
}

function decHashId(idHashids, encrypted) {
  const decoded = idHashids.decode(encrypted);
  return decoded;
}

function hashKeyMiddlewareWrapper (options = {
  salt: process.env.SALT || 'my salt',
  hashkeyAliveTime: process.env.HASHKEY_ALIVE_TIME || 15,
  isMainModule: false,
}) {
  const hashSalt = options.salt;
  // Hashkey alive time (minutes)
  const HASHKEY_ALIVE_TIME = options.hashkeyAliveTime  * 60 * 1000;
  const idHashids = new Hashids(hashSalt, 32, '0123456789abcdef');

  if (options.isMainModule === true) {
    const hashid = genHashId(idHashids, process.argv[2]);
    let decoded = decHashId(idHashids, process.argv[2]);
        decoded = { id: decoded[0], time: new Date(decoded[1]) };
    return {
      hashid,
      decoded: decoded || decHashId(idHashids, hashid),
    };
  }

  return function hashKeyMiddleware(req, res, next) {
    if (isIgnoredPath(req.path)) {
      return next();
    }

    const hashKey = req.query.hashkey || req.query.access_token;
    const decodedKey = decHashId(idHashids, hashKey);
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const err = new Error('E_ACCESS_DENIED');
          err.name = 'E_ACCESS_DENIED';
          err.statusCode = 403;

    res.locals.ip = ip;
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
    next();
  };
};

if (require.main === module) {
  const hashid = hashKeyMiddlewareWrapper({
    salt: process.env.SALT,
    isMainModule: true,
  });

  console.log(hashid);
} else {
  module.exports = hashKeyMiddlewareWrapper;
}