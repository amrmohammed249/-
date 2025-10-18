import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddSaleForm from './AddSaleForm';
import EditSaleForm from './EditSaleForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import InvoiceView from './InvoiceView';
import { PlusIcon } from '../icons/PlusIcon';
import type { Sale } from '../../types';

const Sales: React.FC = () => {
  const { sales, archiveSale, showToast } = useContext(DataContext);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const handleView = (sale: Sale) => {
    setSelectedSale(sale);
    setViewModalOpen(true);
  };
  
  const handleEdit = (sale: Sale) => {
    setSelectedSale(sale);
    setEditModalOpen(true);
  };
  
  const handleArchive = (sale: Sale) => {
    setSelectedSale(sale);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedSale) {
        const result = archiveSale(selectedSale.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة الفاتورة بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedSale(null);
  };
  
  const handleSuccess = (newSale: Sale) => {
      setAddModalOpen(false);
      handleView(newSale);
  }

  const columns = useMemo(() => [
    { header: 'رقم الفاتورة', accessor: 'id' },
    { header: 'العميل', accessor: 'customer' },
    { header: 'التاريخ', accessor: 'date' },
    { header: 'الإجمالي', accessor: 'total', render: (row: Sale) => `${row.total.toLocaleString()} جنيه مصري` },
    { header: 'الحالة', accessor: 'status' },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="فواتير المبيعات" 
        buttonText="فاتورة جديدة"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={sales}
        actions={['view', 'edit', 'archive']}
        onView={handleView}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'customer', 'date', 'status']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة فاتورة مبيعات جديدة" size="4xl">
        <AddSaleForm onClose={() => setAddModalOpen(false)} onSuccess={handleSuccess} />
      </Modal>
      
      {selectedSale && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل الفاتورة: ${selectedSale.id}`} size="4xl">
          <EditSaleForm sale={selectedSale} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedSale && (
        <InvoiceView
          isOpen={isViewModalOpen}
          onClose={() => setViewModalOpen(false)}
          sale={selectedSale}
        />
      )}

      {selectedSale && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة الفاتورة رقم "${selectedSale.id}"؟ سيتم التراجع عن أثرها المالي والمخزني.`}
        />
      )}
    </div>
  );
};

export default Sales;
