import React, { useState, useContext } from 'react';
import Modal from './Modal';
import { DataContext } from '../../context/DataContext';
import { PencilIcon } from '../icons/PencilIcon';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataManagerModal: React.FC<DataManagerModalProps> = ({ isOpen, onClose }) => {
  const { 
    dataManager, 
    switchDataset, 
    renameDataset
  } = useContext(DataContext);
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleRename = (key: string) => {
    if (editingName.trim()) {
      renameDataset(key, editingName.trim());
      setEditingKey(null);
    }
  };

  const startEditing = (key: string, name: string) => {
    setEditingKey(key);
    setEditingName(name);
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إدارة قواعد البيانات (الشركات)">
      <div className="space-y-6">
        <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">قائمة الشركات</h3>
            <div className="border rounded-lg dark:border-gray-600 max-h-60 overflow-y-auto">
                {dataManager.datasets.map(ds => (
                    <div key={ds.key} className="flex items-center justify-between p-3 border-b dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {editingKey === ds.key ? (
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleRename(ds.key)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename(ds.key)}
                                className="px-2 py-1 bg-white dark:bg-gray-700 border border-blue-500 rounded-md shadow-sm"
                                autoFocus
                            />
                        ) : (
                           <span className="font-semibold">{ds.name}</span>
                        )}

                        <div className="flex items-center space-x-2 space-x-reverse">
                            {ds.key === dataManager.activeDatasetKey ? (
                                <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">الحالية</span>
                            ) : (
                                <button onClick={() => switchDataset(ds.key)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">تحويل</button>
                            )}
                             <button onClick={() => startEditing(ds.key, ds.name)} className="p-1 text-gray-400 hover:text-green-500" title="إعادة تسمية">
                                <PencilIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </Modal>
  );
};

export default DataManagerModal;