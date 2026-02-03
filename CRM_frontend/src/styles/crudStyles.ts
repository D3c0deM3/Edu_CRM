import type { SxProps, Theme } from '@mui/material/styles';

export const crudStyles = {
  pageContainer: {
    padding: { xs: 1, sm: 2, md: 3 },
  },
  headerBox: {
    marginBottom: 3,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  } as SxProps<Theme>,
  pageTitle: {
    fontWeight: 700,
    marginBottom: 1,
  } as SxProps<Theme>,
  card: {
    marginBottom: 2,
    borderRadius: 2,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
  } as SxProps<Theme>,
  table: {
    '& thead': {
      backgroundColor: '#f5f5f5',
      fontWeight: 600,
    },
  } as SxProps<Theme>,
  actionButtons: {
    display: 'flex',
    gap: 1,
  } as SxProps<Theme>,
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as SxProps<Theme>,
};
