import React, { useContext, useMemo, useState } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import AccessDenied from '../shared/AccessDenied';

const ActivityLog: React.FC = () => {
  const { activityLog, users, currentUser } = useContext(DataContext);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);


  if (currentUser.role !== 'مدير النظام') {
    return <AccessDenied />;
  }
  
  const setDateRange = (filter: string | null) => {
    const today = new Date();
    const isoString = (d: Date) => d.toISOString().split('T')[0];
    
    let start = '';
    let end = isoString(new Date());

    switch(filter) {
        case 'today':
            start = isoString(today);
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            start = isoString(yesterday);
            end = isoString(yesterday);
            break;
        case 'last7':
            const last7 = new Date(today);
            last7.setDate(today.getDate() - 6);
            start = isoString(last7);
            break;
        case 'last30':
            const last30 = new Date(today);
            last30.setDate(today.getDate() - 29);
            start = isoString(last30);
            break;
        case 'all':
        default:
            start = '';
            end = '';
            break;
    }
    setFilterStartDate(start);
    setFilterEndDate(end);
    setActiveDateFilter(filter);
  };
  
  const handleManualDateChange = (type: 'start' | 'end', value: string) => {
      if (type === 'start') setFilterStartDate(value);
      if (type === 'end') setFilterEndDate(value);
      setActiveDateFilter(null);
  };


  const filteredLog = useMemo(() => {
    if (!Array.isArray(activityLog)) {
      return [];
    }
    return activityLog.filter(log => {
      if (!log) { // Guard against null or undefined log entries
        return false;
      }
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
  
  const DateFilterButton = ({ label, filter, activeFilter, onClick }: {label: string, filter: string | null, activeFilter: string | null, onClick: (f: string|null) => void}) => {
      const isActive = filter === activeFilter;
      return (
          <button
              onClick={() => onClick(filter)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isActive
                      ? 'bg-blue-500 text-white font-semibold shadow'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
              {label}
          </button>
      );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">سجل نشاطات النظام</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">مراقبة الإجراءات التي يقوم بها المستخدمون.</p>
        
        <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label htmlFor="userFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فلترة حسب المستخدم</label>
                  <select 
                    id="userFilter" 
                    value={filterUserId}
                    onChange={e => setFilterUserId(e.target.value)}
                    className="input-style w-full"
                  >
                      <option value="">كل المستخدمين</option>
                      {Array.isArray(users) && users.map(user => (
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
                    onChange={e => handleManualDateChange('start', e.target.value)}
                    className="input-style w-full"
                  />
              </div>
               <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                  <input 
                    type="date"
                    id="endDate"
                    value={filterEndDate}
                    onChange={e => handleManualDateChange('end', e.target.value)}
                    className="input-style w-full"
                  />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">نطاقات سريعة:</span>
                <DateFilterButton label="اليوم" filter="today" activeFilter={activeDateFilter} onClick={setDateRange} />
                <DateFilterButton label="الأمس" filter="yesterday" activeFilter={activeDateFilter} onClick={setDateRange} />
                <DateFilterButton label="آخر 7 أيام" filter="last7" activeFilter={activeDateFilter} onClick={setDateRange} />
                <DateFilterButton label="آخر 30 يوم" filter="last30" activeFilter={activeDateFilter} onClick={setDateRange} />
                <DateFilterButton label="عرض الكل" filter="all" activeFilter={activeDateFilter} onClick={setDateRange} />
            </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredLog} searchableColumns={['username', 'action', 'details']} />
    </div>
  );
};

export default ActivityLog;
