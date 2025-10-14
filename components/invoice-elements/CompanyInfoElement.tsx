import React from 'react';

const CompanyInfoElement = ({ companyInfo, printSettings }: any) => {
    if (!printSettings.visibility.companyInfo) return null;

    return (
        <div className="mt-2">
            <h1 style={{ fontSize: printSettings.fontSizes.companyName, color: printSettings.secondaryColor }} className="font-bold">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
            <p className="text-sm">{companyInfo.phone}</p>
            {printSettings.visibility.taxId && printSettings.taxId && <p className="text-sm">الرقم الضريبي: {printSettings.taxId}</p>}
            {printSettings.visibility.taxId && printSettings.commercialRegNo && <p className="text-sm">السجل التجاري: {printSettings.commercialRegNo}</p>}
        </div>
    );
};

export default CompanyInfoElement;