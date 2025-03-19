import  { useRef, useEffect, useState } from 'react';
import type React from 'react';
import { IoChevronBack, IoChevronForward, IoClose } from 'react-icons/io5';

interface TableTabsProps {
  tables: string[];
  activeTable: string | null;
  setActiveTable: (tableName: string) => void;
  handleCloseTable: (tableName: string, event: React.MouseEvent) => void;
}

const TableTabs: React.FC<TableTabsProps> = ({
  tables,
  activeTable,
  setActiveTable,
  handleCloseTable,
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState({
    left: false,
    right: false,
  });

  // Check if scroll buttons should be visible
  const checkScrollButtons = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowScrollButtons({
        left: scrollLeft > 0,
        right: scrollLeft < scrollWidth - clientWidth,
      });
    }
  };

  // Add scroll event listener
  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [tables]);

  // Scroll tabs left or right
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 100); // Check after scroll animation
    }
  };

  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200">
      {/* Left Scroll Button */}
      {showScrollButtons.left && (
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          className="flex-none px-1 py-2 hover:bg-gray-200 text-gray-600"
        >
          <IoChevronBack className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable Tabs Container */}
      <div
        ref={tabsRef}
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        onScroll={checkScrollButtons}
      >
        {tables.map(table => (
          <button
            key={table}
            type="button"
            onClick={() => setActiveTable(table)}
            className={`group flex-none flex items-center px-4 py-2 text-sm border-r border-gray-200
              ${activeTable === table 
                ? 'bg-white border-b-2 border-b-blue-500 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>{table}</span>
            <button
              type="button"
              onClick={(e: React.MouseEvent) => handleCloseTable(table, e)}
              className="ml-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IoClose className="w-4 h-4" />
            </button>
          </button>
        ))}
      </div>

      {/* Right Scroll Button */}
      {showScrollButtons.right && (
        <button
          type="button"
          onClick={() => scrollTabs('right')}
          className="flex-none px-1 py-2 hover:bg-gray-200 text-gray-600"
        >
          <IoChevronForward className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default TableTabs; 