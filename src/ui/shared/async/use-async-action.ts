import { useCallback } from 'react';
import { App } from 'antd';
import { nwSpin } from 'src/ui/mix-components/spin';

type AsyncActionOptions = {
  loading?: boolean;
  errorMessage?: string;
};

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: AsyncActionOptions = {}
) {
  const { message } = App.useApp();
  const { loading = true, errorMessage = '操作失败' } = options;

  return useCallback(
    async (...args: TArgs) => {
      if (loading) {
        nwSpin.loading(true);
      }

      try {
        return await action(...args);
      } catch (error) {
        message.error(error instanceof Error ? error.message : errorMessage);
        throw error;
      } finally {
        if (loading) {
          nwSpin.loading(false);
        }
      }
    },
    [action, errorMessage, loading, message]
  );
}
