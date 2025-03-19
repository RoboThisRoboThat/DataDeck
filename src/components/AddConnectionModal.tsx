import { useState } from 'react';
import { Modal, Box, TextField, Button, Typography, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import type { Connection } from '../types/connection';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (connection: Connection) => void;
}

export function AddConnectionModal({ open, onClose, onAdd }: Props) {
  const [formData, setFormData] = useState<Omit<Connection, 'id'>>({
    name: '',
    host: 'localhost',
    port: '3306',
    user: '',
    password: '',
    database: '',
    dbType: 'mysql'
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Update default port when database type changes
      ...(name === 'dbType' && { port: value === 'mysql' ? '3306' : '5432' })
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newConnection: Connection = {
      id: uuidv4(),
      ...formData
    };
    onAdd(newConnection);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" mb={2}>
          Add New Connection
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Connection Name"
            name="name"
            value={formData.name}
            onChange={handleTextChange}
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="db-type-label">Database Type</InputLabel>
            <Select
              labelId="db-type-label"
              name="dbType"
              value={formData.dbType}
              label="Database Type"
              onChange={handleSelectChange}
            >
              <MenuItem value="mysql">MySQL</MenuItem>
              <MenuItem value="postgres">PostgreSQL</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            label="Host"
            name="host"
            value={formData.host}
            onChange={handleTextChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Port"
            name="port"
            value={formData.port}
            onChange={handleTextChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="user"
            value={formData.user}
            onChange={handleTextChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleTextChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Database"
            name="database"
            value={formData.database}
            onChange={handleTextChange}
            required
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" type="submit">
              Add Connection
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
} 