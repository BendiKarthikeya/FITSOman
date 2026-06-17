#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pkgPath = path.resolve('package.json');
let text = fs.readFileSync(pkgPath, 'utf8');
// Strip BOM if present
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
}
const obj = JSON.parse(text);
// Write back without BOM, pretty 2 spaces
fs.writeFileSync(pkgPath, JSON.stringify(obj, null, 2), { encoding: 'utf8' });
console.log('package.json normalized (UTF-8 no BOM)');

