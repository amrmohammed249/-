
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
import { EyeIcon, PrinterIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, XIcon, MagnifyingGlassIcon } from '../icons';
import CustomerBalancesReport from './CustomerBalancesReport';
import SupplierBalancesReport from './SupplierBalancesReport';
import CustomerProfitabilityReport from './CustomerProfitabilityReport';
import GeneralJournalReport from './GeneralJournalReport';
import NetProfitabilityReport from './NetProfitabilityReport';

declare var jspdf: any;
declare var html2canvas: any;

type ReportTabKey = 'profitAndLoss' | 'balanceSheet' | 'treasury' | 'sales' | 'saleReturns' | 'purchases' | 'purchaseReturns' | 'salesProfitability' | 'netProfitability' | 'expense' | 'customerSummary' | 'inventory' | 'itemMovement' | 'customerBalances' | 'supplierBalances' | 'customerProfitability' | 'generalJournalReport';

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
        setSelectedItemCategory('');
        setSelectedExpenseAccountId('');
        setSelectedTreasuryId('');
        setItemSearchTerm('');
        setExpenseSearchTerm('');
    }, [activeTab]);

    const itemCategories = useMemo(() => {
        const categories = new Set<string>();
        inventory.forEach((item: InventoryItem) => {
            if (item.category) categories.add(item.category);
        });
        return Array.from(categories).sort();
    }, [inventory]);

    const expenseAccounts = useMemo(() => {
        const expenseRoot = chartOfAccounts.find((n: AccountNode) => n.id === '4-2');
        if (!expenseRoot || !expenseRoot.children) return [];
        return flattenAccounts(expenseRoot.children).sort((a,b) => a.code.localeCompare(b.code));
    }, [chartOfAccounts]);
    
    const filteredExpenseAccounts = useMemo(() => {
        if (!expenseSearchTerm) return expenseAccounts;
        const term = expenseSearchTerm.toLowerCase();
        return expenseAccounts.filter(acc => acc.name.toLowerCase().includes(term) || acc.code.includes(term));
    }, [expenseAccounts, expenseSearchTerm]);

    const selectedExpenseAccountName = useMemo(() => {
        if (!selectedExpenseAccountId) return '';
        return expenseAccounts.find(acc => acc.id === selectedExpenseAccountId)?.name || '';
    }, [selectedExpenseAccountId, expenseAccounts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (expenseDropdownRef.current && !expenseDropdownRef.current.contains(event.target as Node)) {
                setIsExpenseDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const itemSearchResults = useMemo(() => {
        if (itemSearchTerm.length < 1) return [];
        const term = itemSearchTerm.toLowerCase();
        return inventory.filter((i: InventoryItem) => 
            !i.isArchived && (i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term))
        ).slice(0, 10);
    }, [inventory, itemSearchTerm]);

    if (currentUser.role !== 'مدير النظام' && currentUser.role !== 'محاسب') {
        return <AccessDenied />;
    }

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

    const isSingleDateReport = ['balanceSheet', 'inventory', 'customerBalances', 'supplierBalances', 'generalJournalReport'].includes(activeTab);
    const isViewButtonDisabled = activeTab === 'itemMovement' && !selectedInventoryId;

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
            case 'netProfitability': return <NetProfitabilityReport {...props} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} />;
            case 'customerProfitability': return <CustomerProfitabilityReport {...props} />;
            case 'expense': return <ExpenseReport {...props} expenseAccountId={selectedExpenseAccountId} />;
            case 'treasury': return <TreasuryReport {...props} treasuryAccountId={selectedTreasuryId} />;
            case 'itemMovement': return <ItemMovementReport {...props} itemId={selectedInventoryId} />;
            case 'customerBalances': return <CustomerBalancesReport asOfDate={endDate} onDataReady={handleDataReady} />;
            case 'supplierBalances': return <SupplierBalancesReport asOfDate={endDate} onDataReady={handleDataReady} />;
            default: return <p>الرجاء اختيار تقرير لعرضه.</p>;
        }
    };

    const activeReportTab = reportTabs.find(t => t.key === activeTab);

    if (isReportVisible) {
        return (
            <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[60] flex flex-col">
                <header className="no-print bg-white dark:bg-gray-800 p-3 shadow-md flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsReportVisible(false)} className="p-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                           <ArrowUturnLeftIcon className="w-5 h-5 transform rotate-180"/>
                        </button>
                        <div className="hidden sm:block">
                             <h2 className="text-lg font-bold truncate max-w-[200px]">{activeReportTab?.label}</h2>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={onExportPDF} className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-bold shadow-sm">
                            <ArrowDownTrayIcon className="w-4 h-4" /> <span className="hidden xs:inline">PDF</span>
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm">
                            <PrinterIcon className="w-4 h-4" /> <span className="hidden xs:inline">طباعة</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 overflow-x-auto min-w-full">
                        {renderReport()}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border dark:border-gray-700">
                 <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">مركز التقارير المحاسبية</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {isSingleDateReport ? (
                         <div>
                            <label htmlFor="asOfDate" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">التاريخ</label>
                            <input type="date" id="asOfDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label htmlFor="startDate" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">من تاريخ</label>
                                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style w-full" />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">إلى تاريخ</label>
                                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                            </div>
                        </>
                    )}
                    
                    {(activeTab === 'sales' || activeTab === 'saleReturns' || activeTab === 'salesProfitability' || activeTab === 'netProfitability') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">العميل</label>
                            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-style w-full">
                                <option value="">كل العملاء</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {(activeTab === 'purchases' || activeTab === 'purchaseReturns') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">المورد</label>
                            <select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="input-style w-full">
                                <option value="">كل الموردين</option>
                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'inventory' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">نوع الجرد</label>
                                <select value={inventoryReportType} onChange={(e) => setInventoryReportType(e.target.value as any)} className="input-style w-full">
                                    <option value="all_purchase">كل الأصناف (بالتكلفة)</option>
                                    <option value="stock_purchase">أصناف بالمخزن (بالتكلفة)</option>
                                    <option value="stock_sale">أصناف بالمخزن (بالبيع)</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
                        <h3 className="text-xs font-extrabold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-3">{category}</h3>
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
        </div>
    );
};

export default Reports;
