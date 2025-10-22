import React, { useEffect, useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { InventoryItem } from '../../types';

interface ItemToPrint {
    item: InventoryItem;
    quantity: number;
}

const LabelComponent: React.FC<{item: InventoryItem, companyInfo: any}> = ({ item, companyInfo }) => {
    
    const generateBarcodeSVG = (text: string) => {
        const lines = [];
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const width = 1 + (charCode % 2);
            const x = i * 3;
            lines.push(<rect key={i} x={x} y="0" width={width} height="30" fill="#000" />);
        }
        return (
            <svg width="100%" height="30" preserveAspectRatio="none">
                {lines}
            </svg>
        );
    };

    return (
        <div className="label-content" style={{
            width: '50mm',
            height: '25mm',
            padding: '2mm',
            fontFamily: 'Cairo, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
            fontSize: '8pt',
            lineHeight: 1.2,
            overflow: 'hidden',
            backgroundColor: 'white',
            color: 'black',
            pageBreakAfter: 'always',
        }}>
            <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '7pt' }}>{companyInfo.name}</div>
            <div style={{ textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{item.name}</div>
            <div style={{ width: '90%', margin: '1mm 0' }}>
                {item.barcode && generateBarcodeSVG(item.barcode)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%'}}>
               <div style={{ fontFamily: 'monospace', letterSpacing: '0.5px', fontSize: '7pt' }}>{item.barcode}</div>
               <div style={{ fontWeight: 'bold', fontSize: '9pt'}}>{item.salePrice?.toLocaleString()}</div>
            </div>
        </div>
    );
}

const BarcodeLabelBatchPrint: React.FC = () => {
    const { inventory, companyInfo } = useContext(DataContext);
    const [itemsToPrint, setItemsToPrint] = useState<ItemToPrint[]>([]);
    
    useEffect(() => {
        const dataStr = sessionStorage.getItem('batchPrintData');
        if (dataStr) {
            try {
                const data: Record<string, number> = JSON.parse(dataStr);
                const items = Object.entries(data)
                    .map(([itemId, quantity]) => {
                        const item = inventory.find((i: InventoryItem) => i.id === itemId);
                        return item ? { item, quantity } : null;
                    })
                    .filter((i): i is ItemToPrint => i !== null);
                
                setItemsToPrint(items);
            } catch (e) {
                console.error("Failed to parse batch print data", e);
            } finally {
                sessionStorage.removeItem('batchPrintData');
            }
        }
    }, [inventory]);

    useEffect(() => {
        if (itemsToPrint.length > 0) {
            const timer = setTimeout(() => window.print(), 500);
            const handleAfterPrint = () => setTimeout(() => window.close(), 100);
            window.addEventListener('afterprint', handleAfterPrint);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
        }
    }, [itemsToPrint]);

    if (itemsToPrint.length === 0) {
        return <div className="p-4">جاري تجهيز الملصقات للطباعة...</div>;
    }

    const allLabels: React.ReactNode[] = [];
    itemsToPrint.forEach(({ item, quantity }) => {
        for (let i = 0; i < quantity; i++) {
            allLabels.push(<LabelComponent key={`${item.id}-${i}`} item={item} companyInfo={companyInfo} />);
        }
    });

    return (
        <div id="printable-barcode-batch">
            <style>
                {`
                    @media print {
                        @page {
                            size: 50mm 25mm;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        #root {
                           padding: 0 !important;
                           margin: 0 !important;
                        }
                        .label-content:last-of-type {
                            page-break-after: auto;
                        }
                    }
                `}
            </style>
            {allLabels}
        </div>
    );
};

export default BarcodeLabelBatchPrint;