import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import SaleReturnView from './SaleReturnView';
import { PlusIcon } from '../icons/PlusIcon';
import type { SaleReturn } from '../../types';
import { ArrowUturnLeftIcon } from '../icons';

const SaleReturns: React.FC = () => {
  const { saleReturns, deleteSaleReturn, showToast, sequences } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  const navigate = useNavigate();

  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<SaleReturn | null>(null);

  const handleView = (saleReturn: SaleReturn) => {
    setReturnToDelete(saleReturn);
    setViewModalOpen(true);
  };

  const handleDelete = (saleReturn: SaleReturn) => {
    setReturnToDelete(saleReturn);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
    if (returnToDelete) {
        const result = deleteSaleReturn(returnToDelete.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تم حذف المرتجع بنجاح.');
        }
    }
    setDeleteModalOpen(false);
    setReturnToDelete(null);
  };
  
  const handleAddNewReturn = () => {
    openWindow({
        path: '/sales-returns/new',
        title: 'مرتجع مبيعات جديد',
        icon: <ArrowUturnLeftIcon />,
        state: {
            activeReturn: {
                id: `SRET-${String(sequences.saleReturn).padStart(3, '0')}`,
                date: new Date().toISOString().slice(0, 10),
            },
            items: [],
            customer: null,
            productSearchTerm: '',
            customerSearchTerm: '',
            isProcessing: false,
        }
    });
  };

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
        title="قائمة مرتجعات المبيعات" 
        buttonText="مرتجع جديد"
        onButtonClick={handleAddNewReturn}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={saleReturns}
        actions={['view', 'delete']}
        onView={handleView}
        onDelete={handleDelete}
        searchableColumns={['id', 'customer', 'date', 'originalSaleId']}
      />
      
      {returnToDelete && (
        <SaleReturnView
          isOpen={isViewModalOpen}
          onClose={() => { setViewModalOpen(false); setReturnToDelete(null); }}
          saleReturn={returnToDelete}
        />
      )}

      {returnToDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من رغبتك في حذف المرتجع رقم "${returnToDelete.id}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        />
      )}
    </div>
  );
};

export default SaleReturns;