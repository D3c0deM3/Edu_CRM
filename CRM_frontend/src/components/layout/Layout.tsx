import type { ReactNode } from 'react';
import { memo } from 'react';
import Sidebar from './Sidebar';
import TeacherReminderWatcher from './TeacherReminderWatcher';

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 bg-background transition-colors duration-300" style={{ marginLeft: 280 }}>
        <TeacherReminderWatcher />
        {children}
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
