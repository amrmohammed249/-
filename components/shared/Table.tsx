

import React from 'react';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';

type Column = {
  // FIX: Allow React.ReactNode for complex headers.
  header: React.ReactNode;
  accessor: string;
  render?: (row: any) => React.ReactNode;
};

type Action = 'edit' | 'archive' | 'view' | 'unarchive' | 'delete';

interface TableProps {
  columns: Column[];
  data: any[];
  actions?: Action[];
  onEdit?: (row: any) => void;
  onArchive?: (row: any) => void;
  onView?: (row: any) => void;
  onUnarchive?: (row: any) => void;
  onDelete?: (row: any) => void;
  footerData?: { [key: string]: string };
  rowClassName?: (row: any) => string;
}

const Table: React.FC<TableProps> = ({ 
  columns, 
  data, 
  actions = [], 
  onEdit, 
  onArchive,
  onView,
  onUnarchive,
  onDelete,
  footerData,
  rowClassName
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">لا توجد بيانات لعرضها.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
      <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
          <tr>
            {columns.map((col, index) => (
              <th key={index} scope="col" className="px-6 py-3">
                {col.header}
              </th>
            ))}
            {actions.length > 0 && <th scope="col" className="px-6 py-3 text-center">الإجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className={`bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 ${rowClassName ? rowClassName(row) : ''}`}>
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center space-x-2 space-x-reverse">
                    {actions.includes('view') && onView && (
                       <button onClick={() => onView(row)} className="text-gray-400 hover:text-blue-500" title="عرض التفاصيل"><EyeIcon className="w-5 h-5"/></button>
                    )}
                    {actions.includes('edit') && onEdit && (
                       <button onClick={() => onEdit(row)} className="text-gray-400 hover:text-green-500" title="تعديل"><PencilIcon className="w-5 h-5"/></button>
                    )}
                    {actions.includes('archive') && onArchive && (
                        <button onClick={() => onArchive(row)} className="text-gray-400 hover:text-red-500" title="أرشفة"><TrashIcon className="w-5 h-5"/></button>
                    )}
                    {actions.includes('delete') && onDelete && (
                        <button onClick={() => onDelete(row)} className="text-gray-400 hover:text-red-500" title="حذف"><TrashIcon className="w-5 h-5"/></button>
                    )}
                     {actions.includes('unarchive') && onUnarchive && (
                        <button onClick={() => onUnarchive(row)} className="text-gray-400 hover:text-blue-500" title="إلغاء الأرشفة"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
         {footerData && (
            <tfoot className="text-xs font-semibold text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr className="border-t-2 dark:border-gray-600">
                    {columns.map((col, index) => (
                        <td key={index} className="px-6 py-3">
                            {footerData[col.accessor] || ''}
                        </td>
                    ))}
                    {actions.length > 0 && <td className="px-6 py-3"></td>}
                </tr>
            </tfoot>
        )}
      </table>
    </div>
  );
};

export default Table;
