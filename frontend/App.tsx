import React, { useState, useCallback } from 'react';
import { PayloadInjector } from './components/PayloadInjector';
import { DispatchLog } from './components/DispatchLog';
import { ActiveShiftPanel } from './components/ActiveShiftPanel';
import { DispatchEvent } from './types';
import { simulateDispatchEvents } from './services/agentService';

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

    const handleInject = useCallback(async (payload: string) => {
        setIsProcessing(true);
        
        // 1. System logs the raw incoming webhook
        const interceptEvent: DispatchEvent = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            type: 'EMAIL_INTERCEPTED',
            agent: 'GMAIL_LISTENER',
            message: 'Inbound Pub/Sub push notification received.',
            payload: JSON.parse(payload)
        };
        setEvents(prev => [...prev, interceptEvent]);

        // 2. Call Gemini to simulate the rest of the agents reacting
        const simulatedEvents = await simulateDispatchEvents(payload);
        
        // 3. Play them back with a staggered delay to simulate real-time independent agents
        for (const evt of simulatedEvents) {
            // Random delay between 400ms and 1200ms
            const delay = Math.floor(Math.random() * 800) + 400;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            setEvents(prev => [...prev, {
                ...evt,
                timestamp: new Date().toISOString() // Update timestamp to actual playback time
            }]);
        }
        
        setIsProcessing(false);
    }, []);

    return (
        <div className="flex h-screen w-screen bg-vulcan-950 overflow-hidden">
            {/* Left Panel: Injector */}
            <div className="w-72 shrink-0 h-full z-10">
                <PayloadInjector onInject={handleInject} isProcessing={isProcessing} />
            </div>
            
            {/* Center Panel: Dispatch Log */}
            <div className="flex-1 h-full z-10 relative">
                <DispatchLog events={events} />
            </div>
            
            {/* Right Panel: Active Shift Status */}
            <div className="w-80 shrink-0 h-full z-10">
                <ActiveShiftPanel events={events} />
            </div>
        </div>
    );
};

export default App;
