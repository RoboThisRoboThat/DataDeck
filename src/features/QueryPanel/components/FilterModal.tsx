import React, { useState, useEffect } from 'react';
import { FiX, FiFilter } from 'react-icons/fi';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const handleOperatorChange = (newOperator: string) => {
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
                {FILTER_OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value} className="py-2">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {operator && FILTER_OPERATORS.find(op => op.value === operator)?.requiresValue && (
            <div>
              <Label htmlFor="filter-value">Value</Label>
              <Input
                id="filter-value"
                value={value}
                onChange={handleValueChange}
                placeholder="Enter filter value"
                className="bg-white"
                autoFocus
              />
            </div>
          )}
          
          {operator && !FILTER_OPERATORS.find(op => op.value === operator)?.requiresValue && (
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
              disabled={!isApplyEnabled()}
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