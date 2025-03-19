import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box
} from '@mui/material';

interface SaveQueryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
  sql: string;
}

const SaveQueryModal: React.FC<SaveQueryModalProps> = ({
  open,
  onClose,
  onSave,
  sql
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setNameError('');
    }
  }, [open]);

  // Handle name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    // Clear error when user types
    if (e.target.value.trim()) {
      setNameError('');
    }
  };

  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Please enter a name for your query');
      return;
    }
    onSave(name, description);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="rounded-lg"
    >
      <DialogTitle className="bg-blue-50 text-blue-800 border-b">
        Save SQL Query
      </DialogTitle>
      
      <DialogContent className="pt-4 mt-2">
        <Box className="space-y-4">
          <Typography variant="body2" className="text-gray-600 mb-2">
            Save your query to easily access it later. Provide a descriptive name to help you identify it.
          </Typography>
          
          <TextField
            label="Query Name"
            value={name}
            onChange={handleNameChange}
            fullWidth
            variant="outlined"
            autoFocus
            required
            error={!!nameError}
            helperText={nameError}
            className="mb-4"
            placeholder="e.g., Monthly Sales Report"
          />
          
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={handleDescriptionChange}
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            placeholder="What does this query do?"
            className="mb-2"
          />
          
          <Box className="bg-gray-50 p-3 rounded mt-4 border border-gray-200">
            <Typography variant="caption" className="text-gray-500 font-medium">
              QUERY PREVIEW
            </Typography>
            <Typography 
              variant="body2" 
              className="font-mono text-gray-800 whitespace-pre-wrap"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: '60px'
              }}
            >
              {sql}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions className="p-3 border-t bg-gray-50">
        <Button 
          onClick={onClose} 
          color="inherit"
          className="text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!name.trim()}
        >
          Save Query
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveQueryModal; 