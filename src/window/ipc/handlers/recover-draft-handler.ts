import { DocumentSession, RecoverDraftRequest } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class RecoverDraftHandler implements IIpcHandler<typeof IPC_CHANNEL.RECOVER_DRAFT> {
  channel = IPC_CHANNEL.RECOVER_DRAFT;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: RecoverDraftRequest): Promise<DocumentSession> {
    return this.documentService.recoverDraft(data.id);
  }
}

export default RecoverDraftHandler;
