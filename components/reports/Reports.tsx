import React, { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataContext } from '../../context/DataContext';
import AccessDenied from '../shared/AccessDenied';
import SalesReport from './SalesReport';
import PurchasesReport from './PurchasesReport';
import ProfitAndLoss from './ProfitAndLoss';
import BalanceSheet from './BalanceSheet';
import CustomerSummaryReport from './CustomerSummaryReport';
import InventoryReport from './InventoryReport';
import SalesProfitabilityReport from './SalesProfitabilityReport';
import ExpenseReport from './ExpenseReport';
import SaleReturnsReport from './SaleReturnsReport';
import PurchaseReturnsReport from './PurchaseReturnsReport';
import { AccountNode, InventoryItem } from '../../types';
import TreasuryReport from './TreasuryReport';
import ItemMovementReport from './ItemMovementReport';
import { EyeIcon, PrinterIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, XIcon, MagnifyingGlassIcon, BoxIcon, TrashIcon, BanknotesIcon, ShoppingCartIcon, ClipboardDocumentListIcon, PhotoIcon } from '../icons';
import CustomerBalancesReport from './CustomerBalancesReport';
import SupplierBalancesReport from './SupplierBalancesReport';
import CustomerProfitabilityReport from './CustomerProfitabilityReport';
import GeneralJournalReport from './GeneralJournalReport';
import NetProfitabilityReport from './NetProfitabilityReport';
import NetProfitabilityByCustomerReport from './NetProfitabilityByCustomerReport';

declare var jspdf: any;
declare var html2canvas: any;

type ReportTabKey = 'profitAndLoss' | 'balanceSheet' | 'treasury' | 'sales' | 'saleReturns' | 'purchases' | 'purchaseReturns' | 'salesProfitability' | 'netProfitability' | 'netProfitabilityByCustomer' | 'expense' | 'customerSummary' | 'inventory' | 'itemMovement' | 'customerBalances' | 'supplierBalances' | 'customerProfitability' | 'generalJournalReport';

const reportTabs: { key: ReportTabKey; label: string; isTable: boolean, category: string }[] = [
    { key: 'profitAndLoss', label: 'قائمة الدخل', isTable: false, category: 'تقارير مالية' },
    { key: 'balanceSheet', label: 'الميزانية العمومية', isTable: false, category: 'تقارير مالية' },
    { key: 'generalJournalReport', label: 'دفتر اليومية العام', isTable: true, category: 'تقارير مالية' },
    { key: 'treasury', label: 'حركة الخزينة', isTable: true, category: 'تقارير مالية' },
    { key: 'expense', label: 'المصروفات', isTable: true, category: 'تقارير مالية' },
    { key: 'sales', label: 'المبيعات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'saleReturns', label: 'مردودات المبيعات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'purchases', label: 'المشتريات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'purchaseReturns', label: 'مردودات المشتريات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'customerBalances', label: 'أرصدة العملاء (المدينون)', isTable: true, category: 'تقارير تحليلية' },
    { key: 'supplierBalances', label: 'أرصدة الموردين (الدائنون)', isTable: true, category: 'تقارير تحليلية' },
    { key: 'salesProfitability', label: 'ربحية المبيعات (ملخص)', isTable: true, category: 'تقارير تحليلية' },
    { key: 'netProfitability', label: 'صافي الربحية (تفصيلي)', isTable: true, category: 'تقارير تحليلية' },
    { key: 'netProfitabilityByCustomer', label: 'ربحية الأصناف حسب العميل', isTable: true, category: 'تقارير تحليلية' },
    { key: 'customerProfitability', label: 'ربحية العملاء', isTable: true, category: 'تقارير تحليلية' },
    { key: 'customerSummary', label: 'ملخص العملاء', isTable: true, category: 'تقارير تحليلية' },
    { key: 'inventory', label: 'أرصدة المخزون', isTable: true, category: 'تقارير المخزون' },
    { key: 'itemMovement', label: 'حركة صنف', isTable: true, category: 'تقارير المخزون' },
];

const Reports: React.FC = () => {
    const { currentUser, financialYear, customers, suppliers, inventory, chartOfAccounts, treasuriesList } = useContext(DataContext);
    const [isReportVisible, setIsReportVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<ReportTabKey>('profitAndLoss');
    const [startDate, setStartDate] = useState(financialYear.startDate);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
    const [excludedItemIds, setExcludedItemIds] = useState<string[]>([]);
    const [selectedItemCategory, setSelectedItemCategory] = useState<string>('');
    const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [inventoryReportType, setInventoryReportType] = useState<'all_purchase' | 'stock_purchase' | 'stock_sale'>('stock_purchase');
    
    const [reportExportProps, setReportExportProps] = useState<{ data: any[], columns: any[], name: string }>({ data: [], columns: [], name: '' });

    const groupedTabs = useMemo(() => {
        const categories = ['تقارير مالية', 'تقارير المبيعات والمشتريات', 'تقارير المخزون', 'تقارير تحليلية'];
        const groups: { [key: string]: typeof reportTabs } = {};
        categories.forEach(cat => {
            groups[cat] = reportTabs.filter(tab => tab.category === cat);
        });
        return groups;
    }, []);

    useEffect(() => {
        setSelectedCustomerId('');
        setSelectedSupplierId('');
        setSelectedInventoryId('');
        setExcludedItemIds([]);
        setSelectedItemCategory('');
        setSelectedExpenseAccountId('');
        setSelectedTreasuryId('');
        setItemSearchTerm('');
    }, [activeTab]);

    const itemSearchResults = useMemo(() => {
        if (itemSearchTerm.length < 1) return [];
        const term = itemSearchTerm.toLowerCase();
        return inventory.filter((i: InventoryItem) => 
            !i.isArchived && 
            (i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term) || i.barcode?.includes(term)) &&
            !excludedItemIds.includes(i.id)
        ).slice(0, 10);
    }, [inventory, itemSearchTerm, excludedItemIds]);

    const selectedItemName = useMemo(() => {
        if (!selectedInventoryId) return '';
        return inventory.find(i => i.id === selectedInventoryId)?.name || '';
    }, [selectedInventoryId, inventory]);

    const handleDataReady = useCallback((props: { data: any[], columns: any[], name: string }) => {
        setReportExportProps(props);
    }, []);

    const onExportPDF = () => {
        const input = document.getElementById('printable-report');
        if (input) {
            // ضمان عرض كافة العناصر قبل الالتقاط
            input.style.height = 'auto';
            input.style.overflow = 'visible';

            html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                windowWidth: input.scrollWidth,
                windowHeight: input.scrollHeight
            })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new jspdf.jsPDF('p', 'pt', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = pdfWidth / imgWidth;
                const imgHeightInPt = imgHeight * ratio;
                
                let heightLeft = imgHeightInPt;
                let position = 0;

                // الصفحة الأولى
                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
                heightLeft -= pdfHeight;

                // الصفحات التالية بتقسيم دقيق
                while (heightLeft > 0) {
                    position = heightLeft - imgHeightInPt;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(`${reportExportProps.name || 'report'}.pdf`);
            });
        }
    };

    const onExportImage = () => {
        const input = document.getElementById('printable-report');
        if (input) {
          html2canvas(input, { 
            scale: 1.5, 
            useCORS: true, 
            backgroundColor: '#ffffff' 
          })
          .then(canvas => {
              const link = document.createElement('a');
              link.download = `${reportExportProps.name}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
          });
        }
    };

    const handleToggleExcludedItem = (id: string) => {
        setExcludedItemIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
        setItemSearchTerm('');
    };

    const renderReport = () => {
        // نمرر noPagination=true لضمان عرض كل الصفوف في المعاينة والطباعة
        const commonProps = { onDataReady: handleDataReady, noPagination: true };
        switch (activeTab) {
            case 'profitAndLoss':
                return <ProfitAndLoss startDate={startDate} endDate={endDate} {...commonProps} />;
            case 'balanceSheet':
                return <BalanceSheet asOfDate={endDate} {...commonProps} />;
            case 'generalJournalReport':
                return <GeneralJournalReport date={endDate} {...commonProps} />;
            case 'treasury':
                return <TreasuryReport startDate={startDate} endDate={endDate} treasuryAccountId={selectedTreasuryId} {...commonProps} />;
            case 'expense':
                return <ExpenseReport startDate={startDate} endDate={endDate} expenseAccountId={selectedExpenseAccountId} {...commonProps} />;
            case 'sales':
                return <SalesReport startDate={startDate} endDate={endDate} customerId={selectedCustomerId} {...commonProps} />;
            case 'saleReturns':
                return <SaleReturnsReport startDate={startDate} endDate={endDate} customerId={selectedCustomerId} {...commonProps} />;
            case 'purchases':
                return <PurchasesReport startDate={startDate} endDate={endDate} supplierId={selectedSupplierId} {...commonProps} />;
            case 'purchaseReturns':
                return <PurchaseReturnsReport startDate={startDate} endDate={endDate} supplierId={selectedSupplierId} {...commonProps} />;
            case 'customerBalances':
                return <CustomerBalancesReport asOfDate={endDate} {...commonProps} />;
            case 'supplierBalances':
                return <SupplierBalancesReport asOfDate={endDate} {...commonProps} />;
            case 'salesProfitability':
                return <SalesProfitabilityReport startDate={startDate} endDate={endDate} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} {...commonProps} />;
            case 'netProfitability':
                return <NetProfitabilityReport startDate={startDate} endDate={endDate} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} excludedItemIds={excludedItemIds} {...commonProps} />;
            case 'netProfitabilityByCustomer':
                return <NetProfitabilityByCustomerReport startDate={startDate} endDate={endDate} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} excludedItemIds={excludedItemIds} {...commonProps} />;
            case 'customerProfitability':
                return <CustomerProfitabilityReport startDate={startDate} endDate={endDate} {...commonProps} />;
            case 'customerSummary':
                return <CustomerSummaryReport startDate={startDate} endDate={endDate} {...commonProps} />;
            case 'inventory':
                return <InventoryReport asOfDate={endDate} itemId={selectedInventoryId} reportType={inventoryReportType} {...commonProps} />;
            case 'itemMovement':
                return <ItemMovementReport startDate={startDate} endDate={endDate} itemId={selectedInventoryId} {...commonProps} />;
            default:
                return null;
        }
    };

    if (!currentUser || (currentUser.role !== 'مدير النظام' && currentUser.role !== 'محاسب')) {
        return <AccessDenied />;
    }

    const isViewButtonDisabled = activeTab === 'itemMovement' && !selectedInventoryId;

    return (
        <div className="space-y-6">
            {isReportVisible ? (
                <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[60] flex flex-col">
                    <header className="no-print bg-white dark:bg-gray-800 p-3 shadow-md flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsReportVisible(false)} className="p-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                               <ArrowUturnLeftIcon className="w-5 h-5 transform rotate-180"/>
                            </button>
                            <h2 className="text-lg font-bold">{reportTabs.find(t => t.key === activeTab)?.label}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onExportImage} className="btn-secondary-small bg-green-600 text-white hover:bg-green-700 border-none flex items-center gap-2">
                                <PhotoIcon className="w-4 h-4" /> صورة
                            </button>
                            <button onClick={onExportPDF} className="btn-secondary-small bg-red-500 text-white hover:bg-red-600 border-none flex items-center gap-2">
                                <ArrowDownTrayIcon className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={() => window.print()} className="btn-primary-small flex items-center gap-2">
                                <PrinterIcon className="w-4 h-4" /> طباعة
                            </button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-8">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mx-auto max-w-[210mm]">
                            {renderReport()}
                        </div>
                    </main>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">مركز التقارير المحاسبية</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                            {['balanceSheet', 'inventory', 'customerBalances', 'supplierBalances', 'generalJournalReport'].includes(activeTab) ? (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">حتى تاريخ</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">من تاريخ</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">إلى تاريخ</label>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                                    </div>
                                </>
                            )}
                            
                            {activeTab === 'inventory' && (
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">خيارات الجرد وزاوية العرض</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl border dark:border-gray-600 gap-1">
                                        <button 
                                            onClick={() => setInventoryReportType('stock_purchase')}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${inventoryReportType === 'stock_purchase' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white dark:hover:bg-gray-700'}`}
                                        >
                                            <BanknotesIcon className="w-5 h-5 mb-1" />
                                            <span className="text-[10px] font-bold">الرصيد المتوفر (تكلفة)</span>
                                        </button>
                                        <button 
                                            onClick={() => setInventoryReportType('stock_sale')}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${inventoryReportType === 'stock_sale' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white dark:hover:bg-gray-700'}`}
                                        >
                                            <ShoppingCartIcon className="w-5 h-5 mb-1" />
                                            <span className="text-[10px] font-bold">الرصيد المتوفر (بيع)</span>
                                        </button>
                                        <button 
                                            onClick={() => setInventoryReportType('all_purchase')}
                                            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${inventoryReportType === 'all_purchase' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:bg-white dark:hover:bg-gray-700'}`}
                                        >
                                            <BoxIcon className="w-5 h-5 mb-1" />
                                            <span className="text-[10px] font-bold">كل الأصناف (تكلفة)</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(activeTab === 'sales' || activeTab === 'saleReturns' || activeTab === 'salesProfitability' || activeTab === 'netProfitability' || activeTab === 'netProfitabilityByCustomer') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">العميل</label>
                                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-style w-full">
                                        <option value="">كل العملاء</option>
                                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {(activeTab === 'itemMovement' || activeTab === 'salesProfitability' || activeTab === 'netProfitability' || activeTab === 'netProfitabilityByCustomer') && (
                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                                        {['netProfitability', 'netProfitabilityByCustomer'].includes(activeTab) ? 'استثناء أصناف محددة' : 'البحث عن صنف'}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder={['netProfitability', 'netProfitabilityByCustomer'].includes(activeTab) ? "ابحث لإضافة صنف للاستثناء..." : "ادخل اسم الصنف..."} 
                                            value={['netProfitability', 'netProfitabilityByCustomer'].includes(activeTab) ? itemSearchTerm : (selectedInventoryId ? selectedItemName : itemSearchTerm)}
                                            onChange={(e) => { 
                                                setItemSearchTerm(e.target.value); 
                                                if (!['netProfitability', 'netProfitabilityByCustomer'].includes(activeTab)) setSelectedInventoryId(''); 
                                            }}
                                            className="input-style w-full pr-10"
                                        />
                                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                    
                                    {itemSearchTerm && itemSearchResults.length > 0 && (
                                        <div className="absolute top-full right-0 left-0 bg-white dark:bg-gray-800 shadow-xl rounded-b-xl border dark:border-gray-700 z-50 mt-1 max-h-60 overflow-y-auto">
                                            {itemSearchResults.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => ['netProfitability', 'netProfitabilityByCustomer'].includes(activeTab) ? handleToggleExcludedItem(item.id) : setSelectedInventoryId(item.id)}
                                                    className="w-full text-right p-3 hover:bg-blue-50 dark:hover:bg-gray-700 border-b last:border-b-0 dark:border-gray-700 flex items-center gap-3"
                                                >
                                                    <BoxIcon className="w-4 h-4 text-gray-400" />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm truncate">{item.name}</p>
                                                        <p className="text-xs text-gray-500">{item.id}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(groupedTabs).map(([category, tabs]) => (
                            <div key={category} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
                                <h3 className="text-xs font-extrabold text-blue-500 uppercase tracking-widest mb-3">{category}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(tabs as typeof reportTabs).map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                                                activeTab === tab.key
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl flex justify-center sticky bottom-14 z-10 sm:relative sm:bottom-0">
                         <button
                            onClick={() => setIsReportVisible(true)}
                            disabled={isViewButtonDisabled}
                            className="w-full sm:w-auto px-10 py-3 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl disabled:bg-gray-400"
                        >
                            <EyeIcon className="w-6 h-6" />
                            عرض التقرير النهائي
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;