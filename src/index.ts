import { Transform, TransformCallback } from 'stream';
import { SSEData, ParseResult, FieldMap, SSETransformOptions } from './types';

const SSE_FIELDS = ['id', 'event', 'data', 'retry', '$comment'] as const;

/**
 * Parses a JSON string into a JavaScript object.
 * @param str - JSON string to parse
 * @returns ParseResult with the parsed data or error
 */
export function parse(str: string): ParseResult {
    try {
        const data = JSON.parse(str) as SSEData;
        return { error: null, data };
    } catch (err) {
        return { error: err instanceof Error ? err : new Error('Unknown error'), data: undefined };
    }
}

/**
 * Transforms a JavaScript object into Server-Sent Events (SSE) format.
 * @param data - Object containing SSE fields
 * @param fieldMap - Optional mapping for custom fields
 * @returns SSE-formatted string
 */
export function transform(data: SSEData, fieldMap: FieldMap = {}): string {
    let result = '';

    // Process standard SSE fields
    for (const field of SSE_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(data, field)) continue;

        let value = data[field];
        const fieldName = field === '$comment' ? '' : field;

        // Validate retry field (must be an integer)
        if (field === 'retry') {
            if (!Number.isInteger(value)) {
                continue; // Ignore non-integer retry values
            }
            value = String(value);
        }

        if (typeof value === 'string') {
            // Split on newlines (\r\n, \r, or \n)
            const segments = value.split(/\r\n|\r|\n/);
            if (!fieldName || fieldName === 'data') {
                // For data or comments, include all segments
                for (const segment of segments) {
                    result += `${fieldName}:${segment}\n`;
                }
            } else {
                // For id, event, retry, use only the first segment
                result += `${fieldName}:${segments[0]}\n`;
            }
        } else {
            // Non-string values are JSON-stringified
            result += `${fieldName}:${JSON.stringify(value)}\n`;
        }
    }

    // Process custom fields via fieldMap
    for (const [inputField, mapping] of Object.entries(fieldMap)) {
        if (!Object.prototype.hasOwnProperty.call(data, inputField) || SSE_FIELDS.includes(inputField as any)) continue;

        const value = data[inputField];
        const fieldName = typeof mapping === 'string' ? mapping : inputField;
        const outputValue = typeof mapping === 'function' ? mapping(value) : value;

        if (typeof outputValue === 'string') {
            const segments = outputValue.split(/\r\n|\r|\n/);
            for (const segment of segments) {
                result += `${fieldName}:${segment}\n`;
            }
        } else {
            result += `${fieldName}:${JSON.stringify(outputValue)}\n`;
        }
    }

    return result ? `${result}\n` : '';
}

/**
 * Creates a Transform stream to convert JSON or objects to SSE format.
 * @param options - Stream options, including objectMode and fieldMap
 * @returns Transform stream
 */
export function sseTransform(options: SSETransformOptions = {}): Transform {
    return new Transform({
        objectMode: options.objectMode ?? false,
        transform(chunk: any, encoding: string, callback: TransformCallback) {
            try {
                let data: SSEData;
                if (options.objectMode) {
                    data = chunk as SSEData;
                } else {
                    const result = parse(chunk.toString());
                    if (result.error) {
                        callback(result.error);
                        return;
                    }
                    data = result.data!;
                }

                const output = transform(data, options.fieldMap);
                callback(null, output);
            } catch (err) {
                callback(err instanceof Error ? err : new Error('Unknown error'));
            }
        }
    });
}
