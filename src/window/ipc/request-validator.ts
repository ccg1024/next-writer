import { AnyIpcRequest, IPC_CHANNEL, IPC_CHANNELS, IpcChannel } from './ipc-contract';

type ValidationSuccess = {
  valid: true;
  request: AnyIpcRequest;
};

type ValidationFailure = {
  valid: false;
  message: string;
};

export type IpcRequestValidation = ValidationSuccess | ValidationFailure;

const ALLOWED_CHANNELS = new Set<string>(IPC_CHANNELS);

export function validateIpcRequest(value: unknown): IpcRequestValidation {
  if (!isRecord(value)) {
    return invalid('Invalid IPC request.');
  }

  const type = value.type;

  if (typeof type !== 'string' || !ALLOWED_CHANNELS.has(type)) {
    return invalid('Invalid IPC channel.');
  }

  const channel = type as IpcChannel;
  const data = value.data;

  switch (channel) {
    case IPC_CHANNEL.READ_CONFIG:
    case IPC_CHANNEL.RUNTIME:
      return validateNoPayload(value, channel);
    case IPC_CHANNEL.READ_FILE:
      return validateReadFile(data, channel);
    case IPC_CHANNEL.UPDATE_LIB:
      return validateUpdateLib(data, channel);
    case IPC_CHANNEL.WRITE_FILE:
      return validateWriteFile(data, channel);
    case IPC_CHANNEL.UPDATE_CACHE:
      return validateUpdateCache(data, channel);
    default:
      return invalid('Invalid IPC channel.');
  }
}

function validateNoPayload(value: Record<string, unknown>, type: IpcChannel): IpcRequestValidation {
  if ('data' in value && value.data !== undefined) {
    return invalid('IPC channel does not accept request data.');
  }

  return valid({ type } as AnyIpcRequest);
}

function validateReadFile(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (!isRecord(data) || !isNonEmptyString(data.path)) {
    return invalid('Read file request requires a non-empty path.');
  }

  return valid({ type, data: { path: data.path } } as AnyIpcRequest);
}

function validateWriteFile(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (!isRecord(data) || !isNonEmptyString(data.path) || typeof data.content !== 'string') {
    return invalid('Write file request requires a non-empty path and string content.');
  }

  if (data.nameInRuntime !== undefined && typeof data.nameInRuntime !== 'string') {
    return invalid('Write file request nameInRuntime must be a string.');
  }

  if (!isOptionalFiniteNumber(data.revision)) {
    return invalid('Write file request revision must be a finite number.');
  }

  return valid({
    type,
    data: {
      path: data.path,
      content: data.content,
      nameInRuntime: data.nameInRuntime,
      revision: data.revision
    }
  } as AnyIpcRequest);
}

function validateUpdateCache(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (
    !isRecord(data) ||
    !isNonEmptyString(data.path) ||
    typeof data.content !== 'string' ||
    typeof data.isChange !== 'boolean'
  ) {
    return invalid('Update cache request requires path, content, and isChange.');
  }

  if (!isOptionalFiniteNumber(data.revision)) {
    return invalid('Update cache request revision must be a finite number.');
  }

  return valid({
    type,
    data: {
      path: data.path,
      content: data.content,
      isChange: data.isChange,
      revision: data.revision
    }
  } as AnyIpcRequest);
}

function validateUpdateLib(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (!isRecord(data) || !isNonEmptyString(data.path)) {
    return invalid('Update library request requires a non-empty path.');
  }

  if (data.operate !== 'add' && data.operate !== 'del' && data.operate !== 'update') {
    return invalid('Update library request operate must be add, del, or update.');
  }

  if (data.type !== 'file' && data.type !== 'folder') {
    return invalid('Update library request type must be file or folder.');
  }

  if (data.pathInRuntime !== undefined && typeof data.pathInRuntime !== 'string') {
    return invalid('Update library request pathInRuntime must be a string.');
  }

  return valid({
    type,
    data: {
      operate: data.operate,
      path: data.path,
      type: data.type,
      pathInRuntime: data.pathInRuntime
    }
  } as AnyIpcRequest);
}

function valid(request: AnyIpcRequest): ValidationSuccess {
  return { valid: true, request };
}

function invalid(message: string): ValidationFailure {
  return { valid: false, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}
