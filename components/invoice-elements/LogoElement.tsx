import React from 'react';

const LogoElement = ({ printSettings }: any) => {
    if (!printSettings.logo || !printSettings.visibility.logo) return null;

    return (
        <div className="w-full" style={{ display: 'flex', justifyContent: printSettings.logoAlignment }}>
            <img 
                src={printSettings.logo} 
                alt="شعار الشركة" 
                style={{ height: `${printSettings.logoSize}px`, width: 'auto' }}
                className="object-contain mb-4"
              />
        </div>
    );
};

export default LogoElement;
