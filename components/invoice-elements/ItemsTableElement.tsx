import React from 'react';

const ItemsTableElement = ({ sale, printSettings }: any) => {
    if (!printSettings.visibility.itemsTable) return null;

    const enabledColumns = printSettings.itemsTableColumns.filter((c: any) => c.enabled);

    const renderCell = (item: any, columnId: string, index: number) => {
        switch (columnId) {
            case 'index': return index + 1;
            case 'itemName': return item.itemName;
            case 'unit': return item.unitName;
            case 'quantity': return item.quantity;
            case 'price': return item.price.toLocaleString();
            case 'total': return item.total.toLocaleString();
            default: return '';
        }
    };
    
    return (
        <section>
            <table className="w-full text-right">
                <thead >
                    <tr>
                        {enabledColumns.map((col: any) => (
                             <th 
                                key={col.id}
                                style={{
                                    backgroundColor: printSettings.primaryColor,
                                    fontSize: printSettings.fontSizes.tableHeader,
                                }}
                                className="p-3 font-semibold text-white first:rounded-r-lg last:rounded-l-lg"
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody style={{ fontSize: printSettings.fontSizes.tableBody }}>
                    {sale.items.map((item: any, index: number) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                           {enabledColumns.map((col: any) => (
                                <td key={col.id} className="p-3">
                                    {renderCell(item, col.id, index)}
                                </td>
                           ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

export default ItemsTableElement;
