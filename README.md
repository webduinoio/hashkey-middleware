hashkey-middleware
==================

驗證使用權限的 Middleware。

CLI Usage
---------

    node index.js [number|hashkey]

Hashkey
---------

- 用來使用 API 的鑰匙
- 在生產環境中的有效時間為 15 分鐘
- Package: [Hashids](https://www.npmjs.com/package/hashids)

```js
const Hashids = require('hashids/cjs');
const hashSalt = process.env.SALT || 'my salt';
const idHashids = new Hashids(hashSalt, 32, '0123456789abcdef');

function genHashId(id = 141236) {
    const time = Date.now();    // Timestamp
    const idHash = idHashids.encode([id, time]);  // encode id and time to fake hex
    return idHash;
}

// 編碼
const idHash = genHashId();
// 解碼
const decodedId = idHashids.decode(idHash);

console.log('Original ID: %d', id);
console.log('Encoded ID: %s', idHash);
console.log('Decoded ID: %j', decodedId);
```
