// Sites accepts dist/ as its publishing directory. Copy sources unchanged.
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const source = fileURLToPath(new URL('public/', root));
const destination = fileURLToPath(new URL('dist/', root));
rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
