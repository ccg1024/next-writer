import { ResolveDocumentConflictRequest, ResolveDocumentConflictResponse } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class ResolveDocumentConflictHandler implements IIpcHandler<typeof IPC_CHANNEL.RESOLVE_DOCUMENT_CONFLICT> {
  channel = IPC_CHANNEL.RESOLVE_DOCUMENT_CONFLICT;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: ResolveDocumentConflictRequest): Promise<ResolveDocumentConflictResponse> {
    return this.documentService.resolveDocumentConflict(data);
  }
}

export default ResolveDocumentConflictHandler;
