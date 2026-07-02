export interface ILlmPort {
  summarize(prompt: string): Promise<string>;
}
