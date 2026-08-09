import { inject, injectable } from 'inversify';
import { DocumentSession, GetDocumentSessionRequest } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class GetDocumentSessionHandler implements IIpcHandler<typeof IPC_CHANNEL.GET_DOCUMENT_SESSION> {
  channel = IPC_CHANNEL.GET_DOCUMENT_SESSION;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: GetDocumentSessionRequest): Promise<DocumentSession> {
    return this.documentService.getSession(data);
  }
}

export default GetDocumentSessionHandler;
