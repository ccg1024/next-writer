import { inject, injectable } from 'inversify';
import { WriteFileRequest } from '_types';
import IDocumentService from '../interface/document-service';
import { IPC_CHANNEL } from '../ipc/ipc-contract';
import INextIpcHandler from '../interface/next-ipc-handler';
import { TYPES } from '../types';

@injectable()
class WriteFileHandler implements INextIpcHandler<typeof IPC_CHANNEL.WRITE_FILE> {
  channel = IPC_CHANNEL.WRITE_FILE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: WriteFileRequest): Promise<null> {
    await this.documentService.writeFile(reqData);
    return null;
  }
}

export default WriteFileHandler;
