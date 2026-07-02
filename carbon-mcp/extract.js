/* Extract REAL Carbon data from installed @carbon/* packages into ./corpus JSON.
   No fabricated values — everything is read from node_modules. */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'corpus');
fs.mkdirSync(OUT, { recursive: true });

function writeJSON(name, data) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));
  console.log(`wrote corpus/${name}`);
}

// 1) Components — from custom-elements.json (VS Code custom-data format: {version, tags})
const cem = JSON.parse(
  fs.readFileSync(require.resolve('@carbon/web-components/custom-elements.json'), 'utf8')
);
const components = (cem.tags || []).map((t) => ({
  tag: t.name,
  description: (t.description || '').trim(),
  attributes: (t.attributes || []).map((a) => ({
    name: a.name,
    description: (a.description || '').trim(),
    values: (a.values || []).map((v) => v.name),
  })),
  properties: (t.properties || []).map((p) => ({
    name: p.name,
    description: (p.description || '').trim(),
  })),
}));
writeJSON('components.json', { source: '@carbon/web-components custom-elements.json', count: components.length, components });

// 2) Theme tokens — from @carbon/themes (g10/g90/g100/white maps of token -> value)
function tryRequire(mod) { try { return require(mod); } catch (e) { console.error(`skip ${mod}: ${e.message}`); return null; } }
const themesMod = tryRequire('@carbon/themes');
const themes = {};
if (themesMod) {
  for (const key of ['white', 'g10', 'g90', 'g100']) {
    if (themesMod[key] && typeof themesMod[key] === 'object') themes[key] = themesMod[key];
  }
}
writeJSON('themes.json', { source: '@carbon/themes', themes: Object.keys(themes), data: themes });

// 3) Color palette — from @carbon/colors
const colorsMod = tryRequire('@carbon/colors');
const colors = {};
if (colorsMod) for (const [k, v] of Object.entries(colorsMod)) if (typeof v === 'string' || typeof v === 'object') colors[k] = v;
writeJSON('colors.json', { source: '@carbon/colors', data: colors });

// 4) Spacing + type tokens — from @carbon/layout and @carbon/type
const layout = tryRequire('@carbon/layout');
const type = tryRequire('@carbon/type');
const tokens = {};
if (layout) for (const [k, v] of Object.entries(layout)) if (typeof v !== 'function') tokens[`layout.${k}`] = v;
if (type) for (const [k, v] of Object.entries(type)) if (typeof v !== 'function') tokens[`type.${k}`] = v;
writeJSON('tokens.json', { source: '@carbon/layout + @carbon/type', data: tokens });

console.log('DONE');
