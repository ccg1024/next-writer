import { inject, injectable } from 'inversify';
import { ReadFileRequest, ReadFileResponse } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading the specified file information
 */
@injectable()
class ReadFileHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_FILE> {
  channel = IPC_CHANNEL.READ_FILE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: ReadFileRequest): Promise<ReadFileResponse> {
    return this.documentService.readFile(reqData);
  }
}

export default ReadFileHandler;
