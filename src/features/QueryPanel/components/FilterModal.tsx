import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Divider,
  IconButton
} from '@mui/material';
import { FiX, FiFilter } from 'react-icons/fi';
import type { SelectChangeEvent } from '@mui/material';

interface FilterCondition {
  operator: string;
  value: string;
}

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  column: string;
  currentFilter: FilterCondition | undefined;
  onApply: (column: string, operator: string, value: string) => void;
}

// Available filter operators
const FILTER_OPERATORS = [
  { value: 'EQUALS', label: 'Equals', requiresValue: true },
  { value: 'NOT_EQUALS', label: 'Not equals', requiresValue: true },
  { value: 'CONTAINS', label: 'Contains', requiresValue: true },
  { value: 'NOT_CONTAINS', label: 'Does not contain', requiresValue: true },
  { value: 'STARTS_WITH', label: 'Starts with', requiresValue: true },
  { value: 'ENDS_WITH', label: 'Ends with', requiresValue: true },
  { value: 'IS_EMPTY', label: 'Is empty', requiresValue: false },
  { value: 'IS_NOT_EMPTY', label: 'Is not empty', requiresValue: false },
  { value: 'IS_NULL', label: 'Is null', requiresValue: false },
  { value: 'IS_NOT_NULL', label: 'Is not null', requiresValue: false },
];

const FilterModal: React.FC<FilterModalProps> = ({ 
  open, 
  onClose, 
  column, 
  currentFilter,
  onApply 
}) => {
  // State for the selected operator and value
  const [operator, setOperator] = useState<string>('');
  const [value, setValue] = useState<string>('');
  
  // Reset state when the modal opens with a new column or filter
  useEffect(() => {
    if (open) {
      if (currentFilter) {
        setOperator(currentFilter.operator);
        setValue(currentFilter.value || '');
      } else {
        setOperator('');
        setValue('');
      }
    }
  }, [open, currentFilter]);
  
  // Handle operator change
  const handleOperatorChange = (event: SelectChangeEvent<string>) => {
    const newOperator = event.target.value;
    setOperator(newOperator);
    
    // Clear value if the operator doesn't require a value
    const operatorInfo = FILTER_OPERATORS.find(op => op.value === newOperator);
    if (operatorInfo && !operatorInfo.requiresValue) {
      setValue('');
    }
  };
  
  // Handle value change
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };
  
  // Handle apply filter
  const handleApply = () => {
    onApply(column, operator, value);
  };
  
  // Handle clear filter
  const handleClear = () => {
    onApply(column, '', '');
  };
  
  // Determine if the apply button should be enabled
  const isApplyEnabled = () => {
    if (!operator) return false;
    
    const operatorInfo = FILTER_OPERATORS.find(op => op.value === operator);
    if (!operatorInfo) return false;
    
    return !operatorInfo.requiresValue || value.trim() !== '';
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      className="rounded-lg"
    >
      <DialogTitle className="flex justify-between items-center bg-blue-50 text-blue-800 border-b px-4 py-3">
        <div className="flex items-center">
          <FiFilter className="mr-2" size={18} />
          <Typography variant="h6" className="font-medium">
            Filter Column: <span className="font-bold">{column}</span>
          </Typography>
        </div>
        <IconButton 
          edge="end" 
          onClick={onClose} 
          aria-label="close"
          className="text-gray-500 hover:text-gray-700 hover:bg-blue-100"
          size="small"
        >
          <FiX />
        </IconButton>
      </DialogTitle>
      
      <DialogContent className="pt-4 pb-2">
        <Box className="space-y-6">
          <Typography variant="body2" className="text-gray-600 mb-4">
            Select a filter condition for this column. Some operators require an additional value.
          </Typography>
          
          <FormControl fullWidth variant="outlined" className="mb-4">
            <InputLabel id="filter-operator-label">Operator</InputLabel>
            <Select
              labelId="filter-operator-label"
              value={operator}
              label="Operator"
              onChange={handleOperatorChange}
              fullWidth
              className="bg-white"
              size="medium"
            >
              {FILTER_OPERATORS.map(op => (
                <MenuItem key={op.value} value={op.value} className="py-2">
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {operator && FILTER_OPERATORS.find(op => op.value === operator)?.requiresValue && (
            <TextField
              label="Value"
              value={value}
              onChange={handleValueChange}
              fullWidth
              variant="outlined"
              autoFocus
              placeholder="Enter filter value"
              className="bg-white"
            />
          )}
          
          {operator && !FILTER_OPERATORS.find(op => op.value === operator)?.requiresValue && (
            <Box className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-500 text-sm">
              This operator doesn't require a value.
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <Divider />
      
      <DialogActions className="px-4 py-3 flex justify-between bg-gray-50">
        <Button 
          onClick={handleClear} 
          color="error"
          variant="outlined"
          className="text-red-600 border-red-200 hover:bg-red-50"
          size="medium"
        >
          Clear Filter
        </Button>
        
        <div className="flex gap-2">
          <Button 
            onClick={onClose} 
            color="inherit"
            className="text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            color="primary" 
            variant="contained" 
            disabled={!isApplyEnabled()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};

export default FilterModal; 