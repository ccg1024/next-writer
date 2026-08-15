import { DocumentSession } from '_types';

interface IDocumentSessionService {
  get(id: string): DocumentSession | null;
  getAll(): DocumentSession[];
  load(id: string, path: string, content: string, diskModifiedTime?: number): DocumentSession;
  updatePath(id: string, path: string): DocumentSession;
  updateContent(id: string, content: string, revision?: number): DocumentSession;
  beginSave(id: string, revision?: number): DocumentSession;
  completeSave(id: string, content: string, revision: number, diskModifiedTime?: number): DocumentSession;
  failSave(id: string, error: string, revision: number): DocumentSession;
  applyExternalContent(id: string, content: string, diskModifiedTime: number): DocumentSession;
  markConflict(id: string, diskContent: string, diskModifiedTime: number): DocumentSession;
  markUnavailable(id: string): DocumentSession;
  resolveWithDisk(id: string): DocumentSession;
  prepareLocalResolution(id: string): DocumentSession;
  remove(id: string): void;
  destroy(): void;
}

export default IDocumentSessionService;
