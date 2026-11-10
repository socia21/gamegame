// Generates a random 64-bit access key. Put it in Railway → Variables → GAME_KEY and share it with your friends.
const k = require('crypto').randomBytes(8).toString('hex').toUpperCase();
console.log('\nYour new 64-bit game key:\n\n   ' + k.match(/.{4}/g).join('-') + '\n\nRailway variable:  GAME_KEY=' + k + '\n');
