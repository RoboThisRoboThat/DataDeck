import React, { useState, useEffect } from 'react';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  useEffect(() => {
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
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-800">Save SQL Query</DialogTitle>
          <DialogDescription className="text-gray-600">
            Save your query to easily access it later. Provide a descriptive name to help you identify it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Query Name</Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g., Monthly Sales Report"
              autoFocus
              required
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="What does this query do?"
              rows={2}
            />
          </div>
          
          <div className="bg-gray-50 p-3 rounded mt-4 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium">QUERY PREVIEW</p>
            <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap overflow-hidden text-ellipsis max-h-[60px]">
              {sql}
            </pre>
          </div>
        </div>
        
        <DialogFooter className="border-t bg-gray-50 py-3">
          <Button variant="outline" onClick={onClose} className="text-gray-600">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveQueryModal; 