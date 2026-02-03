import type { ReactNode } from 'react';
import { memo } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          padding: { xs: 1, sm: 2, md: 3 },
          backgroundColor: '#fafafa',
        }}
      >
        {children}
      </Box>
    </Box>
  );
});

Layout.displayName = 'Layout';

export default Layout;
