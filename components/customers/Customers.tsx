import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddCustomerForm from './AddCustomerForm';
import EditCustomerForm from './EditCustomerForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';

const Customers: React.FC = () => {
  const { customers, archiveCustomer, showToast } = useContext(DataContext);
  const navigate = useNavigate();
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };
  
  const handleArchive = (customer: any) => {
    setSelectedCustomer(customer);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedCustomer) {
        const result = archiveCustomer(selectedCustomer.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة العميل بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedCustomer(null);
  };

  const columns = useMemo(() => [
    { header: 'كود العميل', accessor: 'id' },
    { header: 'اسم العميل', accessor: 'name' },
    { header: 'رقم الهاتف', accessor: 'phone' },
    { header: 'العنوان', accessor: 'address' },
    { header: 'البريد الإلكتروني', accessor: 'contact' },
    { 
      header: 'الرصيد', 
      accessor: 'balance', 
      render: (row: any) => (
        <span className={`font-mono font-semibold ${row.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {row.balance.toLocaleString()} جنيه مصري
        </span>
      )
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="إدارة العملاء" 
        buttonText="إضافة عميل جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={customers}
        actions={['edit', 'archive']}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onRowClick={(row) => navigate(`/customers/${row.id}`)}
        searchableColumns={['id', 'name', 'phone', 'address', 'contact']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة عميل جديد">
        <AddCustomerForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      {selectedCustomer && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل العميل: ${selectedCustomer.name}`}>
          <EditCustomerForm customer={selectedCustomer} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedCustomer && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة العميل "${selectedCustomer.name}"؟ لا يمكن أرشفة عميل رصيده لا يساوي صفر.`}
        />
      )}
    </div>
  );
};

export default Customers;