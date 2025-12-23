
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
import { EyeIcon, PrinterIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, XIcon, MagnifyingGlassIcon, BoxIcon, TrashIcon } from '../icons';
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

const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
    return nodes.reduce<AccountNode[]>((acc, node) => {
        acc.push(node);
        if (node.children && node.children.length > 0) {
            acc.push(...flattenAccounts(node.children));
        }
        return acc;
    }, []);
};

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
    const [inventoryReportType, setInventoryReportType] = useState<'all_purchase' | 'stock_purchase' | 'stock_sale'>('all_purchase');
    
    const [isExpenseDropdownOpen, setIsExpenseDropdownOpen] = useState(false);
    const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
    const expenseDropdownRef = useRef<HTMLDivElement>(null);
    
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
        setExpenseSearchTerm('');
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

    const excludedItemsList = useMemo(() => {
        return inventory.filter(i => excludedItemIds.includes(i.id));
    }, [excludedItemIds, inventory]);

    const handleToggleExcludedItem = (id: string) => {
        setExcludedItemIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
        setItemSearchTerm('');
    };

    const renderReport = () => {
        const props = { startDate, endDate, onDataReady: handleDataReady };
        switch (activeTab) {
            case 'sales': return <SalesReport {...props} customerId={selectedCustomerId} />;
            case 'saleReturns': return <SaleReturnsReport {...props} customerId={selectedCustomerId} />;
            case 'purchases': return <PurchasesReport {...props} supplierId={selectedSupplierId} />;
            case 'purchaseReturns': return <PurchaseReturnsReport {...props} supplierId={selectedSupplierId} />;
            case 'profitAndLoss': return <ProfitAndLoss {...props} />;
            case 'balanceSheet': return <BalanceSheet asOfDate={endDate} onDataReady={handleDataReady} />;
            case 'generalJournalReport': return <GeneralJournalReport date={endDate} onDataReady={handleDataReady} />;
            case 'customerSummary': return <CustomerSummaryReport {...props} />;
            case 'inventory': return <InventoryReport asOfDate={endDate} onDataReady={handleDataReady} itemId={selectedInventoryId} reportType={inventoryReportType} />;
            case 'salesProfitability': return <SalesProfitabilityReport {...props} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} />;
            case 'netProfitability': return <NetProfitabilityReport {...props} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} excludedItemIds={excludedItemIds} />;
            case 'netProfitabilityByCustomer': return <NetProfitabilityByCustomerReport {...props} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} excludedItemIds={excludedItemIds} />;
            case 'customerProfitability': return <CustomerProfitabilityReport {...props} />;
            case 'expense': return <ExpenseReport {...props} expenseAccountId={selectedExpenseAccountId} />;
            case 'treasury': return <TreasuryReport {...props} treasuryAccountId={selectedTreasuryId} />;
            case 'itemMovement': return <ItemMovementReport {...props} itemId={selectedInventoryId} />;
            case 'customerBalances': return <CustomerBalancesReport asOfDate={endDate} onDataReady={handleDataReady} />;
            case 'supplierBalances': return <SupplierBalancesReport asOfDate={endDate} onDataReady={handleDataReady} />;
            default: return <p>الرجاء اختيار تقرير لعرضه.</p>;
        }
    };

    const handleDataReady = useCallback((props: { data: any[], columns: any[], name: string }) => {
        setReportExportProps(props);
    }, []);

    const onExportPDF = () => {
        const input = document.getElementById('printable-report');
        if (input) {
            const isDarkMode = document.documentElement.classList.contains('dark');
            html2canvas(input, { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#111827' : '#ffffff' })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 0.7);
                const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgProps = pdf.getImageProperties(imgData);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${reportExportProps.name}.pdf`);
            });
        }
    };

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
                            <button onClick={onExportPDF} className="btn-secondary-small bg-red-500 text-white hover:bg-red-600 border-none flex items-center gap-2">
                                <ArrowDownTrayIcon className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={() => window.print()} className="btn-primary-small flex items-center gap-2">
                                <PrinterIcon className="w-4 h-4" /> طباعة
                            </button>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-8">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
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
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">التاريخ</label>
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
                            
                            {(activeTab === 'sales' || activeTab === 'saleReturns' || activeTab === 'salesProfitability' || activeTab === 'netProfitability' || activeTab === 'netProfitabilityByCustomer') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">العميل</label>
                                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-style w-full">
                                        <option value="">كل العملاء</option>
                                        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {(activeTab === 'itemMovement' || activeTab === 'inventory' || activeTab === 'salesProfitability' || activeTab === 'netProfitability' || activeTab === 'netProfitabilityByCustomer') && (
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

                        {activeTab === 'netProfitabilityByCustomer' && excludedItemsList.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 animate-fade-in">
                                <span className="text-xs font-bold text-gray-400 self-center ml-2">أصناف مستثناة:</span>
                                {excludedItemsList.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-800">
                                        <span>{item.name}</span>
                                        <button onClick={() => handleToggleExcludedItem(item.id)} className="hover:text-red-900">
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={() => setExcludedItemIds([])} className="text-xs text-gray-500 hover:underline">مسح الكل</button>
                            </div>
                        )}
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
