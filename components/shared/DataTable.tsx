import React, { useState, useMemo } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, ArrowUturnLeftIcon, MagnifyingGlassIcon, ArrowsUpDownIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

type Column = {
  // FIX: Allow React.ReactNode for complex headers.
  header: React.ReactNode;
  accessor: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
};

type Action = 'edit' | 'archive' | 'view' | 'unarchive' | 'delete';

interface DataTableProps {
  columns: Column[];
  data: any[];
  actions?: Action[];
  onEdit?: (row: any) => void;
  onArchive?: (row: any) => void;
  onView?: (row: any) => void;
  onUnarchive?: (row: any) => void;
  onDelete?: (row: any) => void;
  onRowClick?: (row: any) => void;
  rowClassName?: (row: any) => string;
  searchableColumns?: string[];
  calculateFooter?: (data: any[]) => { [key: string]: string | number };
}

const ITEMS_PER_PAGE = 25;

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  actions = [],
  onEdit,
  onArchive,
  onView,
  onUnarchive,
  onDelete,
  onRowClick,
  rowClassName,
  searchableColumns = [],
  calculateFooter,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowercasedTerm = searchTerm.toLowerCase();
    return data.filter(item =>
      (searchableColumns.length > 0 ? searchableColumns : columns.map(c => c.accessor)).some(key => {
        const column = columns.find(c => c.accessor === key);
        // First try rendered value, then direct value, then fallback to empty string
        let value = '';
        if (column?.render) {
            const rendered = column.render(item);
            if (typeof rendered === 'string' || typeof rendered === 'number') {
                value = String(rendered);
            }
        } else {
            value = item[key];
        }
        return value?.toString().toLowerCase().includes(lowercasedTerm);
      })
    );
  }, [data, searchTerm, searchableColumns, columns]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);
  
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const footerData = useMemo(() => calculateFooter ? calculateFooter(sortedData) : null, [sortedData, calculateFooter]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };
  
  const getSortIcon = (key: string) => {
      if (!sortConfig || sortConfig.key !== key) {
        return <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />;
      }
      if (sortConfig.direction === 'ascending') {
        return <ChevronUpIcon className="w-4 h-4" />;
      }
      return <ChevronDownIcon className="w-4 h-4" />;
  };
  
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات لعرضها.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {searchableColumns.length > 0 && (
             <div className="p-4 border-b dark:border-gray-700">
                <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder={`ابحث في ${data.length} سجل...`}
                        value={searchTerm}
                        onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        )}
      <div className="overflow-x-auto">
      <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
          <tr>
            {columns.map((col, index) => (
              <th key={index} scope="col" className="px-6 py-3">
                <button onClick={() => col.sortable !== false && requestSort(col.accessor)} className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && getSortIcon(col.accessor)}
                </button>
              </th>
            ))}
            {actions.length > 0 && <th scope="col" className="px-6 py-3 text-center">الإجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, rowIndex) => (
            <tr 
              key={row.id || rowIndex} 
              className={`bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${rowClassName ? rowClassName(row) : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center items-center space-x-2 space-x-reverse">
                    {actions.includes('view') && onView && <button onClick={() => onView(row)} className="text-gray-400 hover:text-blue-500" title="عرض التفاصيل"><EyeIcon className="w-5 h-5"/></button>}
                    {actions.includes('edit') && onEdit && <button onClick={() => onEdit(row)} className="text-gray-400 hover:text-green-500" title="تعديل"><PencilIcon className="w-5 h-5"/></button>}
                    {actions.includes('archive') && onArchive && <button onClick={() => onArchive(row)} className="text-gray-400 hover:text-red-500" title="أرشفة"><TrashIcon className="w-5 h-5"/></button>}
                    {actions.includes('delete') && onDelete && <button onClick={() => onDelete(row)} className="text-gray-400 hover:text-red-500" title="حذف"><TrashIcon className="w-5 h-5"/></button>}
                    {actions.includes('unarchive') && onUnarchive && <button onClick={() => onUnarchive(row)} className="text-gray-400 hover:text-blue-500" title="إلغاء الأرشفة"><ArrowUturnLeftIcon className="w-5 h-5"/></button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد نتائج تطابق بحثك.</p>
                </td>
              </tr>
          )}
        </tbody>
         {footerData && (
            <tfoot className="text-xs font-semibold text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr className="border-t-2 dark:border-gray-600">
                    {columns.map((col, index) => (
                        <td key={index} className="px-6 py-3">
                            {(footerData as any)[col.accessor] || ''}
                        </td>
                    ))}
                    {actions.length > 0 && <td className="px-6 py-3"></td>}
                </tr>
            </tfoot>
        )}
      </table>
      </div>
      {totalPages > 1 && (
        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="">
                إظهار <span className="font-semibold">{paginatedData.length}</span> من <span className="font-semibold">{sortedData.length}</span> سجل
            </span>
            <div className="inline-flex items-center space-x-1 space-x-reverse">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon className="w-5 h-5"/></button>
                <span>صفحة {currentPage} من {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon className="w-5 h-5"/></button>
            </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
