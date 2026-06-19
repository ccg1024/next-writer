import { IPC_CHANNEL } from 'src/tools/config';
import { inject, injectable } from 'inversify';
import { UpdateCacheRequest } from '_types';
import IDocumentService from '../interface/document-service';
import INextIpcHandler from '../interface/next-ipc-handler';
import { TYPES } from '../types';

@injectable()
class UpdateCacheHandler implements INextIpcHandler<UpdateCacheRequest, { success: boolean }> {
  channel = IPC_CHANNEL.UPDATE_CACHE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: UpdateCacheRequest): Promise<{ success: boolean }> {
    return this.documentService.updateCache(reqData);
  }
}

export default UpdateCacheHandler;
