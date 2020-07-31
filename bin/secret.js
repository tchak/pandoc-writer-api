// eslint-disable-next-line @typescript-eslint/no-var-requires
const secureRandom = require('secure-random');
const signingKey = secureRandom(256, { type: 'Buffer' });
console.log(signingKey.toString('hex'));
