import React from 'react';

const FooterTextElement = ({ printSettings }: any) => {
    if (!printSettings.visibility.footerText) return null;

    return (
        <footer className="text-center mt-12 pt-6 border-t dark:border-gray-700 relative">
             {printSettings.visibility.showFooterBar !== false && (
                <div style={{ backgroundColor: printSettings.primaryColor }} className="absolute top-0 left-0 right-0 h-1"></div>
             )}
           {printSettings.text.footerText && 
             <p style={{ fontSize: printSettings.fontSizes.footer }} className="whitespace-pre-wrap mb-4 text-gray-500 dark:text-gray-400">{printSettings.text.footerText}</p>
           }
        </footer>
    );
};

export default FooterTextElement;
