import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddFixedAssetForm from './AddFixedAssetForm';
import EditFixedAssetForm from './EditFixedAssetForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';
import type { FixedAsset } from '../../types';

const FixedAssets: React.FC = () => {
  const { fixedAssets, archiveFixedAsset, showToast } = useContext(DataContext);
  
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  const handleEdit = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setEditModalOpen(true);
  };
  
  const handleArchive = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedAsset) {
        const result = archiveFixedAsset(selectedAsset.id);
        if (!result.success) {
            showToast(result.message, 'error');
        } else {
            showToast('تمت أرشفة الأصل بنجاح.');
        }
    }
    setArchiveModalOpen(false);
    setSelectedAsset(null);
  };

  const columns = useMemo(() => [
    { header: 'رمز الأصل', accessor: 'id' },
    { header: 'اسم الأصل', accessor: 'name' },
    { header: 'تاريخ الاقتناء', accessor: 'acquisitionDate' },
    { header: 'التكلفة', accessor: 'cost', render: (row: FixedAsset) => `${row.cost.toLocaleString()} جنيه مصري` },
    { header: 'نسبة الإهلاك', accessor: 'depreciationRate', render: (row: FixedAsset) => `${row.depreciationRate}%` },
    { header: 'مجمع الإهلاك', accessor: 'accumulatedDepreciation', render: (row: FixedAsset) => `${row.accumulatedDepreciation.toLocaleString()} جنيه مصري` },
    { header: 'القيمة الدفترية', accessor: 'bookValue', render: (row: FixedAsset) => `${row.bookValue.toLocaleString()} جنيه مصري` },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="إدارة الأصول الثابتة" 
        buttonText="إضافة أصل جديد"
        onButtonClick={() => setAddModalOpen(true)}
        buttonIcon={<PlusIcon />}
      />
      <DataTable 
        columns={columns} 
        data={fixedAssets}
        actions={['edit', 'archive']}
        onEdit={handleEdit}
        onArchive={handleArchive}
        searchableColumns={['id', 'name', 'acquisitionDate']}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة أصل ثابت جديد">
        <AddFixedAssetForm onClose={() => setAddModalOpen(false)} />
      </Modal>

      {selectedAsset && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`تعديل الأصل: ${selectedAsset.name}`}>
          <EditFixedAssetForm asset={selectedAsset} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {selectedAsset && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة الأصل "${selectedAsset.name}"؟`}
        />
      )}
    </div>
  );
};

export default FixedAssets;
