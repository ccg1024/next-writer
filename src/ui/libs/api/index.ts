// ============================================================
// This file encapsulates the method of requesting data from the
// main process.
// ============================================================
import { Request, Response } from '_types';

async function api(param: Request): Promise<Response> {
  return window.ipc._post(param);
}

export default api;
