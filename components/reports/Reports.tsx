import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
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
import { EyeIcon, PrinterIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, XIcon } from '../icons';


declare var jspdf: any;
declare var html2canvas: any;


type ReportTabKey = 'profitAndLoss' | 'balanceSheet' | 'treasury' | 'sales' | 'saleReturns' | 'purchases' | 'purchaseReturns' | 'salesProfitability' | 'expense' | 'customerSummary' | 'inventory' | 'itemMovement';

const reportTabs: { key: ReportTabKey; label: string; isTable: boolean, category: string }[] = [
    { key: 'profitAndLoss', label: 'قائمة الدخل', isTable: false, category: 'تقارير مالية' },
    { key: 'balanceSheet', label: 'الميزانية العمومية', isTable: false, category: 'تقارير مالية' },
    { key: 'treasury', label: 'حركة الخزينة', isTable: true, category: 'تقارير مالية' },
    { key: 'expense', label: 'المصروفات', isTable: true, category: 'تقارير مالية' },
    { key: 'sales', label: 'المبيعات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'saleReturns', label: 'مردودات المبيعات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'purchases', label: 'المشتريات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'purchaseReturns', label: 'مردودات المشتريات', isTable: true, category: 'تقارير المبيعات والمشتريات' },
    { key: 'salesProfitability', label: 'ربحية المبيعات', isTable: true, category: 'تقارير تحليلية' },
    { key: 'customerSummary', label: 'ملخص العملاء', isTable: true, category: 'تقارير تحليلية' },
    { key: 'inventory', label: 'أرصدة المخزون', isTable: true, category: 'تقارير المخزون' },
    { key: 'itemMovement', label: 'حركة صنف', isTable: true, category: 'تقارير المخزون' },
];

const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
    return nodes.reduce<AccountNode[]>((acc, node) => {
        if (!node.children || node.children.length === 0) {
            acc.push(node);
        } else {
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

    // Filters for different reports
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
    const [selectedItemCategory, setSelectedItemCategory] = useState<string>('');
    const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    
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
    }, [activeTab]);

    const itemCategories = useMemo(() => {
        const categories = new Set<string>();
        inventory.forEach((item: InventoryItem) => {
            if (item.category) {
                categories.add(item.category);
            }
        });
        return Array.from(categories).sort();
    }, [inventory]);

    const expenseAccounts = useMemo(() => {
        const expenseRoot = chartOfAccounts.find((n: AccountNode) => n.id === '4-2'); // مصاريف تشغيل
        if (!expenseRoot || !expenseRoot.children) return [];
        return flattenAccounts(expenseRoot.children).sort((a,b) => a.code.localeCompare(b.code));
    }, [chartOfAccounts]);
    
    const itemSearchResults = useMemo(() => {
        if (itemSearchTerm.length < 1) return [];
        const term = itemSearchTerm.toLowerCase();
        return inventory.filter((i: InventoryItem) => 
            !i.isArchived && 
            (i.name.toLowerCase().includes(term) || i.id.toLowerCase().includes(term))
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
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`${reportExportProps.name}.pdf`);
                });
        }
    };

    const isDateRangeReport = activeTab !== 'balanceSheet' && activeTab !== 'inventory';
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
            case 'customerSummary': return <CustomerSummaryReport {...props} />;
            case 'inventory': return <InventoryReport asOfDate={endDate} onDataReady={handleDataReady} itemId={selectedInventoryId} />;
            case 'salesProfitability': return <SalesProfitabilityReport {...props} customerId={selectedCustomerId} itemId={selectedInventoryId} itemCategoryId={selectedItemCategory} />;
            case 'expense': return <ExpenseReport {...props} expenseAccountId={selectedExpenseAccountId} />;
            case 'treasury': return <TreasuryReport {...props} treasuryAccountId={selectedTreasuryId} />;
            case 'itemMovement': return <ItemMovementReport {...props} itemId={selectedInventoryId} />;
            default: return <p>الرجاء اختيار تقرير لعرضه.</p>;
        }
    };

    const activeReportTab = reportTabs.find(t => t.key === activeTab);

    if (isReportVisible) {
        return (
            <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-[60] flex flex-col">
                <header className="no-print bg-white dark:bg-gray-800 p-3 shadow-md flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsReportVisible(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-semibold">
                           <ArrowUturnLeftIcon className="w-5 h-5 transform rotate-180"/>
                           <span>العودة للفلاتر</span>
                        </button>
                        <div>
                             <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{activeReportTab?.label}</h2>
                             <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isDateRangeReport ? `الفترة من ${startDate} إلى ${endDate}` : `حتى تاريخ ${endDate}`}
                             </p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={onExportPDF} 
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>تصدير PDF</span>
                        </button>
                        <button 
                            onClick={() => window.print()} 
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            <span>طباعة</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {renderReport()}
                </main>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">مركز التقارير</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {isDateRangeReport ? (
                        <>
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style w-full" />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                            </div>
                        </>
                    ) : (
                         <div>
                            <label htmlFor="asOfDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حتى تاريخ</label>
                            <input type="date" id="asOfDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style w-full" />
                        </div>
                    )}
                    
                    {(activeTab === 'sales' || activeTab === 'saleReturns' || activeTab === 'salesProfitability') && (
                        <div>
                            <label htmlFor="customerFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العميل</label>
                            <select id="customerFilter" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="input-style w-full">
                                <option value="">كل العملاء</option>
                                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {(activeTab === 'purchases' || activeTab === 'purchaseReturns') && (
                        <div>
                            <label htmlFor="supplierFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المورد</label>
                            <select id="supplierFilter" value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="input-style w-full">
                                <option value="">كل الموردين</option>
                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'salesProfitability' && (
                        <>
                            <div>
                                <label htmlFor="itemFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
                                <select id="itemFilter" value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)} className="input-style w-full">
                                    <option value="">كل الأصناف</option>
                                    {inventory.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="itemCategoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فئة الصنف</label>
                                <select id="itemCategoryFilter" value={selectedItemCategory} onChange={(e) => setSelectedItemCategory(e.target.value)} className="input-style w-full">
                                    <option value="">كل الفئات</option>
                                    {itemCategories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                     {activeTab === 'inventory' && (
                         <div>
                            <label htmlFor="inventoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
                            <select id="inventoryFilter" value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)} className="input-style w-full">
                                <option value="">كل الأصناف</option>
                                {inventory.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'itemMovement' && (
                        <div className="relative">
                            <label htmlFor="itemMovementFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
                            <input
                                id="itemMovementFilter"
                                type="text"
                                value={selectedInventoryId ? (inventory.find((i: InventoryItem) => i.id === selectedInventoryId)?.name || '') : itemSearchTerm}
                                onChange={(e) => {
                                    setItemSearchTerm(e.target.value);
                                    if (selectedInventoryId) setSelectedInventoryId('');
                                }}
                                className="input-style w-full"
                                placeholder="ابحث بالاسم أو الكود..."
                                required
                                autoComplete="off"
                            />
                            {itemSearchTerm && itemSearchResults.length > 0 && !selectedInventoryId && (
                              <div className="absolute top-full right-0 left-0 bg-white dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-10 max-h-60 overflow-y-auto">
                                {itemSearchResults.map((item: InventoryItem) => (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      setSelectedInventoryId(item.id);
                                      setItemSearchTerm('');
                                    }}
                                    className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    {item.name} <span className="text-xs text-gray-500">({item.id})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {selectedInventoryId && (
                                <button
                                    type="button"
                                    className="absolute left-2 top-8 text-gray-400 hover:text-red-500"
                                    onClick={() => {
                                        setSelectedInventoryId('');
                                        setItemSearchTerm('');
                                    }}
                                    title="إزالة الاختيار"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                     {activeTab === 'expense' && (
                         <div>
                            <label htmlFor="expenseAccountFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حساب المصروف</label>
                            <select id="expenseAccountFilter" value={selectedExpenseAccountId} onChange={(e) => setSelectedExpenseAccountId(e.target.value)} className="input-style w-full">
                                <option value="">كل الحسابات</option>
                                {expenseAccounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'treasury' && (
                         <div>
                            <label htmlFor="treasuryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الخزينة</label>
                            <select id="treasuryFilter" value={selectedTreasuryId} onChange={(e) => setSelectedTreasuryId(e.target.value)} className="input-style w-full">
                                <option value="">كل الخزائن</option>
                                {(treasuriesList || []).filter((t: any) => !t.isTotal).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {Object.entries(groupedTabs).map(([category, tabs]) => (
                    <div key={category}>
                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">{category}</h3>
                        <div className="bg-gray-200 dark:bg-gray-900 rounded-lg p-1">
                             <nav className="flex flex-wrap gap-1">
                                {/* FIX: Cast `tabs` to its correct array type before mapping. */}
                                {(tabs as typeof reportTabs).map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                            activeTab === tab.key
                                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex justify-center items-center">
                 <button
                    onClick={() => setIsReportVisible(true)}
                    disabled={isViewButtonDisabled}
                    className="px-8 py-3 bg-blue-500 text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <EyeIcon className="w-6 h-6" />
                    عرض التقرير
                </button>
            </div>
        </div>
    );
};

export default Reports;