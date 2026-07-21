export interface EntityNode {
    id: string;
    type: string;
    name: string;
    relationships: Array<{
        target: string;
        type: string;
    }>;
}
export declare function buildEntityGraph(): EntityNode[];
