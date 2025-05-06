import http from 'http';
import { sseTransform, transform } from '../src';

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const xform = sseTransform({ objectMode: true });
    xform.pipe(res);

    xform.write({ event: 'welcome', data: 'Connected to SSE server!' });

    let count = 0;
    const interval = setInterval(() => {
        xform.write({ id: count++, data: `Update ${count}: ${new Date().toISOString()}` });
        xform.write({ $comment: 'keep-alive' });
    }, 5000);

    req.on('close', () => {
        clearInterval(interval);
        xform.end();
    });
});

server.listen(8080, () => {
    console.log('SSE server running on http://localhost:8080');
});
