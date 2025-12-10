import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { JSONBigInt } from './Utils/JSONBigInt.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Start Express server and WebSocket server
 * @param port - Port number for the servers (default: 3000)
 * @returns Object containing the Express app, HTTP server, and WebSocket server
 */
export function startServer(port: number = 3000) {
    const app = express()
    const server = createServer(app)


    function getFile(relativePath: string) {
        return join(__dirname, '..', 'public', relativePath)
    }

    // Serve static files from ./public/index.html
    app.get('/', (_req, res) => {
        res.sendFile(getFile('./index.html'))
    })

    // Express route: serve "Hello world" on "/api"
    app.get('/api', (_req, res) => {
        res.send('Hello world')
    })
    app.get('/api/logFiles', (_req, res) => {
        let list = [
            "c:\\Users\\user\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
            "c:\\Users\\user\\AppData\\Local\\Programs\\Microsoft VS Code\\CodeUtil.exe",
            ".\\Workspace\\Code.exe",
            ".\\Workspace\\dir1\\file1.txt",
            ".\\Workspace\\dir1\\file2.txt",
            ".\\Workspace\\dir1\\file3.txt",
            ".\\Workspace\\dir2\\file1.txt",
        ]
        res.send(list)
    })
    app.get(/^\/assets\/.*/, (req, res) => {
        console.log("/assets called with:", req.path)
        res.sendFile(getFile(req.path))
    })

    // WebSocket server
    const wss = new WebSocketServer({ server })

    // Store all connected clients
    const clients = new Set<any>()

    wss.on('connection', (ws) => {
        console.log('WebSocket client connected')
        clients.add(ws)

        ws.on('message', (message) => {
            console.log('Received:', message.toString())
            try {
                let json_msg = JSON.parse(message.toString())
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: json_msg.timestamp,
                    server: (new Date()).toISOString()
                }))
            } catch (error) {
                console.error('Error parsing message:', error)
            }
        })

        ws.on('close', () => {
            console.log('WebSocket client disconnected')
            clients.delete(ws)
        })

        ws.on('error', (error) => {
            console.error('WebSocket error:', error)
            clients.delete(ws)
        })
    })

    function sendDataToClients(datas: any) {
        const message = JSONBigInt.stringify(datas)
        
        clients.forEach((client) => {
            if (client.readyState === 1) { // WebSocket.OPEN
                try {
                    client.send(message)
                } catch (error) {
                    console.error('Error sending log to client:', error)
                    clients.delete(client)
                }
            }
        })
    }


    /**
     * Broadcast a log entry to all connected WebSocket clients
     * @param type - Log type (info, warn, error, etc.)
     * @param callLine - Call line information
     * @param argList - Array of arguments to log
     * @param date - Optional Date object to include in the log (defaults to current date)
     */
    function broadcastLog(type: string, callLine: string, date: Date, argList: any[], boundDatas?: any): void {
        const logData = {
            type,
            callLine,
            date: date ? date.toISOString() : new Date().toISOString(),
            argList,
            boundDatas: boundDatas ?? {}
        }
        
        sendDataToClients(logData)
    }

    // Start the server
    server.listen(port, () => {
        console.log(`Server started on http://localhost:${port}`)
        console.log(`WebSocket server ready on ws://localhost:${port}`)
    })

    return {
        app,
        server,
        wss,
        broadcastLog
    }
}

