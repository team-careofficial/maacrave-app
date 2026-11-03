import type { TicketStatus } from './types';

export const TICKET_LABEL: Record<TicketStatus, string> = { OPEN: 'Waiting for reply', ANSWERED: 'Replied', CLOSED: 'Closed' };
export const TICKET_TONE: Record<TicketStatus, 'warn' | 'ok' | 'neutral'> = { OPEN: 'warn', ANSWERED: 'ok', CLOSED: 'neutral' };
