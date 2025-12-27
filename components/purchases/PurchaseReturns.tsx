import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseReturnView from './PurchaseReturnView';
import { PlusIcon, ArrowUturnLeftIcon, PencilIcon } from '../icons';
import type { PurchaseReturn } from '../../types';

const PurchaseReturns: React.FC = () => {
  const { purchaseReturns, deletePurchaseReturn, showToast, sequences, suppliers } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  const navigate = useNavigate();

  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<PurchaseReturn | null>(null);

  const handleView = (purchaseReturn: PurchaseReturn) => {
    setReturnToDelete(purchaseReturn);
    setViewModalOpen(true);
  };

  const handleEdit = (purchaseReturn: PurchaseReturn) => {
    const supplier = suppliers.find((s: any) => s.name === purchaseReturn.supplier);
    openWindow({
        path: '/purchases-returns/new',
        title: `تعديل مرتجع مشتريات ${purchaseReturn.id}`,
        icon: <PencilIcon />,
        state: {
            isEditMode: true,
            activeReturn: purchaseReturn,
            items: JSON.parse(JSON.stringify(purchaseReturn.items)),
            supplier: supplier || null,
            productSearchTerm: '',
            supplierSearchTerm: '',
            isProcessing: false,
            itemErrors: {},
        }
    });
  };
  
  const handleDelete = (purchaseReturn: PurchaseReturn) => {
    setReturnToDelete(purchaseReturn);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
    if (returnToDelete) {
        const result = deletePurchaseReturn(returnToDelete.id);
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
        actions={['view', 'edit', 'delete']}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchableColumns={['id', 'supplier', 'date', 'originalPurchaseId']}
      />
      
      {returnToDelete && (
        <PurchaseReturnView
          isOpen={isViewModalOpen}
          onClose={() => { setViewModalOpen(false); setReturnToDelete(null); }}
          purchaseReturn={returnToDelete}
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

export default PurchaseReturns;