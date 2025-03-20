import type { MouseEvent } from 'react';
import { IoOptions } from 'react-icons/io5';
import type { SortConfig } from '../types';
import { Button } from '../../../components/ui/button';

interface ColumnOptionsButtonProps {
  column: string;
  sortConfig: SortConfig;
  filters: Record<string, { operator: string; value: string }>;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

const ColumnOptionsButton = ({
  column,
  sortConfig,
  filters,
  onClick,
}: ColumnOptionsButtonProps) => {
  const isActive = 
    (sortConfig.column === column && sortConfig.direction) || 
    filters[column];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`p-0 h-7 w-7 rounded hover:bg-muted ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <IoOptions className="w-4 h-4" />
    </Button>
  );
};

export default ColumnOptionsButton; 