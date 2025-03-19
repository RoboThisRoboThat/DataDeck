import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField,
  Typography,
  CircularProgress
} from '@mui/material';
import { useAppDispatch } from '../../../store/hooks';
import { updateCellValue } from '../../../store/slices/tablesSlice';
import type { FilterCondition, SortConfig, PaginationState } from '../types';

interface EditCellModalProps {
  open: boolean;
  onClose: () => void;
  tableName: string;
  columnName: string;
  value: unknown;
  primaryKeyColumn: string;
  primaryKeyValue: string | number;
  filters: Record<string, FilterCondition>;
  sortConfig: SortConfig;
  pagination: PaginationState;
  connectionId: string;
}

const EditCellModal = ({
  open,
  onClose,
  tableName,
  columnName,
  value,
  primaryKeyColumn,
  primaryKeyValue,
  filters,
  sortConfig,
  pagination,
  connectionId
}: EditCellModalProps) => {
  const dispatch = useAppDispatch();
  const [newValue, setNewValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form with the current value
  useEffect(() => {
    if (value === null || value === undefined) {
      setNewValue('');
    } else if (typeof value === 'object') {
      setNewValue(JSON.stringify(value, null, 2));
    } else {
      setNewValue(String(value));
    }
  }, [value]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse the value based on the original type
      let parsedValue: unknown = newValue;
      
      // If the original value was a number, try to parse as number
      if (typeof value === 'number') {
        const parsedNumber = Number.parseFloat(newValue);
        if (Number.isNaN(parsedNumber)) {
          throw new Error('Invalid number format');
        }
        parsedValue = parsedNumber;
      }
      
      // If the original value was a boolean, parse as boolean
      if (typeof value === 'boolean') {
        if (newValue.toLowerCase() === 'true') parsedValue = true;
        else if (newValue.toLowerCase() === 'false') parsedValue = false;
        else throw new Error('Invalid boolean value. Use "true" or "false"');
      }
      
      // If the original value was an object (JSON), try to parse it
      if (typeof value === 'object' && value !== null) {
        try {
          parsedValue = JSON.parse(newValue);
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      }

      // Dispatch the update action
      const result = await dispatch(updateCellValue({
        tableName,
        connectionId,
        primaryKeyColumn,
        primaryKeyValue,
        columnToUpdate: columnName,
        newValue: parsedValue,
        filters,
        sortConfig,
        pagination
      })).unwrap();

      if (result.success) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="bg-gray-50 border-b">
        Edit Cell Value
      </DialogTitle>
      
      <DialogContent className="p-6">
        <div className="mb-4">
          <Typography variant="subtitle2" className="mb-1 text-gray-600">
            Table
          </Typography>
          <Typography variant="body1" className="font-medium">
            {tableName}
          </Typography>
        </div>
        
        <div className="mb-4">
          <Typography variant="subtitle2" className="mb-1 text-gray-600">
            Column
          </Typography>
          <Typography variant="body1" className="font-medium">
            {columnName}
          </Typography>
        </div>
        
        <div className="mb-4">
          <Typography variant="subtitle2" className="mb-1 text-gray-600">
            Current Value
          </Typography>
          <Typography variant="body1" className="font-medium">
            {value === null || value === undefined ? 
              <span className="text-gray-400 italic">NULL</span> : 
              typeof value === 'object' ? 
                <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-32">{JSON.stringify(value, null, 2)}</pre> : 
                String(value)
            }
          </Typography>
        </div>
        
        <div className="mb-2">
          <Typography variant="subtitle2" className="mb-1 text-gray-600">
            New Value
          </Typography>
          <TextField
            fullWidth
            multiline={typeof value === 'object'}
            rows={typeof value === 'object' ? 6 : 1}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            variant="outlined"
            error={!!error}
            helperText={error}
            disabled={loading}
          />
        </div>
      </DialogContent>
      
      <DialogActions className="p-4 bg-gray-50 border-t">
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCellModal; 