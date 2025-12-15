
import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import { CalculatorIcon } from '../icons/CalculatorIcon';
import { JournalEntry } from '../../types';

const Settlements: React.FC = () => {
  const { journal, archiveJournalEntry, showToast } = useContext(DataContext);
  
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Filter only journal entries that are settlements (have a relatedPartyId)
  const settlementEntries = useMemo(() => {
    return journal.filter(entry => !entry.isArchived && entry.relatedPartyId);
  }, [journal]);

  const handleArchive = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedEntry) {
        archiveJournalEntry(selectedEntry.id);
        showToast('تم إلغاء التسوية وعكس تأثيرها المالي بنجاح.');
    }
    setArchiveModalOpen(false);
    setSelectedEntry(null);
  };

  const columns = useMemo(() => [
    { header: 'رقم القيد', accessor: 'id' },
    { header: 'التاريخ', accessor: 'date' },
    { 
        header: 'نوع الطرف', 
        accessor: 'relatedPartyType',
        render: (row: JournalEntry) => row.relatedPartyType === 'customer' ? 'عميل' : 'مورد'
    },
    { header: 'الاسم', accessor: 'relatedPartyName' },
    { header: 'الوصف', accessor: 'description' },
    { 
      header: 'المبلغ', 
      accessor: 'amount', 
      render: (row: JournalEntry) => {
          // Determine amount from debit/credit. Usually settlements are balanced so debit=credit.
          const amount = row.debit || row.credit;
          return `${amount.toLocaleString()} جنيه`;
      }
    },
    {
        header: 'النوع',
        accessor: 'type',
        render: (row: JournalEntry) => {
            // Infer type based on description or lines if possible, or just show Debit/Credit note logic
            // Simple heuristic based on Description as set in Note Forms
            if (row.description.includes('إشعار خصم')) return <span className="text-green-600 font-bold">إشعار خصم</span>;
            if (row.description.includes('إشعار إضافة') || row.description.includes('إشعار مدين') || row.description.includes('إشعار دائن')) {
                 // The terms used in forms were:
                 // Supplier Debit Note (Reduces Debt): 'إشعار خصم'
                 // Supplier Credit Note (Increases Debt): 'إشعار إضافة'
                 // Customer Credit Note (Reduces Debt): 'إشعار دائن'
                 // Customer Debit Note (Increases Debt): 'إشعار مدين'
                 
                 if (row.description.includes('إشعار إضافة')) return <span className="text-red-600 font-bold">إشعار إضافة</span>;
                 if (row.description.includes('إشعار دائن')) return <span className="text-green-600 font-bold">إشعار دائن</span>;
                 if (row.description.includes('إشعار مدين')) return <span className="text-red-600 font-bold">إشعار مدين</span>;
            }
            return 'تسوية';
        }
    }
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="سجل التسويات" 
        buttonText=""
        onButtonClick={() => {}} 
        buttonIcon={<CalculatorIcon />}
      />
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 dark:text-gray-300">
              هذه الشاشة تعرض جميع التسويات (إشعارات الخصم والإضافة) التي تمت على حسابات العملاء والموردين.
              عند أرشفة أي تسوية من هنا، سيتم عكس تأثيرها المالي فوراً على رصيد العميل/المورد وعلى الحسابات العامة.
          </p>
      </div>

      <DataTable 
        columns={columns} 
        data={settlementEntries}
        actions={['archive']}
        onArchive={handleArchive}
        searchableColumns={['id', 'relatedPartyName', 'description', 'date']}
      />

      {selectedEntry && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="إلغاء التسوية"
          message={`هل أنت متأكد من رغبتك في إلغاء التسوية رقم "${selectedEntry.id}"؟ سيتم عكس التأثير المالي على رصيد ${selectedEntry.relatedPartyName} وتحديث الحسابات.`}
        />
      )}
    </div>
  );
};

export default Settlements;
