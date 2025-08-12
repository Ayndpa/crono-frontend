export interface Feed {
    id?: number; // Optional field
    name: string;
    url: string; // HttpUrl can be represented as a string in TypeScript
    is_active?: boolean;
}