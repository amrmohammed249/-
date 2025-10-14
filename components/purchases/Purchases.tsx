
import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import Table from '../shared/Table';
import Modal from '../shared/Modal';
import AddPurchaseForm from './AddPurchaseForm';
import EditPurchaseForm from './EditPurchaseForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseInvoiceView from './PurchaseInvoiceView';
import { PlusIcon } from '../icons/PlusIcon';
import type { Purchase } from '../../types';

const Purchases: React.FC = () => {
  const { purchases, archivePurchase, showToast, suppliers } = useContext(DataContext);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  const handleView = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setViewModalOpen(true);
  };
  
  const handleEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setEditModalOpen(true);
  };
  
  const handleArchive = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedPurchase) {
        const result = archivePurchase(selectedPurchase.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة فاتورة المشتريات بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedPurchase(null);
  };
  
  const handleSuccess = (newPurchase: Purchase) => {
      setAddModalOpen(false);
      handleView(newPurchase);
  }

  const columns = useMemo(() => [
    { header: 'رقم الفاتورة', accessor: 'id' },
    { header: 'المورد', accessor: 'supplier' },
    { header: 'التاريخ', accessor: 'date' },
    { header: 'الإجمالي', accessor: 'total', render: (row: Purchase) => `${row.total.toLocaleString()} جنيه مصري` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="فواتير المشتريات" 
        buttonText="فاتورة جديدة"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <Table 
        columns={columns} 
        data={purchases}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة فاتورة مشتريات جديدة" size="4xl">
        <AddPurchaseForm onClose={() => setAddModalOpen(false)} onSuccess={handleSuccess} />
      </Modal>
      
      {selectedPurchase && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل فاتورة المشتريات: ${selectedPurchase.id}`} size="4xl">
          <EditPurchaseForm purchase={selectedPurchase} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedPurchase && (
        <PurchaseInvoiceView
          isOpen={isViewModalOpen}
          onClose={() => setViewModalOpen(false)}
          purchase={selectedPurchase}
        />
      )}

      {selectedPurchase && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة فاتورة المشتريات رقم "${selectedPurchase.id}"؟ سيتم التراجع عن أثرها المالي والمخزني.`}
        />
      )}
    </div>
  );
};

export default Purchases;
