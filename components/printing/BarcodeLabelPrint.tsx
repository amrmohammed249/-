import React, { useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';

const BarcodeLabelPrint: React.FC = () => {
    const { itemId } = useParams<{ itemId?: string }>();
    const { inventory, companyInfo } = useContext(DataContext);
    
    // Determine if this is a test print or a specific item print
    const isTest = !itemId;
    const item = isTest 
        ? { id: 'ITEM-123', name: 'صنف اختباري', barcode: '123456789012', salePrice: 99.99 }
        : inventory.find((i: any) => i.id === itemId);

    useEffect(() => {
        // Trigger print dialog automatically after a short delay to ensure rendering
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        // Optional: Close the window after printing
        const handleAfterPrint = () => {
             // A short delay before closing can help ensure the print job is sent
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

    if (!item) {
        return <div className="p-4">لم يتم العثور على الصنف.</div>;
    }

    // A simple barcode SVG generator. For production, a library like JsBarcode is recommended for accuracy.
    const generateBarcodeSVG = (text: string) => {
        const lines = [];
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            const width = 1 + (charCode % 2); // Simple variation
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
        <div id="printable-barcode-label" style={{
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
            backgroundColor: 'white', // Ensure background is white for printing
            color: 'black',
        }}>
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
                    }
                `}
            </style>
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
};

export default BarcodeLabelPrint;
