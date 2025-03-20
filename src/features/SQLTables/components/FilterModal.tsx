import { useState, useEffect } from 'react';
import { FiX, FiFilter } from 'react-icons/fi';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FilterOperator, FILTER_OPERATORS, FILTER_OPERATOR_LABELS } from '../types';

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

  const handleOperatorChange = (newOperator: string) => {
    setOperator(newOperator as FilterOperator);
    
    // Clear value if the operator doesn't require a value
    if (!requiresValue(newOperator as FilterOperator)) {
      setValue('');
    }
  };

  // Handle apply filter
  const handleApply = () => {
    // Validate based on operator
    if (!requiresValue(operator)) {
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

  // Handle clear filter
  const handleClear = () => {
    onApply(column, '', '');
    onClose();
  };

  // Determine if the selected operator requires a value input
  const requiresValue = (op: FilterOperator) => !['IS NULL', 'IS NOT NULL'].includes(op);

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
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center bg-blue-50 text-blue-800 -mx-6 -mt-4 px-6 py-3 border-b">
            <div className="flex items-center">
              <FiFilter className="mr-2" size={18} />
              <span className="font-medium">
                Filter Column: <span className="font-bold">{column}</span>
              </span>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 hover:bg-blue-100 rounded-full p-1"
            >
              <FiX />
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="pt-4 pb-2 space-y-6">
          <p className="text-sm text-gray-600 mb-4">
            Select a filter condition for this column. Some operators require an additional value.
          </p>
          
          <div className="mb-4">
            <Label htmlFor="filter-operator">Operator</Label>
            <Select 
              value={operator} 
              onValueChange={handleOperatorChange}
            >
              <SelectTrigger id="filter-operator" className="bg-white">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {FILTER_OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {requiresValue(operator) ? (
            <div>
              <Label htmlFor="filter-value">Value</Label>
              <Input
                id="filter-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={getPlaceholder()}
                className={`bg-white ${error ? 'border-red-500' : ''}`}
                autoFocus
              />
              {getHelperText() && (
                <p className={`text-sm mt-1 ${error ? 'text-red-500' : 'text-gray-500'}`}>
                  {getHelperText()}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-gray-500 text-sm">
              This operator doesn't require a value.
            </div>
          )}
        </div>
        
        <DialogFooter className="px-0 py-3 flex justify-between bg-gray-50 -mx-6 -mb-4 px-6 border-t">
          <Button 
            onClick={handleClear} 
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Clear Filter
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={onClose} 
              variant="outline"
              className="text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={requiresValue(operator) && !value.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal; 