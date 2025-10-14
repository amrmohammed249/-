import React from 'react';

const SpacerElement = ({ printSettings }: any) => {
    if (!printSettings.visibility.spacer) return null;
    return <div className="my-4"></div>; // Simple spacer, can be customized later
};

export default SpacerElement;
