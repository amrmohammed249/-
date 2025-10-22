import React, { useState, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import InvoiceView from './InvoiceView';
import { PlusIcon } from '../icons/PlusIcon';
import { Sale } from '../../types';

const SaleList: React.FC = () => {
    const { sales, archiveSale, showToast } = useContext(DataContext);
    const navigate = useNavigate();

    const [saleToView, setSaleToView] = useState<Sale | null>(null);
    const [saleToArchive, setSaleToArchive] = useState<Sale | null>(null);

    const handleArchive = (sale: Sale) => {
        setSaleToArchive(sale);
    };
    
    const confirmArchive = () => {
        if (saleToArchive) {
            const result = archiveSale(saleToArchive.id);
            if (result.success) {
                showToast('تمت أرشفة الفاتورة بنجاح.');
            } else {
                showToast(result.message, 'error');
            }
        }
        setSaleToArchive(null);
    };

    const columns = useMemo(() => [
        { header: 'رقم الفاتورة', accessor: 'id', sortable: true },
        { header: 'العميل', accessor: 'customer', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الإجمالي', accessor: 'total', render: (row: Sale) => `${row.total.toLocaleString()} جنيه`, sortable: true },
        { header: 'الحالة', accessor: 'status', render: (row: Sale) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                row.status === 'مدفوعة' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                row.status === 'مستحقة' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>{row.status}</span>
        ), sortable: true },
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="قائمة فواتير المبيعات" 
                buttonText="إضافة فاتورة جديدة"
                onButtonClick={() => navigate('/sales/new')}
                buttonIcon={<PlusIcon />}
            />
            <DataTable 
                columns={columns} 
                data={sales}
                actions={['view', 'edit', 'archive']}
                onView={(row) => setSaleToView(row)}
                onEdit={(row) => navigate(`/sales/edit/${row.id}`)}
                onArchive={handleArchive}
                searchableColumns={['id', 'customer', 'date', 'status']}
            />

            {saleToView && (
                <InvoiceView isOpen={!!saleToView} onClose={() => setSaleToView(null)} sale={saleToView} />
            )}

            {saleToArchive && (
                <ConfirmationModal
                    isOpen={!!saleToArchive}
                    onClose={() => setSaleToArchive(null)}
                    onConfirm={confirmArchive}
                    title="تأكيد الأرشفة"
                    message={`هل أنت متأكد من رغبتك في أرشفة الفاتورة رقم "${saleToArchive.id}"؟ سيتم التراجع عن أثرها المالي والمخزني.`}
                />
            )}
        </div>
    );
};

export default SaleList;
