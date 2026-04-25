const fs = require('fs');

function makeSvg(size, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect fill="${color}" width="${size}" height="${size}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="${size*0.5}" font-family="Arial">💊</text></svg>`;
}

fs.writeFileSync('logo192.png', makeSvg(192, '#2563eb'));
fs.writeFileSync('logo512.png', makeSvg(512, '#2563eb'));
fs.writeFileSync('favicon.ico', makeSvg(64, '#2563eb'));
console.log('✅ Icons created: logo192.png, logo512.png, favicon.ico');

