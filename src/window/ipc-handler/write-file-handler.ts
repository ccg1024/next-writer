import { IPC_CHANNEL } from 'src/tools/config';
import { inject, injectable } from 'inversify';
import { WriteFileRequest } from '_types';
import IDocumentService from '../interface/document-service';
import INextIpcHandler from '../interface/next-ipc-handler';
import { TYPES } from '../types';

@injectable()
class WriteFileHandler implements INextIpcHandler<WriteFileRequest, void> {
  channel = IPC_CHANNEL.WRITE_FILE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: WriteFileRequest): Promise<void> {
    await this.documentService.writeFile(reqData);
  }
}

export default WriteFileHandler;
