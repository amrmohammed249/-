

import React, { useState, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon } from '../icons/HomeIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BoxIcon } from '../icons/BoxIcon';
import { ShoppingCartIcon } from '../icons/ShoppingCartIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CogIcon } from '../icons/CogIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { DocumentReportIcon } from '../icons/DocumentReportIcon';
import { ClipboardDocumentListIcon } from '../icons/ClipboardDocumentListIcon';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import { CircleStackIcon } from '../icons/CircleStackIcon';
import { OfficeBuildingIcon } from '../icons/OfficeBuildingIcon';
import { ArrowUturnLeftIcon } from '../icons/ArrowUturnLeftIcon';
import { XIcon } from '../icons/XIcon';
import { ClipboardDocumentCheckIcon } from '../icons/ClipboardDocumentCheckIcon';
import { BarcodeIcon } from '../icons/BarcodeIcon';
import { DocumentPlusIcon } from '../icons/DocumentPlusIcon';

interface NavItemProps {
  to?: string;
  onClick?: () => void;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, onClick, label, icon, end = true }) => {
  const activeClass = "bg-blue-500 text-white";
  const inactiveClass = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

  if (onClick) {
    return (
        <button onClick={onClick} className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${inactiveClass}`}>
            <div className="w-6 h-6 ml-3">{icon}</div>
            <span>{label}</span>
        </button>
    );
  }

  return (
    <NavLink
      to={to!}
      end={end}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? activeClass : inactiveClass}`
      }
    >
      <div className="w-6 h-6 ml-3">{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
};

interface DropdownNavProps {
    label: string;
    icon: React.ReactNode;
    items: { to?: string; onClick?: () => void; label: string; icon: React.ReactNode; }[];
    initialOpen?: boolean;
}

const DropdownNav: React.FC<DropdownNavProps> = ({ label, icon, items, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center px-4 py-3 my-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="flex items-center">
                    <div className="w-6 h-6 ml-3">{icon}</div>
                    <span>{label}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="pr-4 border-r-2 border-gray-200 dark:border-gray-600 mr-5">
                    {items.map((item, index) => <NavItem key={item.to || index} {...item} />)}
                </div>
            )}
        </div>
    );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useContext(DataContext);
  const { openWindow } = useContext(WindowContext);
  
  if (!currentUser) return null;

  const canViewReports = currentUser.role === 'مدير النظام' || currentUser.role === 'محاسب';
  const isAdmin = currentUser.role === 'مدير النظام';

  const navItems = [
    { to: '/', label: 'الرئيسية', icon: <HomeIcon />, show: true },
    { to: '/fixed-assets', label: 'الأصول الثابتة', icon: <OfficeBuildingIcon />, show: true },
    { to: '/treasury', label: 'الخزينة', icon: <BanknotesIcon />, show: true },
    { to: '/customers', label: 'العملاء', icon: <UsersIcon />, show: true },
    { to: '/suppliers', label: 'الموردين', icon: <UsersIcon />, show: true },
    { to: '/reports', label: 'التقارير', icon: <DocumentReportIcon />, show: canViewReports },
    { to: '/activity-log', label: 'سجل النشاط', icon: <ClipboardDocumentListIcon />, show: isAdmin },
    { to: '/archive', label: 'الأرشيف', icon: <CircleStackIcon />, show: isAdmin },
    { to: '/settings', label: 'الإعدادات', icon: <CogIcon />, show: isAdmin },
  ];
  
  const accountsDropdown = {
    label: "الحسابات",
    icon: <ChartBarIcon />,
    initialOpen: true,
    items: [
        { to: '/accounts/chart', label: 'شجرة الحسابات', icon: <ChartBarIcon /> },
        { to: '/accounts/journal', label: 'القيود اليومية', icon: <DocumentTextIcon /> },
    ]
  };
  
  const salesDropdown = {
    label: "المبيعات",
    icon: <ShoppingCartIcon />,
    items: [
        { onClick: () => openWindow({ path: '/sales/new', title: 'فاتورة مبيعات', icon: <DocumentPlusIcon /> }), label: 'إنشاء فاتورة مبيعات', icon: <DocumentPlusIcon /> },
        { to: '/sales', label: 'قائمة فواتير المبيعات', icon: <DocumentTextIcon /> },
        { to: '/price-quotes/list', label: 'قائمة بيانات الأسعار', icon: <ClipboardDocumentListIcon /> },
        { to: '/sales-returns', label: 'مردودات المبيعات', icon: <ArrowUturnLeftIcon /> },
    ]
  };

  const purchasesDropdown = {
    label: "المشتريات",
    icon: <TruckIcon />,
    items: [
        { onClick: () => openWindow({ path: '/purchases/new', title: 'فاتورة مشتريات', icon: <DocumentPlusIcon /> }), label: 'إنشاء فاتورة مشتريات', icon: <DocumentPlusIcon /> },
        { to: '/purchases', label: 'قائمة فواتير المشتريات', icon: <DocumentTextIcon /> },
        { to: '/purchase-quotes/list', label: 'قائمة طلبات الشراء', icon: <ClipboardDocumentListIcon /> },
        { to: '/purchases-returns', label: 'مردودات المشتريات', icon: <ArrowUturnLeftIcon /> },
    ]
  };

  const inventoryDropdown = {
    label: "المخزون",
    icon: <BoxIcon />,
    items: [
      { to: '/inventory', label: 'قائمة الأصناف', icon: <DocumentTextIcon /> },
      { to: '/inventory/adjustments', label: 'تسويات المخزون', icon: <ClipboardDocumentCheckIcon /> },
      { to: '/barcode-tools', label: 'أدوات الباركود', icon: <BarcodeIcon /> },
    ]
  };

  return (
     <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>
    
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-md md:inset-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-4 border-b dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-500">ERP System</h1>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="إغلاق القائمة">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {navItems.filter(i => i.show).slice(0, 1).map((item) => <NavItem key={item.to} {...item} />)}

          <DropdownNav {...accountsDropdown} />
          <DropdownNav {...salesDropdown} />
          <DropdownNav {...purchasesDropdown} />
          <DropdownNav {...inventoryDropdown} />
          
          {navItems.filter(i => i.show).slice(1).map((item) => <NavItem key={item.to} {...item} />)}

        </nav>
      </aside>
    </>
  );
};

export default Sidebar;