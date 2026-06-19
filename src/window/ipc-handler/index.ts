// This file is to collect ipc event handler, which will be call the `apply` function of target handler for every ipc event
export { default as ReadConfigHandler } from './read-config-handler';
export { default as ReadFileHandler } from './read-file-handler';
export { default as UpdateLibHandler } from './update-lib-handler';
export { default as WriteFileHandler } from './write-file-handler';
export { default as RuntimeHandler } from './runtime-handler';
export { default as UpdateCacheHandler } from './update-cache-handler';
