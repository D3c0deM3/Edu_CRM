import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

const Dialog = ({ open, onOpenChange, children }: { open: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>;
};

const DialogTrigger = ({ children }: { children: React.ReactElement }) => {
  const ctx = React.useContext(DialogContext);
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      ctx?.onOpenChange?.(true);
    },
  });
};

const DialogClose = ({ children }: { children: React.ReactElement }) => {
  const ctx = React.useContext(DialogContext);
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      ctx?.onOpenChange?.(false);
    },
  });
};

const DialogOverlay = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('absolute inset-0 bg-black/80', className)}
      {...props}
    />
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(DialogContext);
    if (!ctx?.open) return null;

    React.useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') ctx?.onOpenChange?.(false);
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [ctx]);

    if (typeof document === 'undefined') return null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <DialogOverlay onClick={() => ctx?.onOpenChange?.(false)} />
        <div
          ref={ref}
          className={cn(
            'modal relative z-10 grid w-full max-w-lg gap-4 rounded-xl border bg-background p-6 shadow-lg',
            className
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => ctx?.onOpenChange?.(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
DialogDescription.displayName = 'DialogDescription';

const DialogPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
};
