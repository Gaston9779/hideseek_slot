// Minimal typings so the math tests can use node:crypto / node:fs without adding @types/node.
declare module 'node:crypto'{export function createHash(a:string):{update(s:string):{digest(e:'hex'):string}}}
declare module 'node:fs'{export function readFileSync(p:string,enc:'utf8'):string;export function writeFileSync(p:string,d:string):void;export function mkdirSync(p:string,o?:{recursive?:boolean}):string|undefined}
declare var process:{argv:string[]};
