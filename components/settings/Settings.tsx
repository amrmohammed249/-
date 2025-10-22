

import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import Modal from '../shared/Modal';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import ConfirmationModal from '../shared/ConfirmationModal';
import AccessDenied from '../shared/AccessDenied';
import { PencilSquareIcon, EyeIcon, UploadIcon, TrashIcon } from '../icons';
import InvoiceCustomizer from './InvoiceCustomizer';
import InvoiceView from '../sales/InvoiceView';
import { Sale, PrintSettings, GeneralSettings } from '../../types';
import BackupAndRestore from './BackupAndRestore';
import PrintSettingsPage from './PrintSettingsPage';


const Settings: React.FC = () => {
    const { 
        users, 
        currentUser,
        showToast,
        companyInfo, updateCompanyInfo,
        financialYear, updateFinancialYear,
        printSettings, updatePrintSettings,
        generalSettings, updateGeneralSettings,
        archiveUser
    } = useContext(DataContext);

    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
    const [isEditUserModalOpen, setEditUserModalOpen] = useState(false);
    const [isArchiveUserModalOpen, setArchiveUserModalOpen] = useState(false);
    const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    const [companyData, setCompanyData] = useState(companyInfo);
    const [yearData, setYearData] = useState(financialYear);
    const [printSettingsData, setPrintSettingsData] = useState<PrintSettings>(printSettings);
    const [genSettings, setGenSettings] = useState<GeneralSettings>(generalSettings);
    
    if (currentUser.role !== 'مدير النظام') {
        return <AccessDenied />;
    }
    
    const sampleSaleForPreview: Sale = { 
        id: 'PREVIEW-001', 
        customer: 'عميل افتراضي', 
        date: new Date().toISOString().slice(0, 10),
        items: [
            { itemId: 'ITM001', itemName: 'منتج افتراضي 1', unitId: 'base', unitName: 'قطعة', quantity: 2, price: 150.00, discount: 0, total: 300.00 },
            { itemId: 'ITM002', itemName: 'منتج افتراضي 2', unitId: 'base', unitName: 'وحدة', quantity: 1, price: 450.50, discount: 0, total: 450.50 },
        ],
        subtotal: 750.50,
        totalDiscount: 0,
        total: 750.50,
        status: 'مدفوعة'
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setEditUserModalOpen(true);
    };

    const handleArchiveUser = (user: any) => {
        setSelectedUser(user);
        setArchiveUserModalOpen(true);
    };
    
    const confirmArchiveUser = () => {
        if (selectedUser) {
            const result = archiveUser(selectedUser.id);
             if (!result.success) {
                showToast(result.message, 'error');
            } else {
                showToast('تمت أرشفة المستخدم بنجاح.');
            }
        }
        setArchiveUserModalOpen(false);
        setSelectedUser(null);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPrintSettingsData(prev => ({ 
                ...prev, 
                logo: reader.result as string,
                logoAlignment: 'center', // Set alignment to center as requested
                // Ensure logo is at the top of the layout
                layout: ['logo', ...prev.layout.filter(id => id !== 'logo')] 
            }));
            showToast('تم رفع الشعار بنجاح. اضغط على حفظ الإعدادات العامة لتطبيقه.');
          };
          reader.readAsDataURL(file);
        }
    };
    
    const handleRemoveLogo = () => {
        setPrintSettingsData(prev => ({ ...prev, logo: null }));
    };

    const handleSaveAllSettings = (e: React.FormEvent) => {
        e.preventDefault();
        updateCompanyInfo(companyData);
        updateFinancialYear(yearData);
        updatePrintSettings(printSettingsData);
        updateGeneralSettings(genSettings);
        showToast('تم حفظ الإعدادات العامة بنجاح.');
    };

    const userColumns = useMemo(() => [
        { header: 'الاسم الكامل', accessor: 'name' },
        { header: 'معرف المستخدم', accessor: 'username' },
        { header: 'الدور', accessor: 'role' },
    ], []);

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">إدارة المستخدمين</h2>
                    <button type="button" onClick={() => setAddUserModalOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">إضافة مستخدم</button>
                </div>
                <DataTable columns={userColumns} data={users} actions={['edit', 'archive']} onEdit={handleEditUser} onArchive={handleArchiveUser} searchableColumns={['name', 'username', 'role']} />
            </div>

            <BackupAndRestore />
            
            <form onSubmit={handleSaveAllSettings}>
                <div className="space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">إعدادات المخزون</h2>
                        <div className="pt-4">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="allowNegativeStock"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={genSettings.allowNegativeStock}
                                    onChange={(e) => setGenSettings(p => ({ ...p, allowNegativeStock: e.target.checked }))}
                                />
                                <label htmlFor="allowNegativeStock" className="mr-3 block text-sm font-medium text-gray-900 dark:text-gray-100">
                                    السماح بالبيع من رصيد سالب
                                </label>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                تحذير: تفعيل هذا الخيار قد يؤدي إلى عدم دقة في تقارير المخزون والتكلفة، لكنه قد يكون مفيداً في حال بيع البضاعة قبل تسجيل فواتير شرائها.
                            </p>
                        </div>
                    </div>

                    <PrintSettingsPage />

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">إعدادات تصميم الفواتير</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    قم بتصميم شكل الفاتورة ليعكس هوية علامتك التجارية.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
                                    >
                                    <EyeIcon className="w-5 h-5" />
                                    <span>معاينة الفاتورة</span>
                                </button>
                                <button
                                type="button"
                                onClick={() => setIsCustomizerOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold"
                                >
                                <PencilSquareIcon className="w-5 h-5" />
                                <span>تخصيص قالب الفاتورة</span>
                                </button>
                            </div>
                        </div>
                        <div className="border-t dark:border-gray-700 mt-4 pt-4">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">شعار الشركة</h3>
                            <div className="flex items-start gap-4 mt-2">
                                <div className="w-full">
                                    <input type="file" id="logoUpload" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                    <label htmlFor="logoUpload" className="cursor-pointer flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        {printSettingsData.logo ? (
                                            <div className="flex items-center justify-center gap-4 h-full w-full p-2">
                                                <div className="flex-shrink-0 h-full flex items-center justify-center">
                                                    <img 
                                                        src={printSettingsData.logo} 
                                                        alt="شعار الشركة" 
                                                        style={{ height: `${printSettingsData.logoSize}px`, width: 'auto', maxHeight: '100%' }}
                                                        className="object-contain" 
                                                    />
                                                </div>
                                                <span className="text-gray-500 hidden sm:block flex-grow text-center">لتغيير الشعار، انقر هنا أو اسحب صورة جديدة</span>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <UploadIcon className="w-8 h-8 text-gray-400 mx-auto" />
                                                <span className="mt-2 text-sm text-gray-500">انقر لرفع شعار الشركة</span>
                                                <p className="text-xs text-gray-400">PNG, JPG, SVG</p>
                                            </div>
                                        )}
                                    </label>
                                    {printSettingsData.logo && (
                                        <div className="mt-4">
                                            <label htmlFor="logoSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                حجم الشعار: <span className="font-mono">{printSettingsData.logoSize}px</span>
                                            </label>
                                            <input 
                                                id="logoSize"
                                                type="range" 
                                                min="30" 
                                                max="200" 
                                                value={printSettingsData.logoSize} 
                                                onChange={e => setPrintSettingsData(p => ({...p, logoSize: Number(e.target.value)}))} 
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" 
                                            />
                                        </div>
                                    )}
                                </div>
                                {printSettingsData.logo && (
                                    <button type="button" onClick={handleRemoveLogo} className="flex flex-col items-center text-red-500 hover:text-red-700 pt-1">
                                        <TrashIcon className="w-6 h-6" />
                                        <span className="text-xs">إزالة</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">معلومات الشركة</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الشركة</label>
                                <input type="text" id="companyName" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className="mt-1 block w-full input-style" />
                            </div>
                            <div>
                                <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                                <input type="text" id="companyPhone" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className="mt-1 block w-full input-style" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
                                <input type="text" id="companyAddress" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="mt-1 block w-full input-style" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">السنة المالية</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ البدء</label>
                                <input type="date" id="startDate" value={yearData.startDate} onChange={e => setYearData({...yearData, startDate: e.target.value})} className="mt-1 block w-full input-style" />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الانتهاء</label>
                                <input type="date" id="endDate" value={yearData.endDate} onChange={e => setYearData({...yearData, endDate: e.target.value})} className="mt-1 block w-full input-style" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 rounded-t-lg shadow-top">
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">حفظ الإعدادات العامة</button>
                    </div>
                </div>
            </form>

            <Modal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="إضافة مستخدم جديد">
                <AddUserForm onClose={() => setAddUserModalOpen(false)} />
            </Modal>
            {selectedUser && (
                <Modal isOpen={isEditUserModalOpen} onClose={() => setEditUserModalOpen(false)} title={`تعديل المستخدم: ${selectedUser.name}`}>
                    <EditUserForm user={selectedUser} onClose={() => setEditUserModalOpen(false)} />
                </Modal>
            )}
            {selectedUser && (
                <ConfirmationModal isOpen={isArchiveUserModalOpen} onClose={() => setArchiveUserModalOpen(false)} onConfirm={confirmArchiveUser} title="تأكيد الأرشفة" message={`هل أنت متأكد من رغبتك في أرشفة المستخدم "${selectedUser.name}"؟ لا يمكنك أرشفة المستخدم الحالي.`}/>
            )}
            
            <Modal isOpen={isCustomizerOpen} onClose={() => setIsCustomizerOpen(false)} title="تخصيص قالب الفاتورة" size="4xl">
              <InvoiceCustomizer onClose={() => setIsCustomizerOpen(false)} />
            </Modal>
            
            {isPreviewOpen && (
              <InvoiceView 
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                sale={sampleSaleForPreview}
              />
            )}
        </div>
    );
};

export default Settings;