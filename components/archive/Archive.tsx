import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import AccessDenied from '../shared/AccessDenied';
import { Sale } from '../../types';

type ArchiveTab = 'customers' | 'suppliers' | 'sales' | 'purchases' | 'inventory' | 'journal' | 'users' | 'fixedAssets';

const Archive: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ArchiveTab>('customers');
    const { 
        archivedCustomers, unarchiveCustomer,
        archivedSuppliers, unarchiveSupplier,
        archivedSales, unarchiveSale,
        archivedPurchases, unarchivePurchase,
        archivedInventory, unarchiveItem,
        archivedJournal, unarchiveJournalEntry,
        archivedUsers, unarchiveUser,
        archivedFixedAssets, unarchiveFixedAsset,
        currentUser 
    } = useContext(DataContext);

    if (currentUser.role !== 'مدير النظام') {
        return <AccessDenied />;
    }

    const customerColumns = [
        { header: 'كود العميل', accessor: 'id' },
        { header: 'اسم العميل', accessor: 'name' },
        { header: 'البريد الإلكتروني', accessor: 'contact' },
        { header: 'الرصيد', accessor: 'balance', render: (row: any) => `${row.balance.toLocaleString()} جنيه مصري` },
    ];
    
    const supplierColumns = [
        { header: 'كود المورد', accessor: 'id' },
        { header: 'اسم المورد', accessor: 'name' },
        { header: 'جهة الاتصال', accessor: 'contact' },
        { header: 'الرصيد', accessor: 'balance', render: (row: any) => `${row.balance.toLocaleString()} جنيه مصري` },
    ];

    const salesColumns = [
        { header: 'رقم الفاتورة', accessor: 'id' },
        { header: 'العميل', accessor: 'customer' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الإجمالي', accessor: 'total', render: (row: Sale) => `${row.total.toLocaleString()} جنيه مصري` },
    ];
    
    const purchasesColumns = [
        { header: 'رقم الفاتورة', accessor: 'id' },
        { header: 'المورد', accessor: 'supplier' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الإجمالي', accessor: 'total', render: (row: any) => `${row.total.toLocaleString()} جنيه مصري` },
    ];

    const inventoryColumns = [
        { header: 'كود الصنف', accessor: 'id' },
        { header: 'اسم الصنف', accessor: 'name' },
        { header: 'الكمية المتاحة', accessor: 'stock' },
    ];

    const journalColumns = [
        { header: 'رقم القيد', accessor: 'id' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الوصف', accessor: 'description' },
    ];

    const userColumns = [
        { header: 'الاسم الكامل', accessor: 'name' },
        { header: 'معرف المستخدم', accessor: 'username' },
        { header: 'الدور', accessor: 'role' },
    ];

    const fixedAssetColumns = [
        { header: 'رمز الأصل', accessor: 'id' },
        { header: 'اسم الأصل', accessor: 'name' },
        { header: 'التكلفة', accessor: 'cost', render: (row: any) => `${row.cost.toLocaleString()} جنيه مصري` },
        { header: 'القيمة الدفترية', accessor: 'bookValue', render: (row: any) => `${row.bookValue.toLocaleString()} جنيه مصري` },
    ];

    const tabs: { key: ArchiveTab, label: string, data: any[], columns: any[], onUnarchive: (id: string) => void, searchable: string[] }[] = [
        { key: 'customers', label: 'العملاء', data: archivedCustomers, columns: customerColumns, onUnarchive: unarchiveCustomer, searchable: ['id', 'name', 'contact'] },
        { key: 'suppliers', label: 'الموردين', data: archivedSuppliers, columns: supplierColumns, onUnarchive: unarchiveSupplier, searchable: ['id', 'name', 'contact'] },
        { key: 'sales', label: 'المبيعات', data: archivedSales, columns: salesColumns, onUnarchive: unarchiveSale, searchable: ['id', 'customer', 'date'] },
        { key: 'purchases', label: 'المشتريات', data: archivedPurchases, columns: purchasesColumns, onUnarchive: unarchivePurchase, searchable: ['id', 'supplier', 'date'] },
        { key: 'inventory', label: 'المخزون', data: archivedInventory, columns: inventoryColumns, onUnarchive: unarchiveItem, searchable: ['id', 'name'] },
        { key: 'fixedAssets', label: 'الأصول الثابتة', data: archivedFixedAssets, columns: fixedAssetColumns, onUnarchive: unarchiveFixedAsset, searchable: ['id', 'name'] },
        { key: 'journal', label: 'القيود اليومية', data: archivedJournal, columns: journalColumns, onUnarchive: unarchiveJournalEntry, searchable: ['id', 'date', 'description'] },
        { key: 'users', label: 'المستخدمين', data: archivedUsers, columns: userColumns, onUnarchive: unarchiveUser, searchable: ['name', 'username', 'role'] },
    ];

    const currentTab = tabs.find(t => t.key === activeTab);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">الأرشيف</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                استعراض واستعادة السجلات المؤرشفة من النظام.
            </p>
            
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6 space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`${
                                activeTab === tab.key
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label} ({tab.data.length})
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-8">
                {currentTab && (
                    <DataTable 
                        columns={currentTab.columns} 
                        data={currentTab.data}
                        actions={['unarchive']}
                        onUnarchive={(row) => currentTab.onUnarchive(row.id)}
                        searchableColumns={currentTab.searchable}
                    />
                )}
            </div>
        </div>
    );
};

export default Archive;
