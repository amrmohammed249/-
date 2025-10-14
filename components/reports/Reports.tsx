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
import ReportActionBar from './ReportActionBar';
import { AccountNode } from '../../types';
import TreasuryReport from './TreasuryReport';

declare var jspdf: any;
declare var html2canvas: any;
declare var XLSX: any;


type ReportTabKey = 'profitAndLoss' | 'balanceSheet' | 'treasury' | 'sales' | 'saleReturns' | 'purchases' | 'purchaseReturns' | 'salesProfitability' | 'expense' | 'customerSummary' | 'inventory';

const reportTabs: { key: ReportTabKey; label: string; isTable: boolean }[] = [
    { key: 'profitAndLoss', label: 'قائمة الدخل', isTable: false },
    { key: 'balanceSheet', label: 'الميزانية العمومية', isTable: false },
    { key: 'treasury', label: 'حركة الخزينة', isTable: true },
    { key: 'sales', label: 'المبيعات', isTable: true },
    { key: 'saleReturns', label: 'مردودات المبيعات', isTable: true },
    { key: 'purchases', label: 'المشتريات', isTable: true },
    { key: 'purchaseReturns', label: 'مردودات المشتريات', isTable: true },
    { key: 'salesProfitability', label: 'ربحية المبيعات', isTable: true },
    { key: 'expense', label: 'المصروفات', isTable: true },
    { key: 'customerSummary', label: 'ملخص العملاء', isTable: true },
    { key: 'inventory', label: 'المخزون', isTable: true },
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
    const [activeTab, setActiveTab] = useState<ReportTabKey>('profitAndLoss');
    const [startDate, setStartDate] = useState(financialYear.startDate);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
    const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState<string>('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    
    const [reportExportProps, setReportExportProps] = useState<{ data: any[], columns: any[], name: string }>({ data: [], columns: [], name: '' });


    useEffect(() => {
        // Reset specific filters when tab changes
        setSelectedCustomerId('');
        setSelectedSupplierId('');
        setSelectedInventoryId('');
        setSelectedExpenseAccountId('');
        setSelectedTreasuryId('');
    }, [activeTab]);

    const expenseAccounts = useMemo(() => {
        const expenseRoot = chartOfAccounts.find((n: AccountNode) => n.code === '4000')?.children?.find((n: AccountNode) => n.code === '4200');
        if (!expenseRoot || !expenseRoot.children) return [];
        return flattenAccounts(expenseRoot.children).sort((a,b) => a.code.localeCompare(b.code));
    }, [chartOfAccounts]);

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

    const onExportCSV = () => {
        const { data, columns, name } = reportExportProps;
        if (!data || !columns || data.length === 0) {
            alert('لا توجد بيانات لتصديرها.');
            return;
        }

        const headers = columns.map(col => col.header).join(',');
        const rows = data.map(row => {
            return columns.map(col => {
                let value = col.render ? col.render(row) : row[col.accessor];
                // Strip HTML and clean up value for CSV
                if (typeof value === 'string') {
                    value = value.replace(/<[^>]*>?/gm, '').replace(/,/g, '');
                }
                return `"${value}"`;
            }).join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currentTabInfo = reportTabs.find(t => t.key === activeTab);
    const isDateRangeReport = activeTab !== 'balanceSheet' && activeTab !== 'inventory';

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
            case 'salesProfitability': return <SalesProfitabilityReport {...props} customerId={selectedCustomerId} />;
            case 'expense': return <ExpenseReport {...props} expenseAccountId={selectedExpenseAccountId} />;
            case 'treasury': return <TreasuryReport {...props} treasuryAccountId={selectedTreasuryId} />;
            default: return <p>الرجاء اختيار تقرير لعرضه.</p>;
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex-shrink-0">
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
                    
                    {(activeTab === 'sales' || activeTab === 'saleReturns' || activeTab === 'salesProfitability' || activeTab === 'customerSummary') && (
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
                    {activeTab === 'inventory' && (
                         <div>
                            <label htmlFor="inventoryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنتج</label>
                            <select id="inventoryFilter" value={selectedInventoryId} onChange={(e) => setSelectedInventoryId(e.target.value)} className="input-style w-full">
                                <option value="">كل المنتجات</option>
                                {inventory.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
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
                                {treasuriesList.filter((t: any) => !t.isTotal).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-200 dark:bg-gray-900 rounded-lg p-1 mt-6 flex-shrink-0">
                <nav className="flex space-x-1 space-x-reverse overflow-x-auto">
                    {reportTabs.sort((a,b) => a.label.localeCompare(b.label)).map(tab => (
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
            
            <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-y-auto mt-6">
                {renderReport()}
            </div>
            
            <div className="flex-shrink-0 mt-6">
                <ReportActionBar 
                    isTable={currentTabInfo?.isTable ?? true}
                    onExportPDF={onExportPDF}
                    onExportCSV={onExportCSV}
                />
            </div>
        </div>
    );
};

export default Reports;
