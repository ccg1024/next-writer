import { DiscardRecoveryDraftRequest } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class DiscardRecoveryDraftHandler implements IIpcHandler<typeof IPC_CHANNEL.DISCARD_RECOVERY_DRAFT> {
  channel = IPC_CHANNEL.DISCARD_RECOVERY_DRAFT;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: DiscardRecoveryDraftRequest): Promise<{ success: boolean }> {
    return this.documentService.discardRecoveryDraft(data.id, data.createdAt, data.revision);
  }
}

export default DiscardRecoveryDraftHandler;
