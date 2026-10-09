export const STATUSES = [['new', 'New'], ['contacted', 'Contacted'], ['in_discussion', 'In discussion'], ['proposal_sent', 'Proposal sent'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['archived', 'Archived']] as const;
export const statusLabel = (v: string) => STATUSES.find((s) => s[0] === v)?.[1] ?? v;
