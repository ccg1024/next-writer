import { IPC_CHANNEL } from 'src/tools/config';
import { inject, injectable } from 'inversify';
import { ReadFileRequest, ReadFileResponse } from '_types';
import IDocumentService from '../interface/document-service';
import INextIpcHandler from '../interface/next-ipc-handler';
import { TYPES } from '../types';

/**
 * Reading the specified file information
 */
@injectable()
class ReadFileHandler implements INextIpcHandler<ReadFileRequest, ReadFileResponse> {
  channel = IPC_CHANNEL.READ_FILE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: ReadFileRequest): Promise<ReadFileResponse> {
    return this.documentService.readFile(reqData);
  }
}

export default ReadFileHandler;
