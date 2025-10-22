import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddSaleReturnForm from './AddSaleReturnForm';
import EditSaleReturnForm from './EditSaleReturnForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import SaleReturnView from './SaleReturnView';
import { PlusIcon } from '../icons/PlusIcon';
import type { SaleReturn } from '../../types';

const SaleReturns: React.FC = () => {
  const { saleReturns, archiveSaleReturn, showToast } = useContext(DataContext);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  const handleView = (saleReturn: SaleReturn) => {
    setSelectedReturn(saleReturn);
    setViewModalOpen(true);
  };
  
  const handleEdit = (saleReturn: SaleReturn) => {
    setSelectedReturn(saleReturn);
    setEditModalOpen(true);
  };

  const handleArchive = (saleReturn: SaleReturn) => {
    setSelectedReturn(saleReturn);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedReturn) {
        const result = archiveSaleReturn(selectedReturn.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة المرتجع بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedReturn(null);
  };
  
  const handleSuccess = (newReturn: SaleReturn) => {
      setAddModalOpen(false);
      setEditModalOpen(false);
      handleView(newReturn);
  }

  const columns = useMemo(() => [
    { header: 'رقم المرتجع', accessor: 'id' },
    { header: 'العميل', accessor: 'customer' },
    { header: 'التاريخ', accessor: 'date' },
    { header: 'الفاتورة الأصلية', accessor: 'originalSaleId', render: (row: SaleReturn) => row.originalSaleId || 'N/A' },
    { header: 'الإجمالي', accessor: 'total', render: (row: SaleReturn) => `${row.total.toLocaleString()} جنيه مصري` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="مرتجعات المبيعات" 
        buttonText="مرتجع جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={saleReturns}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'customer', 'date', 'originalSaleId']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة مرتجع مبيعات جديد" size="4xl">
        <AddSaleReturnForm onClose={() => setAddModalOpen(false)} onSuccess={handleSuccess} />
      </Modal>

      {selectedReturn && isEditModalOpen && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل مرتجع مبيعات: ${selectedReturn.id}`} size="4xl">
            <EditSaleReturnForm saleReturn={selectedReturn} onClose={() => setEditModalOpen(false)} onSuccess={handleSuccess} />
        </Modal>
      )}
      
      {selectedReturn && (
        <SaleReturnView
          isOpen={isViewModalOpen}
          onClose={() => setViewModalOpen(false)}
          saleReturn={selectedReturn}
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

export default SaleReturns;
