import { GetRecoveryDraftRequest, GetRecoveryDraftResponse } from '_types';
import { inject, injectable } from 'inversify';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class GetRecoveryDraftHandler implements IIpcHandler<typeof IPC_CHANNEL.GET_RECOVERY_DRAFT> {
  channel = IPC_CHANNEL.GET_RECOVERY_DRAFT;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  handle(data: GetRecoveryDraftRequest): Promise<GetRecoveryDraftResponse> {
    return this.documentService.getRecoveryDraft(data.id);
  }
}

export default GetRecoveryDraftHandler;
