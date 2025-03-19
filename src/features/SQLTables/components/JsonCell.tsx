import { useState } from 'react';
import { IoClose } from 'react-icons/io5';

interface JsonCellProps {
  value: unknown;
}

const JsonCell = ({ value }: JsonCellProps) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!value || typeof value !== 'object') {
    return <span>{String(value)}</span>;
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