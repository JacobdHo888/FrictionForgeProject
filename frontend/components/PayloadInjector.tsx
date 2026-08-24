import React, { useState } from 'react';
import { Send, RefreshCw, Radio } from 'lucide-react';

interface PayloadInjectorProps {
    onInject: (payload: string) => void;
    isProcessing: boolean;
}

const DEFAULT_PAYLOAD = `{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiAidGFza21hc3RlckBmcmljdGlvbmZvcmdlLmxvY2FsIiwgImhpc3RvcnlJZCI6ICI5ODc2NTQzMjEifQ==",
    "messageId": "1234567890",
    "publishTime": "2023-10-27T12:00:00.000Z"
  },
  "subscription": "projects/frictionforge-dev/subscriptions/gmail-push-sub"
}`;

export const PayloadInjector: React.FC<PayloadInjectorProps> = ({ onInject, isProcessing }) => {
    const [payload, setPayload] = useState(DEFAULT_PAYLOAD);

    const handleInject = () => {
        try {
            JSON.parse(payload);
            onInject(payload);
        } catch (e) {
            alert("Invalid JSON payload");
        }
    };

    return (
        <div className="flex flex-col h-full bg-vulcan-900 border-r border-vulcan-700">
            <div className="p-3 border-b border-vulcan-700 flex items-center space-x-2 bg-vulcan-800">
                <Radio className="w-4 h-4 text-event-action" />
                <h2 className="text-xs font-bold text-vulcan-100 tracking-widest uppercase">Signal Injector</h2>
            </div>
            
            <div className="flex-1 p-3 flex flex-col">
                <div className="mb-2 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-vulcan-400 uppercase tracking-widest">Raw Payload</span>
                    <button 
                        onClick={() => {
                            try { setPayload(JSON.stringify(JSON.parse(payload), null, 2)); } catch(e){}
                        }}
                        className="text-[10px] font-mono text-vulcan-600 hover:text-vulcan-100 uppercase"
                    >
                        [FMT]
                    </button>
                </div>
                <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    className="flex-1 w-full bg-vulcan-950 text-vulcan-100 font-mono text-[10px] p-2 border border-vulcan-700 focus:border-event-action outline-none resize-none"
                    spellCheck="false"
                />
            </div>
            
            <div className="p-3 border-t border-vulcan-700 bg-vulcan-800">
                <button
                    onClick={handleInject}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center space-x-2 py-2 border font-bold text-[10px] tracking-widest uppercase transition-all ${
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
