import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import PurchaseInvoiceView from './PurchaseInvoiceView';
import { PlusIcon } from '../icons/PlusIcon';
import { Purchase } from '../../types';

const PurchaseList: React.FC = () => {
    const { purchases, archivePurchase, showToast } = useContext(DataContext);
    const navigate = useNavigate();

    const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);
    const [purchaseToArchive, setPurchaseToArchive] = useState<Purchase | null>(null);

    const handleArchive = (purchase: Purchase) => {
        setPurchaseToArchive(purchase);
    };
    
    const confirmArchive = () => {
        if (purchaseToArchive) {
            const result = archivePurchase(purchaseToArchive.id);
            if (result.success) {
                showToast('تمت أرشفة الفاتورة بنجاح.');
            } else {
                showToast(result.message, 'error');
            }
        }
        setPurchaseToArchive(null);
    };

    const columns = useMemo(() => [
        { header: 'رقم الفاتورة', accessor: 'id', sortable: true },
        { header: 'المورد', accessor: 'supplier', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الإجمالي', accessor: 'total', render: (row: Purchase) => `${row.total.toLocaleString()} جنيه`, sortable: true },
        { header: 'الحالة', accessor: 'status', render: (row: Purchase) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                row.status === 'مدفوعة' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>{row.status}</span>
        ), sortable: true },
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="قائمة فواتير المشتريات" 
                buttonText="إضافة فاتورة جديدة"
                onButtonClick={() => navigate('/purchases/new')}
                buttonIcon={<PlusIcon />}
            />
            <DataTable 
                columns={columns} 
                data={purchases}
                actions={['view', 'edit', 'archive']}
                onView={(row) => setPurchaseToView(row)}
                onEdit={(row) => navigate(`/purchases/edit/${row.id}`)}
                onArchive={handleArchive}
                searchableColumns={['id', 'supplier', 'date', 'status']}
            />

            {purchaseToView && (
                <PurchaseInvoiceView isOpen={!!purchaseToView} onClose={() => setPurchaseToView(null)} purchase={purchaseToView} />
            )}

            {purchaseToArchive && (
                <ConfirmationModal
                    isOpen={!!purchaseToArchive}
                    onClose={() => setPurchaseToArchive(null)}
                    onConfirm={confirmArchive}
                    title="تأكيد الأرشفة"
                    message={`هل أنت متأكد من رغبتك في أرشفة فاتورة المشتريات رقم "${purchaseToArchive.id}"؟ سيتم التراجع عن أثرها المالي والمخزني.`}
                />
            )}
        </div>
    );
};

export default PurchaseList;
