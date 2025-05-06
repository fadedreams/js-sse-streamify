import { parse, transform, sseTransform } from '../src';
import { Transform } from 'stream';

describe('jsSSEStreamify', () => {
    describe('parse', () => {
        it('parses valid JSON', () => {
            const result = parse('{"data":"foo"}');
            expect(result.error).toBeNull();
            expect(result.data).toEqual({ data: 'foo' });
        });

        it('handles invalid JSON', () => {
            const result = parse('invalid');
            expect(result.error).toBeInstanceOf(Error);
            expect(result.data).toBeUndefined();
        });
    });

    describe('transform', () => {
        it('transforms simple data', () => {
            const output = transform({ data: 'foo' });
            expect(output).toBe('data:foo\n\n');
        });

        it('handles multiline data', () => {
            const output = transform({ data: 'foo\nbar' });
            expect(output).toBe('data:foo\ndata:bar\n\n');
        });

        it('handles non-string data', () => {
            const output = transform({ data: { foo: true } });
            expect(output).toBe('data:{"foo":true}\n\n');
        });

        it('handles event and id', () => {
            const output = transform({ id: 123, event: 'update', data: 'test' });
            expect(output).toBe('id:123\nevent:update\ndata:test\n\n');
        });

        it('handles comments', () => {
            const output = transform({ $comment: 'keep-alive' });
            expect(output).toBe(':keep-alive\n\n');
        });

        it('ignores invalid retry', () => {
            const output = transform({ retry: 'invalid' as any, data: 'test' });
            expect(output).toBe('data:test\n\n');
        });

        it('handles custom field renaming', () => {
            const output = transform(
                { message: 'test', priority: 'high' },
                { message: 'data', priority: 'priority' }
            );
            expect(output).toBe('data:test\npriority:high\n\n');
        });

        it('handles custom field transformation', () => {
            const output = transform(
                { timestamp: new Date('2025-05-06T12:00:00Z') },
                { timestamp: (value: Date) => value.toISOString() }
            );
            expect(output).toBe('timestamp:2025-05-06T12:00:00.000Z\n\n');
        });

        it('ignores custom fields not in fieldMap', () => {
            const output = transform({ unknown: 'value' }, {});
            expect(output).toBe('');
        });
    });

    describe('sseTransform stream', () => {
        it('processes JSON in default mode', (done) => {
            const stream = sseTransform();
            let output = '';
            stream.on('data', (chunk) => {
                output += chunk.toString();
            });
            stream.on('end', () => {
                expect(output).toBe('data:foo\n\n');
                done();
            });
            stream.write('{"data":"foo"}');
            stream.end();
        });

        it('processes objects in objectMode', (done) => {
            const stream = sseTransform({ objectMode: true });
            let output = '';
            stream.on('data', (chunk) => {
                output += chunk.toString();
            });
            stream.on('end', () => {
                expect(output).toBe('data:foo\n\n');
                done();
            });
            stream.write({ data: 'foo' });
            stream.end();
        });

        it('emits error for invalid JSON', (done) => {
            const stream = sseTransform();
            stream.on('error', (err) => {
                expect(err).toBeInstanceOf(Error);
                done();
            });
            stream.write('invalid');
        });

        it('processes custom fields in objectMode', (done) => {
            const stream = sseTransform({
                objectMode: true,
                fieldMap: { message: 'data', priority: 'priority' }
            });
            let output = '';
            stream.on('data', (chunk) => {
                output += chunk.toString();
            });
            stream.on('end', () => {
                expect(output).toBe('data:test\npriority:high\n\n');
                done();
            });
            stream.write({ message: 'test', priority: 'high' });
            stream.end();
        });
    });
});
