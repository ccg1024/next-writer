import { FlushDocumentRequest, FlushDocumentResponse } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class FlushDocumentHandler implements IIpcHandler<typeof IPC_CHANNEL.FLUSH_DOCUMENT> {
  channel = IPC_CHANNEL.FLUSH_DOCUMENT;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: FlushDocumentRequest): Promise<FlushDocumentResponse> {
    return this.documentService.flushDocument(data.id);
  }
}

export default FlushDocumentHandler;
