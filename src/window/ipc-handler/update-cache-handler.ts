import { inject, injectable } from 'inversify';
import { UpdateCacheRequest } from '_types';
import IDocumentService from '../interface/document-service';
import { IPC_CHANNEL } from '../ipc/ipc-contract';
import INextIpcHandler from '../interface/next-ipc-handler';
import { TYPES } from '../types';

@injectable()
class UpdateCacheHandler implements INextIpcHandler<typeof IPC_CHANNEL.UPDATE_CACHE> {
  channel = IPC_CHANNEL.UPDATE_CACHE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: UpdateCacheRequest): Promise<{ success: boolean }> {
    return this.documentService.updateCache(reqData);
  }
}

export default UpdateCacheHandler;
