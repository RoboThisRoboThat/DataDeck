import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Connection } from '../types/connection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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

  const handleDbTypeChange = (value: 'mysql' | 'postgres') => {
    setFormData(prev => ({
      ...prev,
      dbType: value,
      port: value === 'mysql' ? '3306' : '5432'
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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="name">Connection Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="dbType">Database Type</Label>
            <Select
              value={formData.dbType}
              onValueChange={handleDbTypeChange}
            >
              <SelectTrigger id="dbType">
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              name="host"
              value={formData.host}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              name="port"
              value={formData.port}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              name="user"
              value={formData.user}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              name="database"
              value={formData.database}
              onChange={handleTextChange}
              required
            />
          </div>
          
          <DialogFooter className="mt-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Connection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 