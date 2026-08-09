import { inject, injectable } from 'inversify';
import { DocumentSession, UpdateDocumentSessionRequest } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class UpdateDocumentSessionHandler implements IIpcHandler<typeof IPC_CHANNEL.UPDATE_DOCUMENT_SESSION> {
  channel = IPC_CHANNEL.UPDATE_DOCUMENT_SESSION;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: UpdateDocumentSessionRequest): Promise<DocumentSession> {
    return this.documentService.updateSession(data);
  }
}

export default UpdateDocumentSessionHandler;
