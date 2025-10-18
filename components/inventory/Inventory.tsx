import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddItemForm from './AddItemForm';
import EditItemForm from './EditItemForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

const LOW_STOCK_THRESHOLD = 10;

const Inventory: React.FC = () => {
  const { inventory, archiveItem, showToast } = useContext(DataContext);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const lowStockItems = useMemo(() => 
    inventory.filter(item => item.stock <= LOW_STOCK_THRESHOLD)
    .sort((a,b) => a.stock - b.stock), 
  [inventory]);

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };
  
  const handleArchive = (item: any) => {
    setSelectedItem(item);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedItem) {
        const result = archiveItem(selectedItem.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة الصنف بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedItem(null);
  };

  const columns = useMemo(() => [
    { header: 'كود الصنف', accessor: 'id' },
    { 
      header: 'اسم الصنف', 
      accessor: 'name',
      render: (row: any) => (
        <div className="flex items-center">
          {row.stock <= LOW_STOCK_THRESHOLD && (
            <span 
              className="w-2.5 h-2.5 bg-red-500 rounded-full ml-2 flex-shrink-0"
              title={`كمية منخفضة: ${row.stock} متبقي`}
            ></span>
          )}
          <span>{row.name}</span>
        </div>
      )
    },
    { header: 'الوحدة الأساسية', accessor: 'baseUnit' },
    { header: 'الفئة', accessor: 'category' },
    { header: 'سعر الشراء', accessor: 'purchasePrice', render: (row: any) => `${row.purchasePrice.toLocaleString()} جنيه` },
    { header: 'سعر البيع', accessor: 'salePrice', render: (row: any) => `${row.salePrice.toLocaleString()} جنيه` },
    { header: 'الكمية المتاحة', accessor: 'stock', render: (row: any) => {
        const isLow = row.stock <= LOW_STOCK_THRESHOLD;
        return (
            <span className={isLow ? 'font-bold text-red-600 dark:text-red-400' : ''}>
                {row.stock}
            </span>
        )
    }},
  ], []);
  
  const getRowClassName = (row: any) => {
    return row.stock <= LOW_STOCK_THRESHOLD ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : '';
  };


  return (
    <div className="space-y-6">
      <PageHeader 
        title="قائمة الأصناف" 
        buttonText="إضافة صنف جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                تنبيه انخفاض المخزون
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-100">
                <p>الأصناف التالية على وشك النفاد:</p>
                <ul className="list-disc pr-5 mt-2 space-y-1">
                  {lowStockItems.map(item => (
                    <li key={item.id}>
                      <strong>{item.name}:</strong> الكمية المتبقية {item.stock}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={inventory}
        actions={['edit', 'archive']}
        onEdit={handleEdit}
        onArchive={handleArchive}
        rowClassName={getRowClassName}
        searchableColumns={['id', 'name', 'baseUnit', 'category']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة صنف جديد للمخزون" size="4xl">
        <AddItemForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      {selectedItem && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل الصنف: ${selectedItem.name}`} size="4xl">
          <EditItemForm item={selectedItem} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedItem && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة الصنف "${selectedItem.name}"؟ لا يمكن أرشفة صنف رصيده لا يساوي صفر.`}
        />
      )}
    </div>
  );
};

export default Inventory;