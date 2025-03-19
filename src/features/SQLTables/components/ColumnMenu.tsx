import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
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
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <div className="px-3 py-2 text-xs text-gray-500 font-medium">
        Column: {column}
      </div>
      <Divider />
      
      <MenuItem 
        onClick={() => onSortAsc(column)}
        selected={isActiveSortAsc}
      >
        <ListItemIcon>
          <IoCaretUp className={`w-5 h-5 ${isActiveSortAsc ? 'text-blue-600' : 'text-gray-600'}`} />
        </ListItemIcon>
        <ListItemText primary="Sort Ascending" />
      </MenuItem>
      
      <MenuItem 
        onClick={() => onSortDesc(column)}
        selected={isActiveSortDesc}
      >
        <ListItemIcon>
          <IoCaretDown className={`w-5 h-5 ${isActiveSortDesc ? 'text-blue-600' : 'text-gray-600'}`} />
        </ListItemIcon>
        <ListItemText primary="Sort Descending" />
      </MenuItem>
      
      <Divider />
      
      <MenuItem 
        onClick={handleFilterClick}
        selected={hasFilter}
      >
        <ListItemIcon>
          <IoFilter className={`w-5 h-5 ${hasFilter ? 'text-blue-600' : 'text-gray-600'}`} />
        </ListItemIcon>
        <ListItemText 
          primary="Filter" 
          secondary={hasFilter ? "Edit current filter" : "Add filter condition"} 
        />
      </MenuItem>
    </Menu>
  );
};

export default ColumnMenu; 