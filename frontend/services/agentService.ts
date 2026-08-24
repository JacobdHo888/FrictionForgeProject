import { GoogleGenAI, Type } from '@google/genai';
import { DispatchEvent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const simulateDispatchEvents = async (payload: string): Promise<DispatchEvent[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are simulating the event bus of the FrictionForge Taskmaster system.
            This system uses an event-sourced architecture. There is no central orchestrator. 
            Instead, independent agents listen to a central 'shift log' (Firestore) and react to events.
            
            A new webhook payload has arrived:
            ${payload}
            
            Generate a realistic sequence of events that would occur as the agents react to this payload.
            
            Typical flow:
            1. GMAIL_LISTENER emits EMAIL_INTERCEPTED.
            2. EXTRACTOR sees the intercept, processes it, and emits EXTRACTION_ATTEMPTED.
            3. VERIFIER sees the extraction, validates it, and emits VERIFICATION_RETURNED.
            4. LEDGER_CLERK sees the verification, updates the database, and emits LEDGER_UPDATED.
            5. (Optional) If something is missing or fails, WATCHDOG emits WATCHDOG_ESCALATION.
            
            Output the sequence as a JSON array of event objects.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: {
                                type: Type.STRING,
                                description: "Must be one of: EMAIL_INTERCEPTED, EXTRACTION_ATTEMPTED, VERIFICATION_RETURNED, LEDGER_UPDATED, ACTION_TAKEN, WATCHDOG_ESCALATION"
                            },
                            agent: {
                                type: Type.STRING,
                                description: "Must be one of: GMAIL_LISTENER, EXTRACTOR, VERIFIER, LEDGER_CLERK, DISPATCHER, WATCHDOG"
                            },
                            message: {
                                type: Type.STRING,
                                description: "A concise, technical log message describing the action taken."
                            },
                            payload: {
                                type: Type.STRING,
                                description: "Optional JSON string containing extracted data, verification results, or ledger updates."
                            }
                        },
                        required: ["type", "agent", "message"]
                    }
                }
            }
        });

        const jsonStr = response.text.trim();
        const parsedEvents = JSON.parse(jsonStr);
        
        return parsedEvents.map((evt: any) => ({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(), // Will be overridden during staggered playback
            type: evt.type,
            agent: evt.agent,
            message: evt.message,
            payload: evt.payload ? JSON.parse(evt.payload) : undefined
        }));

    } catch (error: any) {
        console.error("Error simulating dispatch events:", error);
        return [{
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            type: 'WATCHDOG_ESCALATION',
            agent: 'SYSTEM',
            message: `CRITICAL FAILURE IN EVENT BUS: ${error.message}`
        }];
    }
};
