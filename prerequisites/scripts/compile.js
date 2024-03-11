/**
 * @file compile.js
 * Compiles the prerequisites data.
 * Usage: node compile.js <term>
 */

import reformat from './reformat.js';
import add from './add.js';
import assemble from './assemble.js';
import link from './link.js';

const args = process.argv.slice(2);

reformat();
assemble();
link();