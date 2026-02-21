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
  create: (data: Partial<T>) => Promise<void>;
  update: (id: string | number, data: Partial<T>) => Promise<void>;
  delete: (id: string | number) => Promise<void>;
}

interface APIService<T> {
  getAll: () => Promise<{ data?: T[] } | T[]>;
  getById: (id: number) => Promise<{ data?: T } | T>;
  create: (data: Partial<T> | unknown) => Promise<unknown>;
  update: (id: number, data: Partial<T> | unknown) => Promise<unknown>;
  delete: (id: number) => Promise<unknown>;
}

export const useCRUD = <T,>(apiService: APIService<T>, resourceName: string): [CRUDState<T>, CRUDActions<T>] => {
  const [state, setState] = useState<CRUDState<T>>({
    items: [],
    loading: false,
    error: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiService.getAll();
      const items = Array.isArray(response) ? response : (response as { data?: T[] }).data || [];
      setState((prev) => ({
        ...prev,
        items,
        loading: false,
      }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || `Failed to fetch ${resourceName}`;
      setState((prev) => ({ ...prev, error: message, loading: false }));
      showToast.error(message);
    }
  }, [apiService, resourceName]);

  const fetchById = useCallback(
    async (id: string | number) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await apiService.getById(Number(id));
        setState((prev) => ({ ...prev, loading: false }));
        const item = (response as { data?: T }).data ?? (response as T);
        return item;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        const message = err.response?.data?.message || `Failed to fetch ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
        return null;
      }
    },
    [apiService, resourceName]
  );

  const create = useCallback(
    async (data: Partial<T>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await apiService.create(data);
        showToast.success(`${resourceName} created successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        const message = err.response?.data?.message || `Failed to create ${resourceName}`;
        setState((prev) => ({ ...prev, error: message, loading: false }));
        showToast.error(message);
      }
    },
    [apiService, resourceName, fetchAll]
  );

  const update = useCallback(
    async (id: string | number, data: Partial<T>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await apiService.update(Number(id), data);
        showToast.success(`${resourceName} updated successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        const message = err.response?.data?.message || `Failed to update ${resourceName}`;
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
        await apiService.delete(Number(id));
        showToast.success(`${resourceName} deleted successfully`);
        await fetchAll();
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        const message = err.response?.data?.message || `Failed to delete ${resourceName}`;
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
