import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddInventoryAdjustmentForm from './AddInventoryAdjustmentForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import ViewDetailsModal from '../shared/ViewDetailsModal';
import { PlusIcon } from '../icons/PlusIcon';
import type { InventoryAdjustment } from '../../types';
import EditInventoryAdjustmentForm from './EditInventoryAdjustmentForm';

const InventoryAdjustments: React.FC = () => {
  const { inventoryAdjustments, archiveInventoryAdjustment, showToast } = useContext(DataContext);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);

  const handleView = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setViewModalOpen(true);
  };
  
  const handleEdit = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setEditModalOpen(true);
  };

  const handleArchive = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedAdjustment) {
        const result = archiveInventoryAdjustment(selectedAdjustment.id);
        if (result.success) {
            showToast('تمت أرشفة التسوية بنجاح.');
        } else {
            showToast(result.message || 'حدث خطأ أثناء الأرشفة.', 'error');
        }
    }
    setArchiveModalOpen(false);
    setSelectedAdjustment(null);
  };
  
  const handleSuccess = (newAdjustment: InventoryAdjustment) => {
      setAddModalOpen(false);
      setEditModalOpen(false);
      handleView(newAdjustment);
  }

  const columns = useMemo(() => [
    { header: 'رقم التسوية', accessor: 'id', sortable: true },
    { header: 'التاريخ', accessor: 'date', sortable: true },
    { header: 'النوع', accessor: 'type', sortable: true },
    { header: 'الوصف', accessor: 'description' },
    { header: 'الحساب المقابل', accessor: 'contraAccountName' },
    { header: 'القيمة الإجمالية', accessor: 'totalValue', render: (row: InventoryAdjustment) => `${row.totalValue.toLocaleString()} جنيه` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="تسويات المخزون" 
        buttonText="تسوية جديدة"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={inventoryAdjustments}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'date', 'type', 'description', 'contraAccountName']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة تسوية مخزون جديدة" size="4xl">
        <AddInventoryAdjustmentForm onClose={() => setAddModalOpen(false)} onSuccess={handleSuccess} />
      </Modal>
      
      {selectedAdjustment && isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل التسوية رقم: ${selectedAdjustment.id}`} size="4xl">
            <EditInventoryAdjustmentForm adjustment={selectedAdjustment} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} />
        </Modal>
      )}

      {selectedAdjustment && (
        <ViewDetailsModal
          isOpen={isViewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`تفاصيل التسوية رقم ${selectedAdjustment.id}`}
          data={selectedAdjustment}
        />
      )}

      {selectedAdjustment && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة التسوية رقم "${selectedAdjustment.id}"؟ سيتم التراجع عن أثرها المالي والمخزني.`}
        />
      )}
    </div>
  );
};

export default InventoryAdjustments;