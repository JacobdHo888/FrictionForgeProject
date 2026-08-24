import React from 'react';
import { DispatchEvent, LedgerTotal, ReviewQueueItem } from '../types';
import { Database, AlertOctagon } from 'lucide-react';

interface ActiveShiftPanelProps {
    events: DispatchEvent[];
}

export const ActiveShiftPanel: React.FC<ActiveShiftPanelProps> = ({ events }) => {
    // Derive state from events
    const reviewQueue: ReviewQueueItem[] = events
        .filter(e => e.type === 'WATCHDOG_ESCALATION')
        .map(e => ({
            id: e.id,
            timestamp: e.timestamp,
            reason: e.message,
            status: 'PENDING'
        }));

    // Mock ledger totals based on LEDGER_UPDATED events
    const ledgerUpdates = events.filter(e => e.type === 'LEDGER_UPDATED');
    const totals: LedgerTotal[] = [
        { category: 'Invoices Processed', count: ledgerUpdates.length, value: ledgerUpdates.length * 1250.00 },
        { category: 'Anomalies Detected', count: reviewQueue.length, value: 0 }
    ];

    return (
        <div className="flex flex-col h-full bg-vulcan-900 border-l border-vulcan-700">
            {/* Ledger Totals */}
            <div className="flex-1 border-b border-vulcan-700 flex flex-col">
                <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 bg-vulcan-800">
                    <Database className="w-4 h-4 text-event-ledger" />
                    <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Ledger Totals</h2>
                </div>
                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {totals.map((total, idx) => (
                        <div key={idx} className="bg-vulcan-950 border border-vulcan-700 p-3">
                            <div className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest mb-1">
                                {total.category}
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-2xl font-mono text-vulcan-100">{total.count}</span>
                                {total.value > 0 && (
                                    <span className="text-xs font-mono text-event-verify">${total.value.toFixed(2)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review Queue */}
            <div className="flex-1 flex flex-col">
                <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 bg-vulcan-800">
                    <AlertOctagon className="w-4 h-4 text-event-watchdog" />
                    <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Review Queue</h2>
                    <span className="ml-auto bg-event-watchdog text-vulcan-950 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                        {reviewQueue.length}
                    </span>
                </div>
                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                    {reviewQueue.length === 0 ? (
                        <div className="text-[10px] font-mono text-vulcan-600 uppercase tracking-widest text-center mt-4">
                            Queue Empty
                        </div>
                    ) : (
                        reviewQueue.map(item => (
                            <div key={item.id} className="bg-vulcan-950 border-l-2 border-event-watchdog p-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-mono text-vulcan-400">
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="text-[8px] font-bold bg-vulcan-800 text-vulcan-100 px-1 uppercase">
                                        {item.status}
                                    </span>
                                </div>
                                <div className="text-xs text-vulcan-100 line-clamp-2">
                                    {item.reason}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
