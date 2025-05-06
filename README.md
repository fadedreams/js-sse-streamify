## js-sse-streamify
A modern Node.js library to transform JavaScript objects or JSON streams into Server-Sent Events (SSE) format.

### Installation
```sh
npm install js-sse-streamify
```
### Features

- Converts JavaScript objects or JSON streams to SSE format.
- Supports id, event, data, retry, and $comment fields.
- Handles multiline data fields and non-string values.
- Provides a Transform stream for both JSON and object modes.
- Supports custom field mapping for non-standard fields.
- TypeScript support with type definitions.

### Usage
#### Default Mode (JSON Stream)
```javascript 
import { sseTransform } from 'js-sse-streamify';
import { Transform } from 'stream';

const xform = sseTransform();
xform.pipe(process.stdout);
xform.write('{"data":"foo"}\n');
xform.write('{"id":123,"data":"bar"}\n');
xform.end();
```

#### Output:
```javascript 
data:foo

id:123
data:bar
```
### Object Mode
```javascript 
import { sseTransform } from 'js-sse-streamify';
import { Transform } from 'stream';

const xform = sseTransform({ objectMode: true });
xform.pipe(process.stdout);
xform.write({ data: 'foo' });
xform.write({ id: 123, event: 'update', data: 'bar\nbaz' });
xform.end();
```

#### Output:
```javascript 
data:foo

id:123
event:update
data:bar
data:baz
```
### Custom Field Mapping
Map non-standard fields to SSE fields or transform their values:
```javascript
import { sseTransform } from 'js-sse-streamify';
import { Transform } from 'stream';

const xform = sseTransform({
  objectMode: true,
  fieldMap: {
    message: 'data', // Rename 'message' to 'data'
    timestamp: (value) => new Date(value).toISOString() // Transform timestamp
  }
});
xform.pipe(process.stdout);
xform.write({ message: 'Hello', timestamp: '2025-05-06T12:00:00Z' });
xform.end();
```
#### Output:
```javascript 
data:Hello
timestamp:2025-05-06T12:00:00.000Z
```

### Example: HTTP Server
```javascript 
import http from 'http';
import { sseTransform, transform } from 'js-sse-streamify';

http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(transform({ event: 'welcome', data: 'Connected!' }));

  setInterval(() => {
    res.write(transform({ $comment: 'keep-alive' }));
  }, 15000);
}).listen(8080);
```
### Client-Side Example
```javascript 
const source = new EventSource('http://localhost:8080');
source.onmessage = (e) => console.log(e.data);
source.addEventListener('welcome', (e) => console.log('Welcome:', e.data));
```
#### API
parse(str: string): ParseResult
Parses a JSON string into a JavaScript object.
- transform(data: SSEData): string
Transforms a JavaScript object into SSE format.
- sseTransform(options?: { objectMode?: boolean }): Transform
Creates a Transform stream to convert JSON or objects to SSE.
- sseTransform(options?: { objectMode?: boolean, fieldMap?: FieldMap }): Transform
Creates a Transform stream to convert JSON or objects to SSE. Supports fieldMap for custom fields.
#### Supported Fields

- id: Event identifier (string or number).
- event: Event type (string).
- data: Event data (string or any JSON-serializable value).
- retry: Reconnection time in milliseconds (integer).
- $comment: Comment for keep-alives (string).
- Custom fields via fieldMap (e.g., priority, timestamp).
License
MIT
