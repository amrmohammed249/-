import React, { useEffect } from 'react';
import InvoiceView from '../sales/InvoiceView';
import { Sale } from '../../types';

// A static sample sale object for test printing purposes
const sampleSaleForTest: Sale = { 
    id: 'TEST-001', 
    customer: 'عميل اختباري', 
    date: new Date().toISOString().slice(0, 10),
    items: [
        { itemId: 'ITM001', itemName: 'منتج اختباري 1', unitId: 'base', unitName: 'قطعة', quantity: 2, price: 100, discount: 0, total: 200 },
        { itemId: 'ITM002', itemName: 'منتج اختباري 2', unitId: 'base', unitName: 'وحدة', quantity: 1, price: 50, discount: 0, total: 50 },
        { itemId: 'ITM003', itemName: 'منتج طويل الاسم جدا لاختبار المساحات', unitId: 'base', unitName: 'كرتونة', quantity: 5, price: 120, discount: 0, total: 600 },
    ],
    subtotal: 850, 
    totalDiscount: 0, 
    total: 850, 
    status: 'مدفوعة'
};

const InvoiceTestPrintPage: React.FC = () => {
    useEffect(() => {
        // Automatically trigger the print dialog after a short delay to ensure content is rendered
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        // Optional: you can add a listener to close the window after printing
        const handleAfterPrint = () => {
             setTimeout(() => {
                window.close();
             }, 100);
        };
        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    return (
        <div className="bg-white">
            <style>
                {`
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                         .no-print {
                           display: none !important;
                         }
                    }
                `}
            </style>
            {/* 
              We render InvoiceView with the isPrintView prop set to true.
              This tells the component to render only the invoice content itself, 
              without the surrounding Modal UI, making it perfect for a dedicated print page.
            */}
            <InvoiceView 
                isOpen={true} 
                onClose={() => {}} 
                sale={sampleSaleForTest} 
                isPrintView={true} 
            />
        </div>
    );
};

export default InvoiceTestPrintPage;
