
import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import type { AccountNode } from '../../types';
import Modal from '../shared/Modal';
import AddAccountForm from './AddAccountForm';
import EditAccountForm from './EditAccountForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { FolderIcon } from '../icons/FolderIcon';
import { DocumentIcon } from '../icons/DocumentIcon';
import { FolderOpenIcon } from '../icons/FolderOpenIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import OpeningBalancesModal from './OpeningBalancesModal';
import AccessDenied from '../shared/AccessDenied';

interface AccountTreeProps {
  nodes: AccountNode[];
  onAdd: (parentId: string | null) => void;
  onEdit: (account: AccountNode) => void;
  onArchive: (account: AccountNode) => void;
  level?: number;
}

const AccountTree: React.FC<AccountTreeProps> = ({ nodes, onAdd, onEdit, onArchive, level = 0 }) => {
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});
  const { currentUser } = useContext(DataContext);
  const canModify = currentUser.role === 'مدير النظام' || currentUser.role === 'محاسب';

  const toggleNode = (id: string) => {
    setOpenNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      {nodes.map(node => (
        <div key={node.id} style={{ paddingRight: `${level * 20}px` }}>
          <div className="flex items-center justify-between p-2 my-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50">
            <div className="flex items-center">
              {node.children && node.children.length > 0 ? (
                <button onClick={() => toggleNode(node.id)} className="ml-2">
                   {openNodes[node.id] ? <FolderOpenIcon className="w-5 h-5 text-yellow-500" /> : <FolderIcon className="w-5 h-5 text-yellow-500" />}
                </button>
              ) : (
                <DocumentIcon className="w-5 h-5 text-gray-400 ml-2" />
              )}
               <span className="font-semibold text-gray-800 dark:text-gray-200">{node.code} - {node.name}</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
               {node.balance !== undefined && <span className={`text-sm font-mono p-1 rounded ${node.balance > 0 ? 'text-blue-600' : node.balance < 0 ? 'text-green-600' : 'text-gray-500'}`}>{Math.abs(node.balance).toLocaleString()} {node.balance < 0 ? 'دائن' : 'مدين'}</span>}
               {canModify && (
                <>
                  {node.children && <button onClick={() => onAdd(node.id)} className="text-gray-400 hover:text-blue-500"><PlusIcon className="w-4 h-4" /></button>}
                  <button onClick={() => onEdit(node)} className="text-gray-400 hover:text-green-500"><PencilIcon className="w-4 h-4" /></button>
                  <button onClick={() => onArchive(node)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                </>
               )}
            </div>
          </div>
          {node.children && openNodes[node.id] && (
            <AccountTree nodes={node.children} onAdd={onAdd} onEdit={onEdit} onArchive={onArchive} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
};

const ChartOfAccounts: React.FC = () => {
  const { chartOfAccounts, archiveAccount, showToast, currentUser } = useContext(DataContext);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isBalancesModalOpen, setBalancesModalOpen] = useState(false);

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);

  const canModify = currentUser.role === 'مدير النظام' || currentUser.role === 'محاسب';

  const handleAdd = (parentId: string | null) => {
    setSelectedParentId(parentId);
    setAddModalOpen(true);
  };

  const handleEdit = (account: AccountNode) => {
    setSelectedAccount(account);
    setEditModalOpen(true);
  };

  const handleArchive = (account: AccountNode) => {
    setSelectedAccount(account);
    setArchiveModalOpen(true);
  };
  
  const confirmArchive = () => {
    if (selectedAccount) {
      const result = archiveAccount(selectedAccount.id);
      if (!result.success) {
        showToast(result.message, 'error');
      } else {
        showToast('تمت أرشفة الحساب بنجاح.');
      }
    }
    setArchiveModalOpen(false);
    setSelectedAccount(null);
  };

  if (!canModify) {
      return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">شجرة الحسابات</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">إدارة وتصنيف الحسابات المالية.</p>
                </div>
                <div className="flex gap-2">
                   <button 
                        onClick={() => setBalancesModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                        <PencilIcon className="w-5 h-5 ml-2" />
                        <span>الأرصدة الافتتاحية</span>
                    </button>
                    <button 
                        onClick={() => handleAdd(null)}
                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5 ml-2" />
                        <span>إضافة حساب رئيسي</span>
                    </button>
                </div>
            </div>
            <div className="border-t pt-4 dark:border-gray-700">
                <AccountTree 
                    nodes={chartOfAccounts} 
                    onAdd={handleAdd} 
                    onEdit={handleEdit} 
                    onArchive={handleArchive} 
                />
            </div>
        </div>

      {isAddModalOpen && (
        <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة حساب جديد">
          <AddAccountForm onClose={() => setAddModalOpen(false)} parentId={selectedParentId} />
        </Modal>
      )}

      {isEditModalOpen && selectedAccount && (
        <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="تعديل حساب">
          <EditAccountForm account={selectedAccount} onClose={() => setEditModalOpen(false)} />
        </Modal>
      )}

      {isArchiveModalOpen && selectedAccount && (
        <ConfirmationModal
          isOpen={isArchiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={confirmArchive}
          title="تأكيد الأرشفة"
          message={`هل أنت متأكد من رغبتك في أرشفة الحساب "${selectedAccount.name}"؟ لا يمكن حذف الحسابات التي لها رصيد أو حركات.`}
        />
      )}
      
      {isBalancesModalOpen && (
        <OpeningBalancesModal isOpen={isBalancesModalOpen} onClose={() => setBalancesModalOpen(false)} />
      )}
    </div>
  );
};

export default ChartOfAccounts;
