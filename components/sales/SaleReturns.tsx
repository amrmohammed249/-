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
  const { saleReturns, archiveSaleReturn, showToast, sequences } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  const navigate = useNavigate();

  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  const handleView = (saleReturn: SaleReturn) => {
    setSelectedReturn(saleReturn);
    setViewModalOpen(true);
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
        actions={['view', 'archive']}
        onView={handleView}
        onArchive={handleArchive}
        searchableColumns={['id', 'customer', 'date', 'originalSaleId']}
      />
      
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