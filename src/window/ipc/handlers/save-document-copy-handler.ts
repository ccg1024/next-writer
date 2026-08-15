import { SaveDocumentCopyRequest, SaveDocumentCopyResponse } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class SaveDocumentCopyHandler implements IIpcHandler<typeof IPC_CHANNEL.SAVE_DOCUMENT_COPY> {
  channel = IPC_CHANNEL.SAVE_DOCUMENT_COPY;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: SaveDocumentCopyRequest): Promise<SaveDocumentCopyResponse> {
    return this.documentService.saveDocumentCopy(data);
  }
}

export default SaveDocumentCopyHandler;
