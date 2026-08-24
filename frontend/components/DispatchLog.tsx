import React, { useEffect, useRef } from 'react';
import { DispatchEvent, EventType } from '../types';

interface DispatchLogProps {
    events: DispatchEvent[];
}

export const DispatchLog: React.FC<DispatchLogProps> = ({ events }) => {
    const endOfLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    const getEventColor = (type: EventType) => {
        switch (type) {
            case 'SYS_INIT': return 'text-event-sys';
            case 'EMAIL_INTERCEPTED': return 'text-event-intercept';
            case 'EXTRACTION_ATTEMPTED': return 'text-event-extract';
            case 'VERIFICATION_RETURNED': return 'text-event-verify';
            case 'LEDGER_UPDATED': return 'text-event-ledger';
            case 'ACTION_TAKEN': return 'text-event-action';
            case 'WATCHDOG_ESCALATION': return 'text-event-watchdog';
            default: return 'text-vulcan-400';
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-vulcan-950 font-mono text-xs overflow-hidden">
            <div className="px-4 py-2 border-b border-vulcan-700 bg-vulcan-900 flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-widest uppercase text-vulcan-400">Shift Log // Active</span>
                <span className="text-[10px] tracking-widest text-vulcan-600">FIRESTORE_SYNC: OK</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {events.map((evt) => (
                    <div key={evt.id} className="flex flex-col group hover:bg-vulcan-900/50 py-1 px-2 -mx-2 rounded">
                        <div className="flex items-start space-x-3">
                            <span className="text-vulcan-600 shrink-0 select-none">
                                [{formatTime(evt.timestamp)}]
                            </span>
                            <span className="text-vulcan-400 shrink-0 w-32 truncate">
                                {evt.agent}
                            </span>
                            <span className={`shrink-0 w-48 font-bold ${getEventColor(evt.type)}`}>
                                {evt.type}
                            </span>
                            <span className="text-vulcan-100 flex-1">
                                > {evt.message}
                            </span>
                        </div>
                        {evt.payload && (
                            <div className="ml-[14.5rem] mt-1 text-[10px] text-vulcan-500 border-l border-vulcan-700 pl-3 py-1">
                                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(evt.payload, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={endOfLogRef} className="h-8 flex items-center space-x-2 text-vulcan-600 px-2">
                    <span className="animate-pulse">█</span>
                </div>
            </div>
        </div>
    );
};
