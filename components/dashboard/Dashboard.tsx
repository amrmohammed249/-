import React, { useState, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import AddTreasuryTransactionForm from '../treasury/AddTreasuryTransactionForm';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { DocumentPlusIcon } from '../icons/DocumentPlusIcon';
import { ArrowDownOnSquareIcon } from '../icons/ArrowDownOnSquareIcon';
import { ArrowUpOnSquareIcon } from '../icons/ArrowUpOnSquareIcon';
import { ArrowTrendingUpIcon } from '../icons/ArrowTrendingUpIcon';
import { ArrowTrendingDownIcon } from '../icons/ArrowTrendingDownIcon';
import { DataContext } from '../../context/DataContext';
import InvoiceView from '../sales/InvoiceView';
import ViewDetailsModal from '../shared/ViewDetailsModal';
import { Sale, Purchase, RecentTransaction, TreasuryTransaction } from '../../types';
import { BoxIcon } from '../icons/BoxIcon';
import { IdentificationIcon } from '../icons/IdentificationIcon';
import AccountStatementLauncherModal from './AccountStatementLauncherModal';
import PurchaseInvoiceView from '../purchases/PurchaseInvoiceView';
import TreasuryVoucherView from '../treasury/TreasuryVoucherView';
import { WindowContext } from '../../context/WindowContext';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';

const QuickActionButton = ({ label, icon, onClick, className }: any) => (
    <button onClick={onClick} className={`flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium rounded-lg transition-colors ${className}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    sales, purchases, customers, suppliers,
    totalReceivables, totalPayables, inventoryValue, totalCashBalance,
    recentTransactions, topCustomers, sequences
   } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  
  const [saleToShow, setSaleToShow] = useState<Sale | null>(null);
  const [purchaseToShow, setPurchaseToShow] = useState<Purchase | null>(null);
  const [treasuryTransactionToShow, setTreasuryTransactionToShow] = useState<TreasuryTransaction | null>(null);

  const [statementModalConfig, setStatementModalConfig] = useState<{ isOpen: boolean; partyType: 'customer' | 'supplier' | null }>({
    isOpen: false,
    partyType: null,
  });

  const openReceiptModal = useCallback(() => setReceiptModalOpen(true), []);
  const openPaymentModal = useCallback(() => setPaymentModalOpen(true), []);

  const closeReceiptModal = useCallback(() => setReceiptModalOpen(false), []);
  const closePaymentModal = useCallback(() => setPaymentModalOpen(false), []);

  const dynamicSalesChartData = useMemo(() => {
    const months = [];
    const today = new Date();
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        date: d,
        name: monthNames[d.getMonth()],
        sales: 0,
        purchases: 0,
      });
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const monthData = months.find(m => 
        m.date.getFullYear() === saleDate.getFullYear() && 
        m.date.getMonth() === saleDate.getMonth()
      );
      if (monthData) {
        monthData.sales += sale.total;
      }
    });

    purchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.date);
      const monthData = months.find(m => 
        m.date.getFullYear() === purchaseDate.getFullYear() && 
        m.date.getMonth() === purchaseDate.getMonth()
      );
      if (monthData) {
        monthData.purchases += purchase.total;
      }
    });

    return months.map(({ name, sales, purchases }) => ({ name, sales, purchases }));
  }, [sales, purchases]);

  const totalSales = sales.reduce((sum, item) => sum + item.total, 0);
  const totalPurchases = purchases.reduce((sum, item) => sum + item.total, 0);
  
  const handleTreasuryTransactionAdded = useCallback((newTransaction: TreasuryTransaction) => {
    setReceiptModalOpen(false);
    setPaymentModalOpen(false);
    setTreasuryTransactionToShow(newTransaction);
  }, []);

  const handleTransactionClick = useCallback((transaction: RecentTransaction) => {
    if (transaction.type === 'sale') {
        const sale = sales.find(s => s.id === transaction.id);
        if (sale) setSaleToShow(sale);
    } else if (transaction.type === 'purchase') {
        const purchase = purchases.find(p => p.id === transaction.id);
        if (purchase) {
            setPurchaseToShow(purchase);
        }
    }
  }, [sales, purchases]);


  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">لوحة التحكم</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          <QuickActionButton label="فاتورة مبيعات" icon={<ShoppingCartIcon className="w-5 h-5"/>} onClick={() => openWindow({ 
              path: '/sales/new', 
              title: 'فاتورة مبيعات', 
              icon: <ShoppingCartIcon />,
              state: {
                activeInvoice: {
                    id: `INV-${String(sequences.sale).padStart(3, '0')}`,
                    date: new Date().toISOString().slice(0, 10),
                    status: 'مستحقة',
                },
                items: [],
                customer: null,
                productSearchTerm: '',
                customerSearchTerm: '',
                itemErrors: {},
              }
            })} className="bg-blue-500 text-white hover:bg-blue-600" />
          <QuickActionButton label="فاتورة مشتريات" icon={<TruckIcon className="w-5 h-5"/>} onClick={() => openWindow({ 
              path: '/purchases/new', 
              title: 'فاتورة مشتريات', 
              icon: <TruckIcon />,
              state: {
                activeBill: {
                    id: `BILL-${String(sequences.purchase).padStart(3, '0')}`,
                    date: new Date().toISOString().slice(0, 10),
                    status: 'مستحقة',
                },
                 items: [],
                 supplier: null,
                 productSearchTerm: '',
                 supplierSearchTerm: '',
                 isProcessing: false,
              }
            })} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="إنشاء بيان أسعار" icon={<DocumentPlusIcon className="w-5 h-5"/>} onClick={() => openWindow({ 
              path: '/price-quotes', 
              title: 'إنشاء بيان أسعار', 
              icon: <DocumentPlusIcon />,
              state: {
                activeQuote: {
                    id: `QT-${String(sequences.priceQuote).padStart(3, '0')}`,
                    date: new Date().toISOString().slice(0, 10),
                },
                items: [],
                customer: null,
                productSearchTerm: '',
                customerSearchTerm: '',
                isProcessing: false,
              }
            })} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="إنشاء طلب شراء" icon={<DocumentPlusIcon className="w-5 h-5"/>} onClick={() => openWindow({ 
              path: '/purchase-quotes', 
              title: 'إنشاء طلب شراء', 
              icon: <DocumentPlusIcon />,
              state: {
                activeQuote: {
                    id: `PQT-${String(sequences.purchaseQuote).padStart(3, '0')}`,
                    date: new Date().toISOString().slice(0, 10),
                },
                items: [],
                supplier: null,
                productSearchTerm: '',
                supplierSearchTerm: '',
                isProcessing: false,
              }
            })} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="مرتجع مبيعات" icon={<ArrowUturnLeftIcon className="w-5 h-5"/>} onClick={() => openWindow({
              path: '/sales-returns/new',
              title: 'مرتجع مبيعات',
              icon: <ArrowUturnLeftIcon />,
              state: {
                  activeReturn: {
                      id: `SRET-${String(sequences.saleReturn).padStart(3, '0')}`,
                      date: new Date().toISOString().slice(0, 10),
                  },
                  items: [],
                  customer: null,
                  productSearchTerm: '',
                  customerSearchTerm: '',
                  isProcessing: false,
              }
          })} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="مرتجع مشتريات" icon={<ArrowUturnLeftIcon className="w-5 h-5"/>} onClick={() => openWindow({
              path: '/purchases-returns/new',
              title: 'مرتجع مشتريات',
              icon: <ArrowUturnLeftIcon />,
              state: {
                  activeReturn: {
                      id: `PRET-${String(sequences.purchaseReturn).padStart(3, '0')}`,
                      date: new Date().toISOString().slice(0, 10),
                  },
                  items: [],
                  supplier: null,
                  productSearchTerm: '',
                  supplierSearchTerm: '',
                  isProcessing: false,
                  itemErrors: {},
              }
          })} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="سند قبض" icon={<ArrowDownOnSquareIcon className="w-5 h-5"/>} onClick={openReceiptModal} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
          <QuickActionButton label="سند صرف" icon={<ArrowUpOnSquareIcon className="w-5 h-5"/>} onClick={openPaymentModal} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"/>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="إجمالي المبيعات" value={totalSales.toLocaleString()} icon={<ShoppingCartIcon className="text-green-500" />} footer={<span className="flex items-center text-green-500"><ArrowTrendingUpIcon className="w-4 h-4 ml-1"/> 12.5%</span>} />
            <Card title="إجمالي المشتريات" value={totalPurchases.toLocaleString()} icon={<TruckIcon className="text-red-500" />} footer={<span className="flex items-center text-red-500"><ArrowTrendingDownIcon className="w-4 h-4 ml-1"/> 3.2%</span>} />
            <Card title="الرصيد النقدي" value={totalCashBalance.toLocaleString()} icon={<BanknotesIcon className="text-blue-500" />} footer="محدث الآن"/>
          </div>
          
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">اختصارات سريعة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <button onClick={() => setStatementModalConfig({isOpen: true, partyType: 'customer'})} className="flex flex-col items-center justify-center p-4 space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors">
                  <IdentificationIcon className="w-8 h-8 text-blue-500"/>
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-300">كشف حساب عميل</span>
              </button>
              <button onClick={() => setStatementModalConfig({isOpen: true, partyType: 'supplier'})} className="flex flex-col items-center justify-center p-4 space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors">
                  <IdentificationIcon className="w-8 h-8 text-blue-500"/>
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-300">كشف حساب مورد</span>
              </button>
            </div>
          </div>


          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">نظرة عامة على المبيعات والمشتريات</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={dynamicSalesChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4B5563', borderRadius: '0.5rem' }} labelStyle={{ color: '#F9FAFB' }} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="purchases" name="المشتريات" stroke="#EF4444" fillOpacity={1} fill="url(#colorPurchases)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">أحدث العمليات</h3>
            <div className="space-y-2">
              {recentTransactions.map(t => (
                <div key={`${t.type}-${t.id}`} onClick={() => handleTransactionClick(t)} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                     <span className={`p-2 rounded-full ${t.type === 'sale' ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                        {t.type === 'sale' ? <ShoppingCartIcon className="w-5 h-5 text-green-600"/> : <TruckIcon className="w-5 h-5 text-red-600"/>}
                     </span>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{t.type === 'sale' ? `فاتورة لـ ${t.partyName}` : `فاتورة من ${t.partyName}`}</p>
                        <p className="text-xs text-gray-500">{t.date}</p>
                    </div>
                  </div>
                   <div className="text-left">
                       <p className="font-semibold font-mono text-lg">{t.total.toLocaleString()}</p>
                       <p className={`text-xs font-semibold ${t.status === 'مدفوعة' ? 'text-green-500' : 'text-red-500'}`}>{t.status}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
              <Card title="الذمم المدينة" value={totalReceivables.toLocaleString()} icon={<UsersIcon className="text-red-500" />} footer={<div onClick={() => navigate('/customers')} className="cursor-pointer hover:underline">{customers.length} عملاء</div>}/>
              <Card title="الذمم الدائنة" value={totalPayables.toLocaleString()} icon={<UsersIcon className="text-green-500" />} footer={<div onClick={() => navigate('/suppliers')} className="cursor-pointer hover:underline">{suppliers.length} موردين</div>} />
              <Card title="قيمة المخزون" value={inventoryValue.toLocaleString()} icon={<BoxIcon className="text-purple-500" />} footer="بتكلفة الشراء"/>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">العملاء الأعلى مبيعاً</h3>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topCustomers} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4B5563', borderRadius: '0.5rem' }} labelStyle={{ color: '#F9FAFB' }} />
                    <Bar dataKey="total" name="إجمالي المبيعات" fill="#3B82F6" background={{ fill: 'rgba(239, 246, 255, 0.1)' }} />
                </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {isReceiptModalOpen && <Modal isOpen={isReceiptModalOpen} onClose={closeReceiptModal} title="إضافة سند قبض جديد"><AddTreasuryTransactionForm onClose={closeReceiptModal} onSuccess={handleTreasuryTransactionAdded} defaultType="سند قبض" /></Modal>}
      {isPaymentModalOpen && <Modal isOpen={isPaymentModalOpen} onClose={closePaymentModal} title="إضافة سند صرف جديد"><AddTreasuryTransactionForm onClose={closePaymentModal} onSuccess={handleTreasuryTransactionAdded} defaultType="سند صرف" /></Modal>}
      
      {saleToShow && <InvoiceView isOpen={!!saleToShow} onClose={() => setSaleToShow(null)} sale={saleToShow} />}
      {purchaseToShow && <PurchaseInvoiceView isOpen={!!purchaseToShow} onClose={() => setPurchaseToShow(null)} purchase={purchaseToShow} />}
      {treasuryTransactionToShow && <TreasuryVoucherView isOpen={!!treasuryTransactionToShow} onClose={() => setTreasuryTransactionToShow(null)} transaction={treasuryTransactionToShow} />}

      {statementModalConfig.isOpen && (
        <AccountStatementLauncherModal config={statementModalConfig} onClose={() => setStatementModalConfig({isOpen: false, partyType: null})} />
      )}
    </div>
  );
};

export default Dashboard;