import Debug, { type Debugger } from 'debug';

const { name } = require('../package.json');

export type { Debugger as DebugLogger };

export function createDebugLogger(...names: string[]): Debugger {
    return names.reduce((debug, name) => debug.extend(name), Debug(name));
}
