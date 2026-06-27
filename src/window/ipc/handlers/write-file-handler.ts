import { inject, injectable } from 'inversify';
import { RootLibraryTree, WriteFileRequest } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class WriteFileHandler implements IIpcHandler<typeof IPC_CHANNEL.WRITE_FILE> {
  channel = IPC_CHANNEL.WRITE_FILE;

  constructor(@inject(TYPES.IDocumentService) private documentService: IDocumentService) {}

  async handle(reqData: WriteFileRequest): Promise<RootLibraryTree> {
    return this.documentService.writeFile(reqData);
  }
}

export default WriteFileHandler;
