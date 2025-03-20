import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="bg-gray-50 -mx-6 -mt-4 px-6 py-3 border-b">
            Edit Cell Value
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <div className="mb-4">
            <h4 className="mb-1 text-sm font-medium text-gray-600">
              Table
            </h4>
            <p className="font-medium">
              {tableName}
            </p>
          </div>
          
          <div className="mb-4">
            <h4 className="mb-1 text-sm font-medium text-gray-600">
              Column
            </h4>
            <p className="font-medium">
              {columnName}
            </p>
          </div>
          
          <div className="mb-4">
            <h4 className="mb-1 text-sm font-medium text-gray-600">
              Current Value
            </h4>
            <p className="font-medium">
              {value === null || value === undefined ? 
                <span className="text-gray-400 italic">NULL</span> : 
                typeof value === 'object' ? 
                  <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-32">{JSON.stringify(value, null, 2)}</pre> : 
                  String(value)
              }
            </p>
          </div>
          
          <div className="mb-2">
            <h4 className="mb-1 text-sm font-medium text-gray-600">
              New Value
            </h4>
            {typeof value === 'object' ? (
              <Textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={6}
                disabled={loading}
                className={error ? "border-red-500" : ""}
              />
            ) : (
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                disabled={loading}
                className={error ? "border-red-500" : ""}
              />
            )}
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className={loading ? "opacity-80" : ""}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCellModal; 