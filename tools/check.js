// `npm run build`: there is no bundling step, so this checks every file compiles and the world generates.
const {execFileSync} = require('child_process');
const fs = require('fs'), path = require('path');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p); } else if (p.endsWith('.js')) files.push(p); } })(path.join(__dirname, '..'));
for (const f of files) execFileSync(process.execPath, ['--check', f], {stdio: 'inherit'});
const {generateMap} = require('../server/map');
const m = generateMap(+process.env.MAP_SEED || 42);
require('../server/game');
console.log(`Build OK: ${files.length} files compile, world has ${m.landmarks.length} landmarks.`);
