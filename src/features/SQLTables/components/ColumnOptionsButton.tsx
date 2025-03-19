import type {  MouseEvent } from 'react';
import { IoOptions } from 'react-icons/io5';
import type { SortConfig } from '../types';

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
    <button
      type="button"
      onClick={onClick}
      className={`p-1 rounded hover:bg-gray-200 ${
        isActive ? 'text-blue-600' : 'text-gray-400'
      }`}
    >
      <IoOptions className="w-4 h-4" />
    </button>
  );
};

export default ColumnOptionsButton; 