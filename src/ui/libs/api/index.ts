// ============================================================
// This file encapsulates the method of requesting data from the
// main process.
// ============================================================
import { Request, Response } from '_types';

async function api<T, U = unknown>(param: Request<T>): Promise<Response<U>> {
  return window.ipc._post<T, U>(param);
}

export default api;
