import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Container,
  Typography,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useCRUD } from '../hooks/useCRUD';
import { centerAPI } from '../../../shared/api/api';
import { CRUDTable } from '../../../shared/components/CRUDComponents';
import { showToast } from '../../../utils/toast';

interface Center {
  center_id?: number;
  id?: number;
  center_name: string;
  center_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  principal_name: string;
}

const CentersPage = () => {
  const theme = useTheme();
  const [state, actions] = useCRUD<Center>(centerAPI, 'Center');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Center>>({});

  useEffect(() => {
    actions.fetchAll();
  }, []);

  const handleOpenModal = (center?: Center) => {
    if (center) {
      setEditingId(center.center_id || center.id || null);
      setFormData(center);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await actions.update(editingId, formData);
        showToast.success('Center updated successfully!');
      } else {
        await actions.create(formData);
        showToast.success('Center created successfully!');
      }
      handleCloseModal();
    } catch (error) {
      showToast.error('Error saving center');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this center?')) {
      try {
        await actions.delete(id);
        showToast.success('Center deleted successfully!');
      } catch (error) {
        showToast.error('Error deleting center');
      }
    }
  };

  const columns = [
    { key: 'center_code', label: 'Code' },
    { key: 'center_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'principal_name', label: 'Principal' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Centers Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
          sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          Add Center
        </Button>
      </Box>

      {state.error && <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>}

      {state.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <CRUDTable
          title=""
          data={state.items}
          columns={columns}
          onAdd={() => handleOpenModal()}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Center' : 'Add New Center'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Center Name"
              required
              value={formData.center_name || ''}
              onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Center Code"
              required
              value={formData.center_code || ''}
              onChange={(e) => setFormData({ ...formData, center_code: e.target.value })}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              required
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone"
              type="tel"
              required
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Address"
              required
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <TextField
              fullWidth
              label="City"
              required
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <TextField
              fullWidth
              label="Principal Name"
              required
              value={formData.principal_name || ''}
              onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={state.loading}
          >
            {state.loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CentersPage;
