import { useState, useCallback } from 'react';
import { showToast } from '../../../utils/toast';

interface CRUDState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

interface CRUDActions<T> {
  fetchAll: () => Promise<void>;
  fetchById: (id: string | number) => Promise<T | null>;
  create: (data: any) => Promise<void>;
  update: (id: string | number, data: any) => Promise<void>;
  delete: (id: string | number) => Promise<void>;
}

export const useCRUD = <T,>(apiService: any, resourceName: string): [CRUDState<T>, CRUDActions<T>] => {
  const [state, setState] = useState<CRUDState<T>>({
    items: [],
    loading: false,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiService.getAll();
      setState((prev) => ({
        ...prev,
        items: response.data || response,
        loading: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to fetch ${resourceName}`;
      setState((prev) => ({ ...prev, error: message, loading: false }));
      showToast.error(message);
    }
  }, [apiService, resourceName]);

  const fetchById = useCallback(
    async (id: string | number) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await apiService.getById(id);
        setState((prev) => ({ ...prev, loading: false }));
        return response.data || response;
      } catch (error: any) {
        const message = error.response?.data?.message || `Failed to fetch ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
        return null;
      }
    },
    [apiService, resourceName]
  );

  const create = useCallback(
    async (data: any) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await apiService.create(data);
        showToast.success(`${resourceName} created successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: any) {
        const message = error.response?.data?.message || `Failed to create ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
      }
    },
    [apiService, resourceName, fetchAll]
  );

  const update = useCallback(
    async (id: string | number, data: any) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await apiService.update(id, data);
        showToast.success(`${resourceName} updated successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: any) {
        const message = error.response?.data?.message || `Failed to update ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
      }
    },
    [apiService, resourceName, fetchAll]
  );

  const delete_ = useCallback(
    async (id: string | number) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await apiService.delete(id);
        showToast.success(`${resourceName} deleted successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: any) {
        const message = error.response?.data?.message || `Failed to delete ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
      }
    },
    [apiService, resourceName, fetchAll]
  );

  return [
    state,
    {
      fetchAll,
      fetchById,
      create,
      update,
      delete: delete_,
    },
  ];
};
