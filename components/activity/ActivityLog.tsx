import React, { useContext, useMemo, useState } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import AccessDenied from '../shared/AccessDenied';

const ActivityLog: React.FC = () => {
  const { activityLog, users, currentUser } = useContext(DataContext);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  if (currentUser.role !== 'مدير النظام') {
    return <AccessDenied />;
  }

  const filteredLog = useMemo(() => {
    return activityLog.filter(log => {
      const logDate = new Date(log.timestamp);
      const startDate = filterStartDate ? new Date(filterStartDate) : null;
      const endDate = filterEndDate ? new Date(filterEndDate) : null;

      if(startDate) startDate.setHours(0,0,0,0);
      if(endDate) endDate.setHours(23,59,59,999);

      const userMatch = !filterUserId || log.userId === filterUserId;
      const startDateMatch = !startDate || logDate >= startDate;
      const endDateMatch = !endDate || logDate <= endDate;
      
      return userMatch && startDateMatch && endDateMatch;
    });
  }, [activityLog, filterUserId, filterStartDate, filterEndDate]);

  const columns = [
    {
      header: 'التوقيت',
      accessor: 'timestamp',
      render: (row: any) => new Date(row.timestamp).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
    },
    { header: 'المستخدم', accessor: 'username' },
    { header: 'الإجراء', accessor: 'action' },
    { header: 'التفاصيل', accessor: 'details' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">سجل نشاطات النظام</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">مراقبة الإجراءات التي يقوم بها المستخدمون.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
           <div>
              <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فلترة حسب المستخدم</label>
              <select 
                id="userFilter" 
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                  <option value="">كل المستخدمين</option>
                  {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
              </select>
          </div>
           <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
              <input 
                type="date"
                id="startDate"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
           <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
              <input 
                type="date"
                id="endDate"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredLog} searchableColumns={['username', 'action', 'details']} />
    </div>
  );
};

export default ActivityLog;
