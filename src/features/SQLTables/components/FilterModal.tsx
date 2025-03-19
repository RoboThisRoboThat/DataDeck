import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Typography
} from '@mui/material';
import  { type FilterOperator, FILTER_OPERATORS, FILTER_OPERATOR_LABELS } from '../types';

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  column: string;
  currentFilter: { operator: string; value: string } | undefined;
  onApply: (column: string, operator: string, value: string) => void;
}

const FilterModal = ({
  open,
  onClose,
  column,
  currentFilter,
  onApply,
}: FilterModalProps) => {
  const [operator, setOperator] = useState<FilterOperator>('=');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  // Initialize with current filter values if they exist
  useEffect(() => {
    if (currentFilter) {
      setOperator(currentFilter.operator as FilterOperator);
      setValue(currentFilter.value);
    } else {
      // Default values
      setOperator('=');
      setValue('');
    }
    setError('');
  }, [currentFilter]);

  const handleApply = () => {
    // Validate based on operator
    if (['IS NULL', 'IS NOT NULL'].includes(operator)) {
      // These operators don't need a value
      onApply(column, operator, '');
      onClose();
      return;
    }

    if (!value.trim()) {
      setError('Please enter a filter value');
      return;
    }

    onApply(column, operator, value.trim());
    onClose();
  };

  // Determine if the selected operator requires a value input
  const requiresValue = !['IS NULL', 'IS NOT NULL'].includes(operator);

  // Get placeholder text based on operator
  const getPlaceholder = () => {
    switch (operator) {
      case 'IN':
      case 'NOT IN':
        return 'Comma-separated values (e.g. value1, value2)';
      case 'LIKE':
      case 'NOT LIKE':
        return 'Use % as wildcard (e.g. %text% for contains)';
      default:
        return 'Enter value';
    }
  };

  // Get helper text based on operator
  const getHelperText = () => {
    if (error) return error;
    
    switch (operator) {
      case 'LIKE':
      case 'NOT LIKE':
        return '% matches any sequence of characters';
      case 'IN':
      case 'NOT IN':
        return 'Separate multiple values with commas';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Filter: <span className="font-bold">{column}</span>
        </Typography>
      </DialogTitle>
      <DialogContent>
        <div className="space-y-4 py-2">
          <FormControl fullWidth>
            <InputLabel id="filter-operator-label">Operator</InputLabel>
            <Select
              labelId="filter-operator-label"
              value={operator}
              label="Operator"
              onChange={(e) => setOperator(e.target.value as FilterOperator)}
            >
              {FILTER_OPERATORS.map((op) => (
                <MenuItem key={op} value={op}>
                  {FILTER_OPERATOR_LABELS[op]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {requiresValue && (
            <TextField
              autoFocus
              label="Value"
              fullWidth
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={!!error}
              helperText={getHelperText()}
              placeholder={getPlaceholder()}
              variant="outlined"
              margin="normal"
            />
          )}

          {!requiresValue && (
            <Typography variant="body2" className="text-gray-600 mt-2">
              This operator doesn't require a value.
            </Typography>
          )}

          {(operator === 'LIKE' || operator === 'NOT LIKE') && (
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mt-2">
              <p className="font-medium mb-1">Examples:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><code>%text%</code> - Contains "text"</li>
                <li><code>text%</code> - Starts with "text"</li>
                <li><code>%text</code> - Ends with "text"</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterModal; 