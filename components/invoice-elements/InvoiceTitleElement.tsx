import React from 'react';

const InvoiceTitleElement = ({ printSettings }: any) => {
    if (!printSettings.visibility.invoiceTitle) return null;

    return (
        <div className="text-left">
            <h2 
                style={{ fontSize: printSettings.fontSizes.invoiceTitle, color: printSettings.secondaryColor }} 
                className="font-bold uppercase"
            >
                {printSettings.text.invoiceTitle}
            </h2>
        </div>
    );
};

export default InvoiceTitleElement;
