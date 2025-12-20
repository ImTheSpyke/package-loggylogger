import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// Track file paths where loggers have been created (unique set)
const logFiles = new Set<string>()

// Track the configured basePath
let configuredBasePath: string | null = null

export function addLogFile(filePath: string) {
    logFiles.add(filePath)
}

export function getLogFiles(): string[] {
    return Array.from(logFiles)
}

export function setBasePath(basePath: string | undefined) {
    configuredBasePath = basePath ?? null
}

export function getBasePath(): string | null {
    return configuredBasePath
}

const MIME: Record<string, string> = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
}

function serveFile(res: ServerResponse, path: string) {
    try {
        const ext = path.substring(path.lastIndexOf('.'))
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' })
        res.end(readFileSync(join(publicDir, path)))
    } catch {
        res.writeHead(404)
        res.end('Not Found')
    }
}

export interface DashboardServer {
    server: Server
    wss: WebSocketServer
    broadcast: (type: string, callLine: string, date: Date, args: unknown[], boundData?: unknown) => void
    close: () => void
}

export function startServer(port = 11000): DashboardServer {
    const clients = new Set<WebSocket>()

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = req.url || '/'
        if (url === '/' || url === '/index.html') return serveFile(res, 'index.html')
        if (url.startsWith('/assets/')) return serveFile(res, url)
        if (url === '/api') { res.writeHead(200); res.end('OK'); return }
        if (url === '/api/logFiles') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ files: getLogFiles(), basePath: getBasePath() }))
            return
        }
        res.writeHead(404); res.end('Not Found')
    })

    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws) => {
        clients.add(ws)
        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg.toString())
                if (data.type === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: data.timestamp, server: new Date().toISOString() }))
            } catch {}
        })
        ws.on('close', () => clients.delete(ws))
        ws.on('error', () => clients.delete(ws))
    })

    const broadcast = (type: string, callLine: string, date: Date, args: unknown[], boundData?: unknown) => {
        const msg = JSON.stringify({ type, callLine, date: date.toISOString(), argList: args, boundDatas: boundData ?? {} },
            (_k, v) => typeof v === 'bigint' ? { _type: 'bigint', _value: v.toString() } : v)
        clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg) })
    }

    server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.warn(`[LoggyLogger] Dashboard server started at http://127.0.0.1:${actualPort}`);
    })

    return {
        server, wss, broadcast,
        close: () => { clients.forEach(c => c.close()); server.close() }
    }
}
