import React, { useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import ViewDetailsModal from '../shared/ViewDetailsModal';
import { JournalEntry } from '../../types';

interface ReportProps {
    date: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const getSourceFromDescription = (description: string): string => {
    if (description.startsWith('فاتورة مبيعات')) return 'فاتورة مبيعات';
    if (description.startsWith('فاتورة مشتريات')) return 'فاتورة مشتريات';
    if (description.startsWith('مرتجع مبيعات')) return 'مرتجع مبيعات';
    if (description.startsWith('مرتجع مشتريات')) return 'مرتجع مشتريات';
    if (description.startsWith('تسوية مخزون')) return 'تسوية مخزون';
    if (description.startsWith('قيد الأرصدة الافتتاحية')) return 'رصيد افتتاحي';
    if (description.startsWith('سند قبض')) return 'سند قبض';
    if (description.startsWith('سند صرف')) return 'سند صرف';
    return 'قيد يدوي';
};


const GeneralJournalReport: React.FC<ReportProps> = ({ date, onDataReady }) => {
    const { journal } = useContext(DataContext);
    const [entryToView, setEntryToView] = useState<JournalEntry | null>(null);

    const reportData = useMemo(() => {
        return journal
            .filter((entry: JournalEntry) => entry.date === date && !entry.isArchived)
            .map(entry => ({
                ...entry,
                source: getSourceFromDescription(entry.description)
            }))
            .sort((a, b) => a.id.localeCompare(b.id));
    }, [journal, date]);

    const columns = useMemo(() => [
        { header: 'رقم القيد', accessor: 'id', sortable: true },
        { header: 'المصدر', accessor: 'source', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الوصف/البيان', accessor: 'description' },
        { header: 'إجمالي مدين', accessor: 'debit', render: (row: any) => row.debit.toLocaleString(), sortable: true },
        { header: 'إجمالي دائن', accessor: 'credit', render: (row: any) => row.credit.toLocaleString(), sortable: true },
    ], []);

    const calculateFooter = useCallback((data: any[]) => {
        const totalDebit = data.reduce((sum, item) => sum + item.debit, 0);
        const totalCredit = data.reduce((sum, item) => sum + item.credit, 0);
        return {
            source: `الإجمالي (${data.length} قيد)`,
            debit: totalDebit.toLocaleString(),
            credit: totalCredit.toLocaleString(),
        };
    }, []);
    
    const reportName = `General-Journal-${date}`;

    useEffect(() => {
        const exportColumns = columns.map(({header, accessor}) => ({header, accessor}));
        onDataReady({ data: reportData, columns: exportColumns, name: reportName });
    }, [reportData, onDataReady, columns, reportName]);

    return (
        <>
            <div id="printable-report">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">دفتر اليومية العام</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                الحركات لليوم: {date}
                            </p>
                        </div>
                    </div>
                    <DataTable 
                        columns={columns} 
                        data={reportData} 
                        actions={['view']}
                        onView={(row) => setEntryToView(row)}
                        calculateFooter={calculateFooter}
                        searchableColumns={['id', 'source', 'description']}
                    />
                </div>
            </div>
            {entryToView && (
                <ViewDetailsModal
                    isOpen={!!entryToView}
                    onClose={() => setEntryToView(null)}
                    title={`تفاصيل القيد رقم ${entryToView.id}`}
                    data={entryToView}
                />
            )}
        </>
    );
};

export default GeneralJournalReport;