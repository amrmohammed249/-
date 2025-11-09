import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseReturnView from './PurchaseReturnView';
import { PlusIcon, ArrowUturnLeftIcon } from '../icons';
import type { PurchaseReturn } from '../../types';

const PurchaseReturns: React.FC = () => {
  const { purchaseReturns, archivePurchaseReturn, showToast, sequences } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  const navigate = useNavigate();

  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  const handleView = (purchaseReturn: PurchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setViewModalOpen(true);
  };
  
  const handleArchive = (purchaseReturn: PurchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedReturn) {
        const result = archivePurchaseReturn(selectedReturn.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة المرتجع بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedReturn(null);
  };
  
  const handleAddNewReturn = () => {
      openWindow({
          path: '/purchases-returns/new',
          title: 'مرتجع مشتريات جديد',
          icon: <ArrowUturnLeftIcon />,
          state: {
              activeReturn: {
                  id: `PRET-${String(sequences.purchaseReturn).padStart(3, '0')}`,
                  date: new Date().toISOString().slice(0, 10),
              },
              items: [],
              supplier: null,
              productSearchTerm: '',
              supplierSearchTerm: '',
              isProcessing: false,
              itemErrors: {},
          }
      });
  };

  const columns = useMemo(() => [
    { header: 'رقم المرتجع', accessor: 'id' },
    { header: 'المورد', accessor: 'supplier' },
    { header: 'التاريخ', accessor: 'date' },
    { header: 'الفاتورة الأصلية', accessor: 'originalPurchaseId', render: (row: PurchaseReturn) => row.originalPurchaseId || 'N/A' },
    { header: 'الإجمالي', accessor: 'total', render: (row: PurchaseReturn) => `${row.total.toLocaleString()} جنيه مصري` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="قائمة مرتجعات المشتريات" 
        buttonText="مرتجع جديد"
        onButtonClick={handleAddNewReturn}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={purchaseReturns}
        actions={['view', 'archive']}
        onView={handleView}
        onArchive={handleArchive}
        searchableColumns={['id', 'supplier', 'date', 'originalPurchaseId']}
      />
      
      {selectedReturn && (
        <PurchaseReturnView
          isOpen={isViewModalOpen}
          onClose={() => setViewModalOpen(false)}
          purchaseReturn={selectedReturn}
        />
      )}

      {selectedReturn && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة المرتجع رقم "${selectedReturn.id}"؟ سيتم التراجع عن أثره المالي والمخزني.`}
        />
      )}
    </div>
  );
};

export default PurchaseReturns;