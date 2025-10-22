import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddSupplierForm from './AddSupplierForm';
import EditSupplierForm from './EditSupplierForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';

const Suppliers: React.FC = () => {
  const { suppliers, archiveSupplier, showToast } = useContext(DataContext);
  const navigate = useNavigate();
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setEditModalOpen(true);
  };
  
  const handleArchive = (supplier: any) => {
    setSelectedSupplier(supplier);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedSupplier) {
        const result = archiveSupplier(selectedSupplier.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة المورد بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedSupplier(null);
  };

  const columns = useMemo(() => [
    { header: 'كود المورد', accessor: 'id' },
    { header: 'اسم المورد', accessor: 'name' },
    { header: 'رقم الهاتف', accessor: 'phone' },
    { header: 'العنوان', accessor: 'address' },
    { header: 'جهة الاتصال', accessor: 'contact' },
    { header: 'الرصيد', accessor: 'balance', render: (row: any) => `${row.balance.toLocaleString()} جنيه مصري` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="إدارة الموردين" 
        buttonText="إضافة مورد جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={suppliers}
        actions={['edit', 'archive']}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
        searchableColumns={['id', 'name', 'phone', 'address', 'contact']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة مورد جديد">
        <AddSupplierForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      {selectedSupplier && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل المورد: ${selectedSupplier.name}`}>
          <EditSupplierForm supplier={selectedSupplier} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedSupplier && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة المورد "${selectedSupplier.name}"؟ لا يمكن أرشفة مورد رصيده لا يساوي صفر.`}
        />
      )}
    </div>
  );
};

export default Suppliers;