import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddPurchaseReturnForm from './AddPurchaseReturnForm';
import EditPurchaseReturnForm from './EditPurchaseReturnForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseReturnView from './PurchaseReturnView';
import { PlusIcon } from '../icons/PlusIcon';
import type { PurchaseReturn } from '../../types';

const PurchaseReturns: React.FC = () => {
  const { purchaseReturns, archivePurchaseReturn, showToast } = useContext(DataContext);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  const handleView = (purchaseReturn: PurchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setViewModalOpen(true);
  };
  
  const handleEdit = (purchaseReturn: PurchaseReturn) => {
    setSelectedReturn(purchaseReturn);
    setEditModalOpen(true);
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
  
  const handleSuccess = (newReturn: PurchaseReturn) => {
      setAddModalOpen(false);
      setEditModalOpen(false);
      handleView(newReturn);
  }

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
        title="مرتجعات المشتريات" 
        buttonText="مرتجع جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={purchaseReturns}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'supplier', 'date', 'originalPurchaseId']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة مرتجع مشتريات جديد" size="4xl">
        <AddPurchaseReturnForm onClose={() => setAddModalOpen(false)} onSuccess={handleSuccess} />
      </Modal>

      {selectedReturn && isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل مرتجع مشتريات: ${selectedReturn.id}`} size="4xl">
          <EditPurchaseReturnForm purchaseReturn={selectedReturn} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} />
        </Modal>
      )}
      
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
