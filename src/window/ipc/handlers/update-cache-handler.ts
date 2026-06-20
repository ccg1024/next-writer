import { inject, injectable } from 'inversify';
import { UpdateCacheRequest } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class UpdateCacheHandler implements IIpcHandler<typeof IPC_CHANNEL.UPDATE_CACHE> {
  channel = IPC_CHANNEL.UPDATE_CACHE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: UpdateCacheRequest): Promise<{ success: boolean }> {
    return this.documentService.updateCache(reqData);
  }
}

export default UpdateCacheHandler;
