import { toast } from 'react-toastify';
import type { ToastOptions } from 'react-toastify';

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options,
    });
  },

  update: (toastId: any, options: any) => {
    toast.update(toastId, options);
  },

  dismiss: (toastId?: any) => {
    toast.dismiss(toastId);
  },
};

// Helper for API error handling
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An error occurred. Please try again.';
};
