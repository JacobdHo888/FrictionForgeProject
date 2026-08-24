export type EventType = 
    | 'SYS_INIT' 
    | 'EMAIL_INTERCEPTED' 
    | 'EXTRACTION_ATTEMPTED' 
    | 'VERIFICATION_RETURNED' 
    | 'LEDGER_UPDATED' 
    | 'ACTION_TAKEN' 
    | 'WATCHDOG_ESCALATION';

export type AgentType = 
    | 'SYSTEM' 
    | 'GMAIL_LISTENER' 
    | 'EXTRACTOR' 
    | 'VERIFIER' 
    | 'LEDGER_CLERK' 
    | 'DISPATCHER' 
    | 'WATCHDOG';

export interface DispatchEvent {
    id: string;
    timestamp: string;
    type: EventType;
    agent: AgentType;
    message: string;
    payload?: any;
}

export interface LedgerTotal {
    category: string;
    count: number;
    value: number;
}

export interface ReviewQueueItem {
    id: string;
    timestamp: string;
    reason: string;
    status: 'PENDING' | 'RESOLVED';
}
