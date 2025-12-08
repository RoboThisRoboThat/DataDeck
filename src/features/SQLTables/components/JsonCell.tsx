import { useState } from 'react';
import { IoClose } from 'react-icons/io5';

interface JsonCellProps {
  value: unknown;
}

// Format Date to YYYY-MM-DD HH:mm:ss (database-like format)
const formatDateToDbFormat = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const JsonCell = ({ value }: JsonCellProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Handle non-objects or Date objects (Date should be displayed as string, not JSON)
  if (!value || typeof value !== 'object' || value instanceof Date) {
    return <span>{value instanceof Date ? formatDateToDbFormat(value) : String(value)}</span>;
  }
  
  const formattedJson = JSON.stringify(value, null, 2);
  const preview = JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
  
  return (
    <div>
      {expanded ? (
        <div className="relative">
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-60 whitespace-pre-wrap">
            {formattedJson}
          </pre>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-1 right-1 p-1 bg-white rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <IoClose className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-left text-blue-600 hover:underline"
        >
          {preview}
        </button>
      )}
    </div>
  );
};

export default JsonCell; 