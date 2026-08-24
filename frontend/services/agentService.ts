import { GoogleGenAI, Type } from '@google/genai';
import { DispatchEvent, TaskDocument } from '../types';
import { LedgerTool } from './ledgerTool';
import { CalendarTool } from './calendarTool';
import { DraftComposerTool } from './draftComposerTool';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const generateId = () => Math.random().toString(36).substring(2, 10);

export const simulateDispatchEvents = async (payload: string): Promise<DispatchEvent[]> => {
    const trace_id = `trace-${generateId()}`;
    const task_id = `task-${generateId()}`;
    const processedEvents: DispatchEvent[] = [];
    
    const addEvent = (event: Partial<DispatchEvent>) => {
        processedEvents.push({
            id: `evt-${generateId()}`,
            timestamp: new Date().toISOString(),
            trace_id,
            task_id,
            ...event
        } as DispatchEvent);
    };

    try {
        // --- STAGE 1: INGEST ---
        const ingestSpanId = `span-${generateId()}`;
        const ingestStart = Date.now();
        addEvent({
            type: 'EMAIL_INTERCEPTED',
            agent: 'GMAIL_LISTENER',
            message: 'Inbound Pub/Sub push notification received.',
            span_id: ingestSpanId,
            duration_ms: Date.now() - ingestStart,
            payload: JSON.parse(payload)
        });

        // --- STAGE 1.5: TRIAGE FILTER (Gemma Simulation) ---
        // This acts as a lightweight first-pass filter to drop newsletters/noise
        // before spending a heavier Gemini 3.5 call on extraction.
        const triageSpanId = `span-${generateId()}`;
        const triageStart = Date.now();
        
        const triageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Simulating a lightweight Gemma model for cost-control
            contents: `You are a lightweight first-pass filter.
            Determine if this email payload is a legitimate task assignment/gig notification, or just noise/newsletter/rejection.
            Payload: ${payload}
            Return JSON with a boolean 'is_task' and a short 'reason'.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        is_task: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING }
                    }
                }
            }
        });
        
        const triageResult = JSON.parse(triageResponse.text.trim());
        const triageDuration = Date.now() - triageStart;

        if (!triageResult.is_task) {
            addEvent({
                type: 'TRIAGE_REJECTED',
                agent: 'TRIAGE_FILTER',
                message: `Filtered out as noise: ${triageResult.reason}`,
                span_id: triageSpanId,
                parent_span_id: ingestSpanId,
                duration_ms: triageDuration,
                payload: triageResult
            });
            return processedEvents; // Halt processing, saving downstream costs
        }

        addEvent({
            type: 'TRIAGE_PASSED',
            agent: 'TRIAGE_FILTER',
            message: `Identified as potential task: ${triageResult.reason}`,
            span_id: triageSpanId,
            parent_span_id: ingestSpanId,
            duration_ms: triageDuration,
            payload: triageResult
        });

        // --- STAGE 2: EXTRACT & VERIFY (via Gemini) ---
        const aiStart = Date.now();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this webhook payload: ${payload}
            
            1. EXTRACT: task_type, platform, deadline, pay_amount (number), pay_currency.
            2. VERIFY: Adversarially check the extraction against the raw email text. Return verdict (CONFIRMED, NEEDS_REVIEW, REJECTED) and reason.
            
            Output JSON.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        extraction: {
                            type: Type.OBJECT,
                            properties: {
                                task_type: { type: Type.STRING },
                                platform: { type: Type.STRING },
                                deadline: { type: Type.STRING },
                                pay_amount: { type: Type.NUMBER },
                                pay_currency: { type: Type.STRING }
                            }
                        },
                        verification: {
                            type: Type.OBJECT,
                            properties: {
                                verdict: { type: Type.STRING },
                                reason: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });
        
        const aiResult = JSON.parse(response.text.trim());
        const aiDuration = Date.now() - aiStart;

        // Log Extraction Span
        const extractSpanId = `span-${generateId()}`;
        addEvent({
            type: 'EXTRACTION_ATTEMPTED',
            agent: 'EXTRACTOR',
            message: 'Extracted entities from raw email payload.',
            span_id: extractSpanId,
            parent_span_id: triageSpanId,
            duration_ms: Math.floor(aiDuration * 0.4), // Simulate split time
            payload: aiResult.extraction
        });

        // Log Verification Span
        const verifySpanId = `span-${generateId()}`;
        addEvent({
            type: 'VERIFICATION_RETURNED',
            agent: 'VERIFIER',
            message: `Verification complete. Verdict: ${aiResult.verification.verdict}`,
            span_id: verifySpanId,
            parent_span_id: extractSpanId,
            duration_ms: Math.floor(aiDuration * 0.6),
            payload: aiResult.verification
        });

        // --- BRANCHING LOGIC ---
        if (aiResult.verification.verdict !== 'CONFIRMED') {
            addEvent({
                type: 'WATCHDOG_ESCALATION',
                agent: 'WATCHDOG',
                message: `Task flagged for manual review: ${aiResult.verification.reason}`,
                span_id: `span-${generateId()}`,
                parent_span_id: verifySpanId,
                duration_ms: 15
            });
            return processedEvents; // Stop processing this task
        }

        // --- STAGE 3: LEDGER WRITE ---
        let currentTask: TaskDocument;
        const ledgerSpanId = `span-${generateId()}`;
        const ledgerStart = Date.now();
        try {
            currentTask = {
                task_id: task_id,
                platform: aiResult.extraction.platform || 'Unknown',
                task_type: aiResult.extraction.task_type || 'Unknown',
                deadline: aiResult.extraction.deadline || new Date().toISOString(),
                pay_amount: Number(aiResult.extraction.pay_amount) || 0,
                pay_currency: aiResult.extraction.pay_currency || 'USD',
                status: 'CONFIRMED',
                email_id: 'simulated-email-id',
                verifier_verdict: 'CONFIRMED',
                created_at: new Date().toISOString()
            };
            await LedgerTool.recordConfirmedTask(currentTask);
            const totals = await LedgerTool.reconcile();
            
            addEvent({
                type: 'LEDGER_UPDATED',
                agent: 'LEDGER_CLERK',
                message: `Task ${task_id} committed to Firestore ledger.`,
                span_id: ledgerSpanId,
                parent_span_id: verifySpanId,
                duration_ms: Date.now() - ledgerStart,
                payload: { reconciled_totals: totals }
            });
        } catch (e: any) {
            addEvent({
                type: 'ACTION_FAILED',
                agent: 'LEDGER_CLERK',
                message: `Ledger transaction failed: ${e.message}`,
                span_id: ledgerSpanId,
                parent_span_id: verifySpanId,
                duration_ms: Date.now() - ledgerStart,
                payload: { error: e.message }
            });
            return processedEvents; // Cannot proceed without ledger commit
        }

        // --- STAGE 4: CALENDAR SYNC ---
        const calSpanId = `span-${generateId()}`;
        const calStart = Date.now();
        try {
            const calResult = await CalendarTool.createEvent(currentTask);
            addEvent({
                type: 'CALENDAR_EVENT_CREATED',
                agent: 'CALENDAR_TOOL',
                message: 'Calendar event scheduled 2 hours prior to deadline.',
                span_id: calSpanId,
                parent_span_id: ledgerSpanId,
                duration_ms: Date.now() - calStart,
                payload: calResult
            });
        } catch (e: any) {
            await LedgerTool.updateTaskStatus(task_id, 'ACTION_FAILED');
            addEvent({
                type: 'ACTION_FAILED',
                agent: 'CALENDAR_TOOL',
                message: `Calendar sync failed after retries: ${e.message}`,
                span_id: calSpanId,
                parent_span_id: ledgerSpanId,
                duration_ms: Date.now() - calStart,
                payload: { error: e.message }
            });
            // Continue processing despite calendar failure (Hardened Orchestrator)
        }

        // --- STAGE 5: DRAFT COMPOSER ---
        const draftSpanId = `span-${generateId()}`;
        const draftStart = Date.now();
        try {
            const draftResult = await DraftComposerTool.composeDraft(currentTask);
            addEvent({
                type: 'DRAFT_COMPOSED',
                agent: 'DRAFT_COMPOSER',
                message: 'Acknowledgment draft created in Gmail.',
                span_id: draftSpanId,
                parent_span_id: ledgerSpanId, // Parallel to Calendar conceptually
                duration_ms: Date.now() - draftStart,
                payload: draftResult
            });
        } catch (e: any) {
            await LedgerTool.updateTaskStatus(task_id, 'ACTION_FAILED');
            addEvent({
                type: 'ACTION_FAILED',
                agent: 'DRAFT_COMPOSER',
                message: `Draft composition failed after retries: ${e.message}`,
                span_id: draftSpanId,
                parent_span_id: ledgerSpanId,
                duration_ms: Date.now() - draftStart,
                payload: { error: e.message }
            });
        }

        return processedEvents;

    } catch (error: any) {
        console.error("Critical pipeline failure:", error);
        addEvent({
            type: 'WATCHDOG_ESCALATION',
            agent: 'SYSTEM',
            message: `UNHANDLED PIPELINE EXCEPTION: ${error.message}`,
            span_id: `span-${generateId()}`
        });
        return processedEvents;
    }
};
