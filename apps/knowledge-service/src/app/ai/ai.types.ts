export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}
export interface LlmProvider { complete(messages: readonly ChatMessage[]): Promise<string>; }
export interface AskSource { path: string; url: string; relevance: number; }
export interface AskResult { answer: string; sources: AskSource[]; }
