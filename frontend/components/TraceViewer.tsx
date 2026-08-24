import React from 'react';
import { DispatchEvent } from '../types';
import { X, Activity, Clock } from 'lucide-react';

interface TraceViewerProps {
    traceId: string;
    events: DispatchEvent[];
    onClose: () => void;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({ traceId, events, onClose }) => {
    const traceEvents = events.filter(e => e.trace_id === traceId);
    
    if (traceEvents.length === 0) return null;

    const taskId = traceEvents[0].task_id;
    const totalDuration = traceEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0);

    return (
        <div className="absolute inset-0 z-50 bg-vulcan-950/90 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-vulcan-900 border border-vulcan-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-vulcan-700 flex justify-between items-center bg-vulcan-950">
                    <div className="flex items-center space-x-4">
                        <Activity className="w-5 h-5 text-event-action" />
                        <div>
                            <h2 className="text-sm font-bold text-vulcan-100 tracking-widest uppercase">Cloud Trace Viewer</h2>
                            <div className="flex space-x-4 text-[10px] font-mono text-vulcan-400 mt-1">
                                <span>TRACE: {traceId}</span>
                                <span>TASK: {taskId}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-vulcan-400 hover:text-vulcan-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Waterfall Chart */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-mono text-vulcan-500 border-b border-vulcan-800 pb-2 mb-4">
                        <span className="w-48">SPAN / AGENT</span>
                        <span className="flex-1">EXECUTION TIMELINE</span>
                        <span className="w-24 text-right flex items-center justify-end space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{totalDuration}ms</span>
                        </span>
                    </div>

                    {traceEvents.map((evt, index) => {
                        // Calculate relative width for the waterfall bar
                        const widthPercent = Math.max(((evt.duration_ms || 10) / totalDuration) * 100, 2);
                        
                        // Determine color based on status
                        let barColor = 'bg-vulcan-600';
                        if (evt.type === 'ACTION_FAILED' || evt.type === 'WATCHDOG_ESCALATION') barColor = 'bg-event-watchdog';
                        else if (evt.type === 'VERIFICATION_RETURNED') barColor = 'bg-event-verify';
                        else if (evt.type === 'EXTRACTION_ATTEMPTED') barColor = 'bg-event-extract';
                        else if (evt.type === 'LEDGER_UPDATED') barColor = 'bg-event-ledger';
                        else if (evt.type === 'CALENDAR_EVENT_CREATED' || evt.type === 'DRAFT_COMPOSED') barColor = 'bg-event-action';
                        else if (evt.type === 'TRIAGE_PASSED') barColor = 'bg-emerald-500';
                        else if (evt.type === 'TRIAGE_REJECTED') barColor = 'bg-vulcan-500';

                        return (
                            <div key={evt.id} className="flex items-center text-xs font-mono group">
                                <div className="w-48 shrink-0 pr-4">
                                    <div className="text-vulcan-100 truncate">{evt.agent}</div>
                                    <div className="text-[9px] text-vulcan-500 truncate">{evt.span_id}</div>
                                </div>
                                
                                <div className="flex-1 relative h-6 bg-vulcan-950 rounded overflow-hidden flex items-center">
                                    {/* Simulated staggered start based on index for visual waterfall effect */}
                                    <div 
                                        className={`h-full ${barColor} opacity-80 group-hover:opacity-100 transition-opacity`}
                                        style={{ 
                                            width: `${widthPercent}%`,
                                            marginLeft: `${(index / traceEvents.length) * 50}%` 
                                        }}
                                    />
                                </div>
                                
                                <div className="w-24 shrink-0 text-right text-vulcan-400">
                                    {evt.duration_ms}ms
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
