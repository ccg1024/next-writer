import { inject, injectable } from 'inversify';
import { ReadFileRequest, ReadFileResponse } from '_types';
import IDocumentService from '../../interface/document-service';
import IIpcHandler from '../../interface/ipc-handler';
import IWorkspaceMetadataService from '../../interface/workspace-metadata-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading the specified file information
 */
@injectable()
class ReadFileHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_FILE> {
  channel = IPC_CHANNEL.READ_FILE;

  constructor(
    @inject(TYPES.IDocumentService) private documentService: IDocumentService,
    @inject(TYPES.IWorkspaceMetadataService) private workspaceMetadata: IWorkspaceMetadataService
  ) {}

  async handle(reqData: ReadFileRequest): Promise<ReadFileResponse> {
    const response = await this.documentService.readFile(reqData);
    // 访问历史属于辅助能力，持久化失败不能阻止已经成功读取的文档进入编辑器。
    await this.workspaceMetadata.recordOpened(response.session.id, response.session.path).catch(() => undefined);
    return response;
  }
}

export default ReadFileHandler;
