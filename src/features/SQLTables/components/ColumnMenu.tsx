import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IoCaretUp, IoCaretDown, IoFilter } from 'react-icons/io5';
import type { SortConfig } from '../types';
import { FILTER_CLICK_EVENT } from './DataTable';

interface ColumnMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  column: string;
  sortConfig: SortConfig;
  hasFilter: boolean;
  onClose: () => void;
  onSortAsc: (column: string) => void;
  onSortDesc: (column: string) => void;
  onFilterClick: () => void;
}

const ColumnMenu = ({
  anchorEl,
  open,
  column,
  sortConfig,
  hasFilter,
  onClose,
  onSortAsc,
  onSortDesc,
  onFilterClick,
}: ColumnMenuProps) => {
  const isActiveSortAsc = sortConfig.column === column && sortConfig.direction === 'asc';
  const isActiveSortDesc = sortConfig.column === column && sortConfig.direction === 'desc';

  // Handle filter click with custom event
  const handleFilterClick = () => {
    // First call the original handler to close the menu
    onFilterClick();
    
    // Then dispatch a custom event that the DataTable component will listen for
    const event = new CustomEvent(FILTER_CLICK_EVENT, { 
      detail: { column } 
    });
    document.dispatchEvent(event);
  };

  return (
    <DropdownMenu open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DropdownMenuTrigger asChild>
        <div className="hidden">Trigger (hidden, controlled externally)</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" forceMount>
        <div className="px-3 py-2 text-xs text-gray-500 font-medium">
          Column: {column}
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onSortAsc(column)}
          className={isActiveSortAsc ? "bg-accent" : ""}
        >
          <IoCaretUp className={`w-5 h-5 mr-2 ${isActiveSortAsc ? 'text-blue-600' : 'text-gray-600'}`} />
          <span>Sort Ascending</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onSortDesc(column)}
          className={isActiveSortDesc ? "bg-accent" : ""}
        >
          <IoCaretDown className={`w-5 h-5 mr-2 ${isActiveSortDesc ? 'text-blue-600' : 'text-gray-600'}`} />
          <span>Sort Descending</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleFilterClick}
          className={hasFilter ? "bg-accent" : ""}
        >
          <IoFilter className={`w-5 h-5 mr-2 ${hasFilter ? 'text-blue-600' : 'text-gray-600'}`} />
          <div className="flex flex-col">
            <span>Filter</span>
            <span className="text-xs text-gray-500">
              {hasFilter ? "Edit current filter" : "Add filter condition"}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColumnMenu; 