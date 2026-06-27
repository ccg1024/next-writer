import { AnyIpcRequest, IPC_CHANNEL, IPC_CHANNELS, IpcChannel } from './ipc-contract';

type ValidationSuccess = {
  valid: true;
  request: AnyIpcRequest;
};

type ValidationFailure = {
  valid: false;
  message: string;
};

type IpcRequestValidation = ValidationSuccess | ValidationFailure;

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
  if (!isRecord(data) || !isNonEmptyString(data.id)) {
    return invalid('Read file request requires a non-empty id.');
  }

  return valid({ type, data: { id: data.id } } as AnyIpcRequest);
}

function validateWriteFile(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (!isRecord(data) || !isNonEmptyString(data.id) || typeof data.content !== 'string') {
    return invalid('Write file request requires a non-empty id and string content.');
  }

  if (!isOptionalFiniteNumber(data.revision)) {
    return invalid('Write file request revision must be a finite number.');
  }

  return valid({
    type,
    data: {
      id: data.id,
      content: data.content,
      revision: data.revision
    }
  } as AnyIpcRequest);
}

function validateUpdateCache(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (
    !isRecord(data) ||
    !isNonEmptyString(data.id) ||
    typeof data.content !== 'string' ||
    typeof data.isChange !== 'boolean'
  ) {
    return invalid('Update cache request requires id, content, and isChange.');
  }

  if (!isOptionalFiniteNumber(data.revision)) {
    return invalid('Update cache request revision must be a finite number.');
  }

  return valid({
    type,
    data: {
      id: data.id,
      content: data.content,
      isChange: data.isChange,
      revision: data.revision
    }
  } as AnyIpcRequest);
}

function validateUpdateLib(data: unknown, type: IpcChannel): IpcRequestValidation {
  if (!isRecord(data)) {
    return invalid('Update library request requires data.');
  }

  if (data.operate !== 'add' && data.operate !== 'del' && data.operate !== 'rename') {
    return invalid('Update library request operate must be add, del, or rename.');
  }

  if (data.operate === 'add') {
    if (!isNonEmptyString(data.parentId) || !isNonEmptyString(data.name)) {
      return invalid('Add library request requires parentId and name.');
    }

    if (data.type !== 'file' && data.type !== 'folder') {
      return invalid('Add library request type must be file or folder.');
    }

    return valid({
      type,
      data: {
        operate: data.operate,
        parentId: data.parentId,
        type: data.type,
        name: data.name
      }
    } as AnyIpcRequest);
  }

  if (data.operate === 'del') {
    if (!isNonEmptyString(data.id)) {
      return invalid('Delete library request requires id.');
    }

    return valid({
      type,
      data: {
        operate: data.operate,
        id: data.id
      }
    } as AnyIpcRequest);
  }

  if (!isNonEmptyString(data.id) || !isNonEmptyString(data.name)) {
    return invalid('Rename library request requires id and name.');
  }

  return valid({
    type,
    data: {
      operate: data.operate,
      id: data.id,
      name: data.name
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
