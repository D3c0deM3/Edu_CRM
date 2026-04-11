import type { ReactNode } from 'react';
import { memo } from 'react';
import Sidebar from './Sidebar';
import TeacherReminderWatcher from './TeacherReminderWatcher';

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-background px-3 pb-4 pt-16 transition-colors duration-300 sm:px-4 sm:pb-6 md:px-6 lg:pl-[280px] lg:pt-6">
        <TeacherReminderWatcher />
        {children}
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
