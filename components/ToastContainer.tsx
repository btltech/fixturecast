
import React from 'react';
import { Toast as ToastType } from '../types';
import Toast from './Toast';

interface ToastContainerProps {
  toasts: ToastType[];
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex flex-col items-center px-4 py-6 pointer-events-none sm:p-6 z-[100]"
    >
      <div className="w-full max-w-sm space-y-3">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
