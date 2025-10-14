import React, { useState, useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import AccountStatement from '../reports/AccountStatement';
import { financialYearData } from '../../data/initialSeedData';

interface LauncherProps {
  config: {
    isOpen: boolean;
    partyType: 'customer' | 'supplier' | null;
  };
  onClose: () => void;
}

const AccountStatementLauncherModal: React.FC<LauncherProps> = ({ config, onClose }) => {
  const { customers, suppliers, financialYear } = useContext(DataContext);

  const [partyId, setPartyId] = useState('');
  const [startDate, setStartDate] = useState(financialYear.startDate);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState<any | null>(null);

  const partyList = config.partyType === 'customer' ? customers : suppliers;

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.partyType && partyId) {
      setReportData({
        partyType: config.partyType,
        partyId,
        startDate,
        endDate,
      });
    }
  };

  const handleClose = () => {
    setReportData(null);
    setPartyId('');
    onClose();
  };

  const title = `كشف حساب ${config.partyType === 'customer' ? 'عميل' : 'مورد'}`;

  return (
    <Modal isOpen={config.isOpen} onClose={handleClose} title={title} size="4xl">
      {!reportData ? (
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-3">
              <label htmlFor="launcherPartyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اختر {config.partyType === 'customer' ? 'العميل' : 'المورد'}
              </label>
              <select
                id="launcherPartyId"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="input-style w-full"
                required
              >
                <option value="">-- اختر --</option>
                {partyList.map(party => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="launcherStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
              <input type="date" id="launcherStartDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style w-full" />
            </div>
            <div>
              <label htmlFor="launcherEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
              <input type="date" id="launcherEndDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
            </div>
            <div className="flex items-end">
                 <button type="submit" className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    عرض التقرير
                 </button>
            </div>
          </div>
        </form>
      ) : (
        <div>
           <button 
                onClick={() => setReportData(null)}
                className="mb-4 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
                &larr; العودة لاختيار طرف آخر
            </button>
          <AccountStatement
            partyType={reportData.partyType}
            partyId={reportData.partyId}
            startDate={reportData.startDate}
            endDate={reportData.endDate}
          />
        </div>
      )}
    </Modal>
  );
};

export default AccountStatementLauncherModal;