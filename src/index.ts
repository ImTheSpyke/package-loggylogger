import { Logger } from './Logger/index.js'
import { startServer, DashboardServer, addLogFile, setBasePath } from './server.js'
import * as Types from './types/index.js'
import path from 'node:path'

export { Logger, Types }
export type { DashboardServer }

// Noop function for disabled features
const noop = () => {}

// Type for the public logger interface (only log methods)
export interface LoggerInterface {
    silly: (...args: unknown[]) => void
    verbose: (...args: unknown[]) => void
    debug: (...args: unknown[]) => void
    log: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    success: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
    fatal: (...args: unknown[]) => void
    bind: (boundDatas: Record<string, unknown>) => LoggerInterface
}

export interface LoggyConfig {
    level?: number
    colors?: boolean
    emojis?: boolean
    showCallLines?: boolean
    cleanDate?: boolean
    convertObjects?: boolean
    convertObjectsColorized?: boolean
    convertObjectsDepth?: number
    basePath?: string
}

export interface ProductionConfig {
    dashboard?: boolean
    logs?: { fatal?: boolean; error?: boolean; warn?: boolean; success?: boolean; info?: boolean; log?: boolean; debug?: boolean; verbose?: boolean }
    settings?: { colors?: boolean; objectInspect?: boolean; callLine?: boolean; basePath?: string }
}

export interface LoggyOptions {
    production?: boolean
    productionConfig?: ProductionConfig
    serverPort?: number
    config?: LoggyConfig
}

/**
 * Normalize a base path to ensure it never ends with a slash.
 * Handles both forward slashes and backslashes cross-platform.
 */
function normalizeBasePath(basePath: string): string {
    if (!basePath) return basePath
    // Normalize the path and remove any trailing slashes
    let normalized = path.normalize(basePath).replace(/\\/g, '/')
    while (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1)
    }
    return path.resolve(normalized)
}

/**
 * Parse a stack trace line and extract file path and line number.
 * Handles various stack trace formats from different environments.
 * Example output: "myproject/hi.js:5" or "C:/projects/myproject/hi.js:5"
 */
function parseStackLine(stackLine: string): { filePath: string; lineNumber: number } | null {
    if (!stackLine) return null

    // Handle various stack trace formats:
    // V8/Node: "    at functionName (file:///path/to/file.js:10:15)" or "    at file:///path/to/file.js:10:15"
    // V8/Node: "    at functionName (/path/to/file.js:10:15)" or "    at /path/to/file.js:10:15"
    // Windows: "    at functionName (C:\path\to\file.js:10:15)"

    let match: RegExpMatchArray | null = null

    // Try file:// URL format first (ESM modules)
    match = stackLine.match(/file:\/\/\/?([^:]+):(\d+)(?::\d+)?/)
    if (match) {
        return { filePath: match[1].replace(/\\/g, '/'), lineNumber: parseInt(match[2], 10) }
    }

    // Try Windows path format (C:\path\to\file.js:10:15)
    match = stackLine.match(/([A-Za-z]:[^:]+):(\d+)(?::\d+)?/)
    if (match) {
        return { filePath: match[1].replace(/\\/g, '/'), lineNumber: parseInt(match[2], 10) }
    }

    // Try Unix path format (/path/to/file.js:10:15)
    match = stackLine.match(/\(([^()]+):(\d+)(?::\d+)?\)/)
    if (match) {
        return { filePath: match[1].replace(/\\/g, '/'), lineNumber: parseInt(match[2], 10) }
    }

    // Try bare path format without parentheses
    match = stackLine.match(/at\s+([^:]+):(\d+)(?::\d+)?/)
    if (match) {
        return { filePath: match[1].replace(/\\/g, '/').trim(), lineNumber: parseInt(match[2], 10) }
    }

    return null
}

/**
 * Apply base path transformation to a file path.
 * Removes the base path prefix and replaces it with "./"
 * Works cross-platform using node:path for normalization.
 */
function applyBasePath(filePath: string, basePath: string | undefined): string {
    if (!basePath) return filePath

    // Normalize both paths for cross-platform comparison
    const normalizedFilePath = path.normalize(filePath).replace(/\\/g, '/')
    const normalizedBasePath = path.normalize(basePath).replace(/\\/g, '/')

    // Ensure basePath ends without a trailing slash for consistent comparison
    const basePathClean = normalizedBasePath.endsWith('/')
        ? normalizedBasePath.slice(0, -1)
        : normalizedBasePath

    // Check if the file path starts with the base path
    if (normalizedFilePath.startsWith(basePathClean + '/')) {
        return './' + normalizedFilePath.slice(basePathClean.length + 1)
    }

    // Also handle case where paths match exactly (shouldn't happen with files, but be safe)
    if (normalizedFilePath === basePathClean) {
        return '.'
    }

    return filePath
}

/**
 * Find the external caller from a stack trace.
 * Skips internal module frames and returns the first external caller's location.
 * Works both when running from source and when installed as an NPM package.
 */
function findExternalCaller(stack: string[], skipFrames: number, modulePatterns: string[], basePath?: string): string {
    for (let i = skipFrames; i < stack.length; i++) {
        const line = stack[i]

        // Skip internal Node.js modules (built-in modules)
        if (line.includes('node:')) continue

        // Skip frames that match any of the module patterns (internal logger files)
        // This includes node_modules/loggylogger patterns which are handled by modulePatterns
        const isInternalFrame = modulePatterns.some(pattern => line.includes(pattern))
        if (isInternalFrame) continue

        // Skip other node_modules (not the loggylogger package itself, which is handled above)
        // We want to find the actual user code that called the logger
        if (line.includes('node_modules') && !modulePatterns.some(p => p.includes('node_modules'))) continue

        // Parse the stack line
        const parsed = parseStackLine(line)
        if (parsed) {
            const transformedPath = applyBasePath(parsed.filePath, basePath)
            return `${transformedPath}:${parsed.lineNumber}`
        }
    }
    return ''
}

export class LoggyLogger {
    private _server: DashboardServer | null = null
    private _production = false
    private _prodConfig: ProductionConfig = {}
    private _basePath?: string
    private _createdLoggers: Array<{ logger: Logger; updateBasePath: (basePath: string | undefined) => void }> = []

    readonly LEVELS = Logger.LEVELS

    constructor(options?: LoggyOptions) {
        if (options?.config) {
            this.setConfig(options.config)
        }
        if (options?.production) {
            this.enableProduction(options.productionConfig, options.serverPort)
        }
    }

    // Configuration
    setConfig(config: LoggyConfig) {
        if (config.basePath !== undefined) {
            // Normalize basePath to never end with a slash
            const normalizedBasePath = normalizeBasePath(config.basePath)
            this._basePath = normalizedBasePath
            setBasePath(normalizedBasePath)
            // Update all existing loggers with the new basePath
            this._createdLoggers.forEach(({ updateBasePath }) => updateBasePath(normalizedBasePath))
        }
        Logger.conf.set(config)
    }
    setLevel(level: number) { Logger.conf.setLevel(level) }
    getLevel() { return Logger.conf.getLevel() }
    toggleColors(value?: boolean) { Logger.conf.toggleColors(value) }

    // Dashboard
    startDashboard(port = 11000) {
        if (this._production && !this._prodConfig.dashboard) return
        if (!this._server) this._server = startServer(port)
    }

    stopDashboard() {
        this._server?.close()
        this._server = null
    }

    // Production mode
    enableProduction(config?: ProductionConfig, port?: number) {
        this._production = true
        this._prodConfig = {
            ...this._prodConfig,
            ...config
        }

        // Apply production settings
        if (config?.settings) {
            Logger.conf.set({
                colors: config.settings.colors ?? false,
                convertObjects: config.settings.objectInspect ?? false,
                showCallLines: config.settings.callLine ?? false
            })
            // Apply basePath from production settings (normalized)
            if (config.settings.basePath !== undefined) {
                const normalizedBasePath = normalizeBasePath(config.settings.basePath)
                this._basePath = normalizedBasePath
                setBasePath(normalizedBasePath)
                // Update all existing loggers with the new basePath
                this._createdLoggers.forEach(({ updateBasePath }) => updateBasePath(normalizedBasePath))
            }
        } else {
            Logger.conf.set({ colors: false, convertObjects: false, showCallLines: false })
        }

        // Start dashboard only if enabled
        if (config?.dashboard) this.startDashboard(port)
    }

    disableProduction() {
        this._production = false
    }

    isProduction() { return this._production }

    // Create logger with production-aware optimizations
    createLogger(config?: LoggyConfig, boundDatas: Record<string, unknown> = {}): LoggerInterface {
        const logger = new Logger(config, false, boundDatas)
        const logMethods: Types.Logger.TLogType[] = ['fatal', 'error', 'warn', 'success', 'info', 'log', 'debug', 'verbose']

        // Determine basePath: per-logger config takes precedence over global (normalize it)
        const loggerBasePath = config?.basePath !== undefined ? normalizeBasePath(config.basePath) : undefined
        let currentBasePath = loggerBasePath ?? this._basePath

        // Track the file path where this logger was created
        const filePath = this._getCallerFilePath()
        if (filePath) addLogFile(filePath)

        // Set up broadcast to websocket with external call line
        logger.setBroadcast((type, callLine, date, args, boundDatas) => {
            this._server?.broadcast(`log-${type}`, callLine, date, args, boundDatas)
        })

        // Create a function to update the basePath and refresh the call line getter
        const updateBasePath = (newBasePath: string | undefined) => {
            // Only update if this logger doesn't have its own fixed basePath
            if (loggerBasePath === undefined) {
                currentBasePath = newBasePath
                logger.setCallLineGetter(createCallLineGetter())
            }
        }

        // Custom call line getter factory that finds the external caller
        // This creates a closure that captures the current basePath
        const createCallLineGetter = (): (() => string) => {
            return (): string => {
                try {
                    const stack = (new Error()).stack?.split('\n') || []
                    // Patterns to identify frames from within this NPM package
                    // These patterns match both source and dist locations, as well as when
                    // the package is installed in node_modules
                    const modulePatterns = [
                        // Source and dist patterns (when running from source or built)
                        '/src/index.',
                        '/dist/index.',
                        '/src/Logger/',
                        '/dist/Logger/',
                        // node_modules patterns (when installed as NPM package)
                        'node_modules/loggylogger/',
                        'node_modules\\loggylogger\\',
                        // Package name patterns (catch-all for various module resolution)
                        '/loggylogger/dist/',
                        '/loggylogger/src/',
                        '\\loggylogger\\dist\\',
                        '\\loggylogger\\src\\'
                    ]
                    // Skip frames to find the actual caller outside the module
                    return findExternalCaller(stack, 2, modulePatterns, currentBasePath)
                } catch {
                    return ''
                }
            }
        }

        // Set the external call line getter on the logger
        logger.setCallLineGetter(createCallLineGetter())

        // Track this logger so we can update its basePath when global config changes
        this._createdLoggers.push({ logger, updateBasePath })

        // Helper to create a bound interface with extra boundDatas (merged on top of logger's boundDatas)
        const createBoundInterface = (extraBoundDatas: Record<string, unknown>): LoggerInterface => {
            const boundInterface: LoggerInterface = {
                silly: (...args: unknown[]) => logger._sillyBound(extraBoundDatas, ...args),
                verbose: (...args: unknown[]) => logger._verboseBound(extraBoundDatas, ...args),
                debug: (...args: unknown[]) => logger._debugBound(extraBoundDatas, ...args),
                log: (...args: unknown[]) => logger._logBound(extraBoundDatas, ...args),
                info: (...args: unknown[]) => logger._infoBound(extraBoundDatas, ...args),
                success: (...args: unknown[]) => logger._successBound(extraBoundDatas, ...args),
                warn: (...args: unknown[]) => logger._warnBound(extraBoundDatas, ...args),
                error: (...args: unknown[]) => logger._errorBound(extraBoundDatas, ...args),
                fatal: (...args: unknown[]) => logger._fatalBound(extraBoundDatas, ...args),
                bind: (moreBoundDatas: Record<string, unknown>) => createBoundInterface({ ...extraBoundDatas, ...moreBoundDatas })
            }

            // In production mode, override disabled methods with noop
            if (this._production) {
                const logs = this._prodConfig.logs ?? {}
                logMethods.forEach(method => {
                    if (method === 'unknown') return
                    const enabled = logs[method as keyof typeof logs] ?? (method === 'fatal' || method === 'error')
                    if (!enabled) boundInterface[method] = noop
                })
            }

            return boundInterface
        }

        // Build the public interface - only expose log methods
        const publicInterface: LoggerInterface = {
            silly: (...args: unknown[]) => logger.silly(...args),
            verbose: (...args: unknown[]) => logger.verbose(...args),
            debug: (...args: unknown[]) => logger.debug(...args),
            log: (...args: unknown[]) => logger.log(...args),
            info: (...args: unknown[]) => logger.info(...args),
            success: (...args: unknown[]) => logger.success(...args),
            warn: (...args: unknown[]) => logger.warn(...args),
            error: (...args: unknown[]) => logger.error(...args),
            fatal: (...args: unknown[]) => logger.fatal(...args),
            bind: (extraBoundDatas: Record<string, unknown>) => createBoundInterface(extraBoundDatas)
        }

        // In production mode, override disabled methods with noop
        if (this._production) {
            const logs = this._prodConfig.logs ?? {}
            logMethods.forEach(method => {
                if (method === 'unknown') return
                const enabled = logs[method as keyof typeof logs] ?? (method === 'fatal' || method === 'error')
                if (!enabled) publicInterface[method] = noop
            })
        }

        return publicInterface
    }

    // Get the file path of the caller (for tracking where loggers are created)
    private _getCallerFilePath(): string | null {
        try {
            const stack = (new Error()).stack?.split('\n') || []
            // Patterns to identify frames from within this NPM package
            const modulePatterns = [
                // Source and dist patterns (when running from source or built)
                '/src/index.',
                '/dist/index.',
                '/src/Logger/',
                '/dist/Logger/',
                // node_modules patterns (when installed as NPM package)
                'node_modules/loggylogger/',
                'node_modules\\loggylogger\\',
                // Package name patterns (catch-all for various module resolution)
                '/loggylogger/dist/',
                '/loggylogger/src/',
                '\\loggylogger\\dist\\',
                '\\loggylogger\\src\\'
            ]
            // Find the first line that's not in this module or node internals
            for (let i = 3; i < stack.length; i++) {
                const line = stack[i]
                if (line.includes('node:')) continue
                const isInternalFrame = modulePatterns.some(pattern => line.includes(pattern))
                if (isInternalFrame) continue
                // Skip other node_modules (we want user code, not other dependencies)
                if (line.includes('node_modules')) continue

                const parsed = parseStackLine(line)
                if (parsed) {
                    return path.resolve(parsed.filePath)
                }
            }
        } catch {}
        return null
    }
}

// Default instance
const Loggy = new LoggyLogger()

export default Loggy
export { Loggy }
