export interface LLMProvider {
    level: 0 | 1 | 2 | 3;
    name: string;
    analyze(_prompt: string): Promise<string>;
}
export declare class NoLLMProvider implements LLMProvider {
    level: 0;
    name: string;
    analyze(): Promise<string>;
}
