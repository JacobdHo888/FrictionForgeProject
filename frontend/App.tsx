import React, { useState, useCallback } from 'react';
import { PayloadInjector } from './components/PayloadInjector';
import { DispatchLog } from './components/DispatchLog';
import { Dashboard } from './components/Dashboard';
import { ActiveShiftPanel } from './components/ActiveShiftPanel';
import { TraceViewer } from './components/TraceViewer';
import { DispatchEvent } from './types';
import { simulateDispatchEvents } from './services/agentService';
import { runDailyDigest } from './services/digestAgent';

const App: React.FC = () => {
    const [events, setEvents] = useState<DispatchEvent[]>([
        {
            id: 'init-1',
            timestamp: new Date().toISOString(),
            type: 'SYS_INIT',
            agent: 'SYSTEM',
            message: 'FrictionForge Dispatch Console initialized. Listening to shift log...'
        }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [centerView, setCenterView] = useState<'LOG' | 'DASHBOARD'>('LOG');

    const handleInject = useCallback(async (payload: string) => {
        setIsProcessing(true);
        
        const simulatedEvents = await simulateDispatchEvents(payload);
        
        // Play them back with a staggered delay to simulate real-time independent agents
        for (const evt of simulatedEvents) {
            const delay = Math.floor(Math.random() * 600) + 200;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            setEvents(prev => [...prev, {
                ...evt,
                timestamp: new Date().toISOString()
            }]);
        }
        
        setIsProcessing(false);
    }, []);

    const handleRunDigest = useCallback(async () => {
        const digestEvent = await runDailyDigest();
        setEvents(prev => [...prev, digestEvent]);
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden relative">
            
            {/* Trace Viewer Modal Overlay */}
            {selectedTraceId && (
                <TraceViewer 
                    traceId={selectedTraceId} 
                    events={events} 
                    onClose={() => setSelectedTraceId(null)} 
                />
            )}

            {/* Bounded Application Container */}
            <div className="flex w-full max-w-[1440px] h-full max-h-[900px] bg-vulcan-950 border border-vulcan-700 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden relative z-10">
                
                {/* Left Panel: Injector */}
                <div className="w-72 shrink-0 h-full border-r border-vulcan-700 bg-vulcan-900">
                    <PayloadInjector onInject={handleInject} isProcessing={isProcessing} />
                </div>
                
                {/* Center Panel: Dispatch Log / Dashboard */}
                <div className="flex-1 h-full relative bg-vulcan-950 min-w-0 flex flex-col">
                    {/* Tab Header */}
                    <div className="flex border-b border-vulcan-700 bg-vulcan-900 shrink-0">
                        <button 
                            onClick={() => setCenterView('LOG')}
                            className={`px-6 py-3 text-xs font-bold tracking-widest uppercase border-r border-vulcan-700 transition-colors ${centerView === 'LOG' ? 'bg-vulcan-950 text-event-action' : 'text-vulcan-500 hover:text-vulcan-300'}`}
                        >
                            Shift Log
                        </button>
                        <button 
                            onClick={() => setCenterView('DASHBOARD')}
                            className={`px-6 py-3 text-xs font-bold tracking-widest uppercase border-r border-vulcan-700 transition-colors ${centerView === 'DASHBOARD' ? 'bg-vulcan-950 text-event-action' : 'text-vulcan-500 hover:text-vulcan-300'}`}
                        >
                            Telemetry
                        </button>
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {centerView === 'LOG' ? (
                            <DispatchLog events={events} onOpenTrace={setSelectedTraceId} />
                        ) : (
                            <Dashboard events={events} />
                        )}
                    </div>
                </div>
                
                {/* Right Panel: Active Shift Status */}
                <div className="w-80 shrink-0 h-full border-l border-vulcan-700 bg-vulcan-900">
                    <ActiveShiftPanel events={events} onRunDigest={handleRunDigest} />
                </div>
                
            </div>
        </div>
    );
};

export default App;
