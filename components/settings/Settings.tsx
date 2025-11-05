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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">الإعدادات</h1>
            
            <form onSubmit={handleSaveAllSettings} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-8">
                {/* Section: Company Info */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h2 className="text-lg font-semibold mb-4">معلومات الشركة</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium">اسم الشركة</label>
                            <input type="text" id="companyName" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className="input-style w-full mt-1" />
                        </div>
                         <div>
                            <label htmlFor="companyPhone" className="block text-sm font-medium">الهاتف</label>
                            <input type="text" id="companyPhone" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} className="input-style w-full mt-1" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="companyAddress" className="block text-sm font-medium">العنوان</label>
                            <input type="text" id="companyAddress" value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} className="input-style w-full mt-1" />
                        </div>
                    </div>
                </div>

                {/* Section: Financial Year */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h2 className="text-lg font-semibold mb-4">السنة المالية</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium">تاريخ البدء</label>
                            <input type="date" id="startDate" value={yearData.startDate} onChange={e => setYearData({...yearData, startDate: e.target.value})} className="input-style w-full mt-1" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium">تاريخ الانتهاء</label>
                            <input type="date" id="endDate" value={yearData.endDate} onChange={e => setYearData({...yearData, endDate: e.target.value})} className="input-style w-full mt-1" />
                        </div>
                    </div>
                </div>

                 {/* Section: General Settings */}
                 <div className="border-b dark:border-gray-700 pb-6">
                    <h2 className="text-lg font-semibold mb-4">إعدادات عامة</h2>
                     <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="allowNegativeStock"
                            checked={genSettings.allowNegativeStock}
                            onChange={(e) => setGenSettings(p => ({...p, allowNegativeStock: e.target.checked}))}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="allowNegativeStock" className="mr-2 block text-sm text-gray-900 dark:text-gray-200">
                            السماح بالبيع من رصيد سالب
                        </label>
                    </div>
                </div>

                {/* Section: Invoice Settings */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">إعدادات الفاتورة</h2>
                        <div className="flex gap-2">
                             <button type="button" onClick={() => setIsCustomizerOpen(true)} className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900">
                                <PencilSquareIcon className="w-4 h-4" />
                                تخصيص تصميم الفاتورة
                            </button>
                             <button type="button" onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                                <EyeIcon className="w-4 h-4" />
                                معاينة
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium">شعار الشركة</label>
                           <div className="mt-1 flex items-center gap-4">
                               <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                   {printSettingsData.logo ? <img src={printSettingsData.logo} alt="logo" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-gray-500">لا يوجد شعار</span>}
                               </div>
                               <div className="space-y-2">
                                    <label htmlFor="logoUpload" className="cursor-pointer flex items-center gap-2 px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                                       <UploadIcon className="w-4 h-4" />
                                       رفع شعار
                                   </label>
                                   <input type="file" id="logoUpload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                   {printSettingsData.logo && (
                                       <button type="button" onClick={handleRemoveLogo} className="flex items-center gap-2 px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-200 dark:hover:bg-red-900">
                                            <TrashIcon className="w-4 h-4" />
                                            إزالة
                                       </button>
                                   )}
                               </div>
                           </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                        حفظ الإعدادات العامة
                    </button>
                </div>
            </form>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">إدارة المستخدمين</h2>
                    <button onClick={() => setAddUserModalOpen(true)} className="btn-primary-small">إضافة مستخدم</button>
                </div>
                <DataTable 
                    columns={userColumns}
                    data={users}
                    actions={['edit', 'archive']}
                    onEdit={handleEditUser}
                    onArchive={handleArchiveUser}
                />
            </div>

            <BackupAndRestore />
            <PrintSettingsPage />

            <Modal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="إضافة مستخدم جديد">
                <AddUserForm onClose={() => setAddUserModalOpen(false)} />
            </Modal>

            {selectedUser && (
                <Modal isOpen={isEditUserModalOpen} onClose={() => setEditUserModalOpen(false)} title={`تعديل المستخدم: ${selectedUser.name}`}>
                    <EditUserForm user={selectedUser} onClose={() => setEditUserModalOpen(false)} />
                </Modal>
            )}

            {selectedUser && (
                <ConfirmationModal
                  isOpen={isArchiveUserModalOpen}
                  onClose={() => setArchiveUserModalOpen(false)}
                  onConfirm={confirmArchiveUser}
                  title="تأكيد الأرشفة"
                  message={`هل أنت متأكد من رغبتك في أرشفة المستخدم "${selectedUser.name}"؟`}
                />
            )}
            
            <Modal isOpen={isCustomizerOpen} onClose={() => setIsCustomizerOpen(false)} title="تخصيص تصميم الفاتورة" size="4xl">
                <InvoiceCustomizer onClose={() => setIsCustomizerOpen(false)} />
            </Modal>
            
            {isPreviewOpen && (
                 <InvoiceView isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} sale={sampleSaleForPreview} />
            )}
        </div>
    );
};

export default Settings;
