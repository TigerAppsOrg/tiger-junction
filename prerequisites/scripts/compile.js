import reformat from './reformat.js';
import assemble from './assemble.js';
import link from './link.js';

const args = process.argv.slice(2);

reformat();
assemble();
link();