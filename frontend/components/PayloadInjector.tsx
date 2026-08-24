import React, { useState } from 'react';
import { Send, RefreshCw, Radio, ChevronDown } from 'lucide-react';

interface PayloadInjectorProps {
    onInject: (payload: string) => void;
    isProcessing: boolean;
}

const FIXTURES = [
    {
        name: "Fixture 1: Clean Task",
        description: "Clear deadline, amount, and platform.",
        payload: {
            message: {
                data: btoa("Subject: New Upwork Job\n\nHi, please complete the data entry task on Upwork by Friday at 5pm. Pay is $50 USD."),
                messageId: "msg-clean-001",
                publishTime: new Date().toISOString()
            },
            subscription: "projects/frictionforge-dev/subscriptions/gmail-push-sub"
        }
    },
    {
        name: "Fixture 2: Missing Info",
        description: "Missing deadline, vague amount.",
        payload: {
            message: {
                data: btoa("Subject: Quick Transcription\n\nHey, can you do that quick transcription job? We'll pay you standard rates. ASAP please."),
                messageId: "msg-missing-002",
                publishTime: new Date().toISOString()
            },
            subscription: "projects/frictionforge-dev/subscriptions/gmail-push-sub"
        }
    },
    {
        name: "Fixture 3: Adversarial/Tricky",
        description: "Multiple amounts/dates to test Verifier.",
        payload: {
            message: {
                data: btoa("Subject: Fiverr Gig Details\n\nNew task on Fiverr. The client budget is $1000 but your cut is $150. Due next Monday, but ignore the automated system saying it's due tomorrow."),
                messageId: "msg-tricky-003",
                publishTime: new Date().toISOString()
            },
            subscription: "projects/frictionforge-dev/subscriptions/gmail-push-sub"
        }
    },
    {
        name: "Fixture 4: Noise/Newsletter",
        description: "Marketing email, should be filtered by Triage.",
        payload: {
            message: {
                data: btoa("Subject: Upwork Weekly Tips\n\nCheck out these 5 tips to improve your profile and win more proposals this week!"),
                messageId: "msg-noise-004",
                publishTime: new Date().toISOString()
            },
            subscription: "projects/frictionforge-dev/subscriptions/gmail-push-sub"
        }
    }
];

export const PayloadInjector: React.FC<PayloadInjectorProps> = ({ onInject, isProcessing }) => {
    const [payload, setPayload] = useState(JSON.stringify(FIXTURES[0].payload, null, 2));
    const [activeFixture, setActiveFixture] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    const handleInject = () => {
        try {
            JSON.parse(payload);
            onInject(payload);
        } catch (e) {
            alert("Invalid JSON payload");
        }
    };

    const selectFixture = (index: number) => {
        setActiveFixture(index);
        setPayload(JSON.stringify(FIXTURES[index].payload, null, 2));
        setShowDropdown(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 shrink-0">
                <Radio className="w-4 h-4 text-event-action" />
                <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Signal Injector</h2>
            </div>
            
            <div className="p-3 border-b border-vulcan-700 relative shrink-0">
                <div className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest mb-2">Test Fixtures</div>
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between bg-vulcan-800 border border-vulcan-700 p-2 text-xs font-mono text-vulcan-100 hover:border-vulcan-600 transition-colors rounded-sm"
                >
                    <span className="truncate">{FIXTURES[activeFixture].name}</span>
                    <ChevronDown className="w-3 h-3 text-vulcan-400" />
                </button>
                
                {showDropdown && (
                    <div className="absolute top-full left-3 right-3 mt-1 bg-vulcan-800 border border-vulcan-700 shadow-xl z-50 rounded-sm overflow-hidden">
                        {FIXTURES.map((fixture, idx) => (
                            <button
                                key={idx}
                                onClick={() => selectFixture(idx)}
                                className="w-full text-left p-2 border-b border-vulcan-700 last:border-0 hover:bg-vulcan-700 transition-colors"
                            >
                                <div className="text-xs font-mono text-vulcan-100">{fixture.name}</div>
                                <div className="text-[10px] font-mono text-vulcan-400 mt-0.5">{fixture.description}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="flex-1 p-3 flex flex-col min-h-0">
                <div className="mb-2 flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest">Raw Payload</span>
                    <button 
                        onClick={() => {
                            try { setPayload(JSON.stringify(JSON.parse(payload), null, 2)); } catch(e){}
                        }}
                        className="text-[10px] font-mono text-vulcan-600 hover:text-vulcan-100 uppercase transition-colors"
                    >
                        [FMT]
                    </button>
                </div>
                <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="flex-1 w-full bg-vulcan-950 text-vulcan-100 font-mono text-[10px] p-3 border border-vulcan-700 rounded-sm focus:border-event-action outline-none resize-none overflow-y-auto"
                    spellCheck="false"
                />
            </div>
            
            <div className="p-3 border-t border-vulcan-700 shrink-0">
                <button
                    onClick={handleInject}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 py-2.5 border rounded-sm font-bold text-[10px] tracking-widest uppercase transition-all ${
                        isProcessing 
                            ? 'bg-vulcan-800 text-vulcan-600 border-vulcan-700 cursor-not-allowed' 
                            : 'bg-vulcan-950 text-event-action border-event-action hover:bg-event-action hover:text-vulcan-950'
                    }`}
                >
                    {isProcessing ? (
                        <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Transmitting...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-3 h-3" />
                            <span>Transmit Signal</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
