export interface SSEData {
    id?: string | number;
    event?: string;
    data?: string | unknown;
    retry?: number;
    $comment?: string;
    [key: string]: any; // Allow arbitrary fields for custom mapping
}

export interface ParseResult {
    error: Error | null;
    data: SSEData | undefined;
}

export interface FieldMap {
    [key: string]: string | ((value: any) => string);
}

export interface SSETransformOptions {
    objectMode?: boolean;
    fieldMap?: FieldMap;
}
