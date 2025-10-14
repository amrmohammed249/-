import React from 'react';

const NotesElement = ({ printSettings }: any) => {
    if (!printSettings.visibility.notes) return null;

    return (
        <div className="mt-8">
            <h4 style={{fontSize: printSettings.fontSizes.sectionHeadings}} className="font-bold mb-2">{printSettings.text.notesTitle}</h4>
            <p style={{fontSize: printSettings.fontSizes.tableBody}} className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{printSettings.text.notesContent}</p>
        </div>
    );
};

export default NotesElement;
