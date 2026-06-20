import { inject, injectable } from 'inversify';
import { LibraryTree, UpdateLibRequest } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import ILibraryService from '../../interface/library-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Update library tree object, which locate in main process store
 * 处理文件夹操作：添加文件，删除文件，添加文件夹，删除文件夹，重命名文件夹，文件的重命名是写操作
 */
@injectable()
class UpdateLibHandler implements IIpcHandler<typeof IPC_CHANNEL.UPDATE_LIB> {
  channel = IPC_CHANNEL.UPDATE_LIB;

  constructor(@inject(TYPES.ILibraryService) private libraryService: ILibraryService) {}

  async handle(data: UpdateLibRequest): Promise<LibraryTree | Record<string, never>> {
    return this.libraryService.updateLibrary(data);
  }
}

export default UpdateLibHandler;
