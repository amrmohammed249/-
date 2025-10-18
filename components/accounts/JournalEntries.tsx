import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddJournalEntryForm from './AddJournalEntryForm';
import EditJournalEntryForm from './EditJournalEntryForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import ViewDetailsModal from '../shared/ViewDetailsModal';
import { PlusIcon } from '../icons/PlusIcon';
import AccessDenied from '../shared/AccessDenied';

const JournalEntries: React.FC = () => {
  const { journal, archiveJournalEntry, showToast, currentUser } = useContext(DataContext);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const canModify = currentUser.role === 'مدير النظام' || currentUser.role === 'محاسب';
  
  const handleView = (entry: any) => {
    setSelectedEntry(entry);
    setViewModalOpen(true);
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setEditModalOpen(true);
  };

  const handleArchive = (entry: any) => {
    setSelectedEntry(entry);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedEntry) {
        archiveJournalEntry(selectedEntry.id);
        showToast('تمت أرشفة القيد بنجاح.');
    }
    setArchiveModalOpen(false);
    setSelectedEntry(null);
  };
  
  const columns = useMemo(() => [
    { header: 'رقم القيد', accessor: 'id' },
    { header: 'التاريخ', accessor: 'date' },
    { header: 'الوصف', accessor: 'description' },
    { header: 'مدين', accessor: 'debit', render: (row: any) => `${row.debit.toLocaleString()} جنيه` },
    { header: 'دائن', accessor: 'credit', render: (row: any) => `${row.credit.toLocaleString()} جنيه` },
    { header: 'الحالة', accessor: 'status', render: (row: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${row.status === 'مرحل' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{row.status}</span>
    )},
  ], []);
  
  if (!canModify) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="القيود اليومية" 
        buttonText="إضافة قيد جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={journal}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'date', 'description', 'status']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة قيد يومية جديد" size="4xl">
        <AddJournalEntryForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      {selectedEntry && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل القيد: ${selectedEntry.id}`} size="4xl">
          <EditJournalEntryForm entry={selectedEntry} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedEntry && (
        <ViewDetailsModal
            isOpen={isViewModalOpen}
            onClose={() => setViewModalOpen(false)}
            title={`تفاصيل القيد رقم ${selectedEntry.id}`}
            data={selectedEntry}
        />
      )}

      {selectedEntry && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة القيد رقم "${selectedEntry.id}"؟ سيتم التراجع عن أثره المالي.`}
        />
      )}
    </div>
  );
};

export default JournalEntries;
