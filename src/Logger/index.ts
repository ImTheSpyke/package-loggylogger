
import util from 'util'

import * as Types from '../types/index.js';


export class Logger {

    private static _getStartChar(logType: TLogType, lineType: TMultipleLogLineType): string {
        const firstChar = lineType === "base" ? "┃" : lineType === "mlstart" ? "┠" : lineType === "mlstep" ? "┇" : lineType === "mlend" ? "┇" : "┃"
        let secondChar: string
        
        if (lineType === "base") {
            const emojiMap: Record<TLogType, string> = {
                verbose: "{emojis.empty__}",
                debug: "{emojis.empty__}",
                log: "{emojis.empty__}",
                info: "{emojis.dot____}",
                success: "{emojis.dot____}",
                warn: "{emojis.warn___}",
                error: "{emojis.cross__}",
                fatal: "{emojis.cross__}",
                unknown: "{emojis.interro}"
            }
            secondChar = emojiMap[logType] || "{emojis.interro}"
        } else if (lineType === "mlstart") {
            const emojiMap: Record<TLogType, string> = {
                verbose: "{emojis.mlstart2}",
                debug: "{emojis.mlstart2}",
                log: "{emojis.mlstart2}",
                info: "{emojis.dot____}",
                success: "{emojis.dot____}",
                warn: "{emojis.warn___}",
                error: "{emojis.cross__}",
                fatal: "{emojis.cross__}",
                unknown: "{emojis.interro}"
            }
            secondChar = emojiMap[logType] || "{emojis.interro}"
        } else if (lineType === "mlstep") {
            secondChar = LoggyLogger.emojis["mlstep2"]
        } else {
            secondChar = LoggyLogger.emojis["mlend2"]
        }
        
        return `${firstChar}${secondChar}`
    }

    private static readonly _logPatterns: Record<TLogType, (lineType: TMultipleLogLineType) => string> = {
        verbose: (lineType: TMultipleLogLineType) => `{FgGray}${LoggyLogger._getStartChar("verbose", lineType)}  {date} {line}  V `,
        debug: (lineType: TMultipleLogLineType) => `{FgGray}${LoggyLogger._getStartChar("debug", lineType)}  {date} {line}  D `,
        log: (lineType: TMultipleLogLineType) => `{FgWhite}${LoggyLogger._getStartChar("log", lineType)}  {date} {FgGray}{line}{Reset} {BgGray}{FgWhite} L {Reset}{FgWhite}`,
        info: (lineType: TMultipleLogLineType) => `{FgBlue}${LoggyLogger._getStartChar("info", lineType)}  {FgWhite}{date} {FgGray}{line}{Reset} {BgBlue}{FgWhite} I {Reset}{FgBlue}`,
        success: (lineType: TMultipleLogLineType) => `{FgGreen}${LoggyLogger._getStartChar("success", lineType)}  {FgWhite}{date} {FgGray}{line}{Reset} {BgGreen}{FgBlack} S {Reset}{FgGreen}`,
        warn: (lineType: TMultipleLogLineType) => `{FgYellow}${LoggyLogger._getStartChar("warn", lineType)}  {date} {FgGray}{line}{Reset} {BgYellow}{FgBlack} W {Reset}{FgYellow}`,
        error: (lineType: TMultipleLogLineType) => `{FgRed}${LoggyLogger._getStartChar("error", lineType)}  {date} {FgGray}{line}{Reset} {BgRed}{FgBlack} E {Reset}{FgRed}`,
        fatal: (lineType: TMultipleLogLineType) => `{FgRed}${LoggyLogger._getStartChar("fatal", lineType)}  {date} {FgGray}{line}{Reset} {BgRed}{FgBlack} F {Reset}{FgRed}`,
        unknown: (lineType: TMultipleLogLineType) => `{FgGray}${LoggyLogger._getStartChar("unknown", lineType)}  {date} {line}  ? `,
    }

    /**
     * Per-instance configuration overrides.
     * These are merged with globalConfig on every access.
     * If undefined, the instance uses globalConfig directly.
     */
    private readonly _localOverrides?: Types.Logger.TLoggyConfigOptional
    /**
     * If true, ignore local overrides and always use globalConfig directly.
     * If false (default), merge local overrides with globalConfig dynamically.
     */
    private readonly $forceGlobalConfig: boolean

    /**
     * Create a new LoggyLogger instance
     * @param config - Optional partial configuration to override global defaults
     * @param useGlobalConfig - If true, always use global config (ignores config parameter). Default: false (merges config with global)
     */
    constructor(config?: Types.Logger.TLoggyConfigOptional, useGlobalConfig?: boolean) {
        if (config) {
            LoggyLogger._validateConfig(config)
        }
        
        // Store only the overrides, not a full copy
        this._localOverrides = useGlobalConfig ? undefined : config
        this.$forceGlobalConfig = useGlobalConfig || false
    }

    static get LEVELS() {
        return LoggyLogger._LEVELS
    }

    private static _validateConfig(config: Types.Logger.TLoggyConfigOptional): void {
        if (config.level !== undefined) {
            if (typeof config.level !== 'number' || config.level < 0 || !Number.isFinite(config.level)) {
                throw new Error(`[Loggy] Invalid config.level: must be a non-negative finite number`)
            }
        }
        if (config.colors !== undefined && typeof config.colors !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.colors: must be a boolean`)
        }
        if (config.emojis !== undefined && typeof config.emojis !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.emojis: must be a boolean`)
        }
        if (config.showCallLines !== undefined && typeof config.showCallLines !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.showCallLines: must be a boolean`)
        }
        if (config.cleanDate !== undefined && typeof config.cleanDate !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.cleanDate: must be a boolean`)
        }
        if (config.convertObjects !== undefined && typeof config.convertObjects !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.convertObjects: must be a boolean`)
        }
        if (config.convertObjectsColorized !== undefined && typeof config.convertObjectsColorized !== 'boolean') {
            throw new Error(`[Loggy] Invalid config.convertObjectsColorized: must be a boolean`)
        }
        if (config.convertObjectsDepth !== undefined) {
            if (typeof config.convertObjectsDepth !== 'number' || config.convertObjectsDepth < 0 || !Number.isInteger(config.convertObjectsDepth)) {
                throw new Error(`[Loggy] Invalid config.convertObjectsDepth: must be a non-negative integer`)
            }
        }
    }

    /**
     * Get the effective configuration for this instance.
     * Always merges globalConfig with local overrides dynamically,
     * so changes to globalConfig are immediately reflected.
     */
    get localConfig(): Types.Logger.TLoggyConfig {
        if (this.$forceGlobalConfig) {
            // Always use global config directly
            return LoggyLogger.globalConfig
        }
        
        // Merge global config with local overrides dynamically
        // This ensures globalConfig changes are always reflected
        return {
            ...LoggyLogger.globalConfig,
            ...this._localOverrides
        }
    }

    /**
     * Global configuration API
     * 
     * @example
     * ```typescript
     * LoggyLogger.conf.setLevel(LoggyLogger.LEVELS["7_DEBUG"])
     * LoggyLogger.conf.toggleColors(false)
     * ```
     */
    static get conf() {
        return {
            /**
             * Set global configuration
             * @param config - Partial configuration to merge with existing global config
             */
            set: (config: Types.Logger.TLoggyConfigOptional) => LoggyLogger._setConfig(config),
            /**
             * Set global log level
             * @param level - Log level (use LoggyLogger.LEVELS constants)
             * @throws Error if level is not a non-negative number
             */
            setLevel: (level: number) => LoggyLogger._setLevel(level),
            /**
             * Get current global log level
             * @returns Current log level number
             */
            getLevel: () => LoggyLogger._getLevel(),
            /**
             * Toggle colors globally
             * @param forceTo - Optional boolean to set specific state, undefined to toggle
             * @throws Error if forceTo is provided but not a boolean
             */
            toggleColors: (forceTo?: boolean) => LoggyLogger._toggleColors(forceTo),
        }
    }

    private static _setConfig(config: Types.Logger.TLoggyConfigOptional): void {
        LoggyLogger._validateConfig(config)
        LoggyLogger.globalConfig = {
            ...LoggyLogger.globalConfig,
            ...config
        }
    }

    private static _setLevel(level: number): void {
        if (typeof level !== 'number' || level < 0) {
            throw new Error(`[Loggy] setLevel: level must be a non-negative number`)
        }
        LoggyLogger.globalConfig.level = level
    }

    private static _getLevel(): number {
        return LoggyLogger.globalConfig.level
    }

    private static _toggleColors(forceTo?: boolean): void {
        if (typeof forceTo !== 'boolean' && forceTo !== undefined) {
            throw new Error(`[Loggy] toggleColors: forceTo must be a boolean if provided`)
        }
        if (forceTo === undefined) {
            LoggyLogger.globalConfig.colors = !LoggyLogger.globalConfig.colors
        } else {
            LoggyLogger.globalConfig.colors = forceTo
        }
    }

    /**
     * Instance-level configuration API
     * 
     * @example
     * ```typescript
     * const logger = Loggy.createLogger()
     * logger.config.setLevel(LoggyLogger.LEVELS["7_DEBUG"])
     * ```
     */
    public get config() {
        return {
            /**
             * Set log level for this instance
             * @param level - Log level (use LoggyLogger.LEVELS constants)
             * @throws Error if level is not a non-negative number
             */
            setLevel: (level: number) => this.setLevel(level),
            /**
             * Get current log level for this instance
             * @returns Current log level number
             */
            getLevel: () => this.getLevel(),
            /**
             * Toggle colors for this instance
             * @param forceTo - Optional boolean to set specific state, undefined to toggle
             * @throws Error if forceTo is provided but not a boolean
             */
            toggleColors: (forceTo?: boolean) => this.toggleColors(forceTo),
        }
    }

    private setLevel(level: number): void {
        if (typeof level !== 'number' || level < 0) {
            throw new Error(`[Loggy] setLevel: level must be a non-negative number`)
        }
        if (this.$forceGlobalConfig) {
            throw new Error(`[Loggy] setLevel: Cannot set instance level when useGlobalConfig is true`)
        }
        // Create or update local overrides
        if (!this._localOverrides) {
            (this as any)._localOverrides = {}
        }
        const overrides = this._localOverrides!
        overrides.level = level
    }

    private getLevel(): number {
        return this.localConfig.level
    }

    private toggleColors(forceTo?: boolean): void {
        if (typeof forceTo !== 'boolean' && forceTo !== undefined) {
            throw new Error(`[Loggy] toggleColors: forceTo must be a boolean if provided`)
        }
        // Create or update local overrides
        if (!this._localOverrides) {
            (this as any)._localOverrides = {}
        }
        const overrides = this._localOverrides!
        if (forceTo === undefined) {
            // Toggle based on current effective config
            overrides.colors = !this.localConfig.colors
        } else {
            overrides.colors = forceTo
        }
    }

    private _getLogPatterns(type: TLogType, date: Date, line: string): Record<TMultipleLogLineType, string> {
        const patternFn = LoggyLogger._logPatterns[type] || LoggyLogger._logPatterns.unknown
        
        return {
            base: this._processLogPattern("base", patternFn("base"), date, line),
            mlstart: this._processLogPattern("mlstart", patternFn("mlstart"), date, line),
            mlstep: this._processLogPattern("mlstep", patternFn("mlstep"), date, line),
            mlend: this._processLogPattern("mlend", patternFn("mlend"), date, line),
        }
    }

    private _processLogPattern(type: TMultipleLogLineType, logPattern: string, date: Date, line: string): string {
        const config = this.localConfig

        // Process emojis
        if (config.emojis) {
            logPattern = Object.entries(LoggyLogger.emojis).reduce((str, [key, value]) => {
                return str.split(`{emojis.${key}}`).join(value)
            }, logPattern)
        } else {
            logPattern = Object.entries(LoggyLogger.emojis).reduce((str, [key]) => {
                return str.split(`{emojis.${key}}`).join(LoggyLogger.emojis.none___)
            }, logPattern)
        }

        // Process colors
        if (config.colors) {
            for (const color in LoggyLogger.colors) {
                logPattern = logPattern.split(`{${color}}`).join(LoggyLogger.colors[color])
            }
        } else {
            for (const color in LoggyLogger.colors) {
                logPattern = logPattern.split(`{${color}}`).join("")
            }
        }

        // Process date
        let dateString = date.toISOString()
        if (config.cleanDate) {
            dateString = dateString.replace(/[TZ]/g, " ").trim()
        }
        if (type === "mlstep" || type === "mlend") {
            dateString = dateString.replace(/./g, " ")
        }
        logPattern = logPattern.replace("{date}", dateString)

        // Process line
        if (config.showCallLines) {
            logPattern = logPattern.replace("{line}", `(${line})`)
        } else {
            logPattern = logPattern.replace("{line}", "")
        }

        return `${logPattern} `
    }

    private _getLastCallerLine(): string {
        if (!this.localConfig.showCallLines) {
            return ""
        }

        try {
            const splitOnChar = "\\"
            let stack = (new Error()).stack as string
            stack = stack.split("/").join("\\")
            const stackLines = stack.split("\n")
            const targetLine = stackLines[4]?.split(splitOnChar) ?? []
            
            if (targetLine.length < 2) {
                return ""
            }

            let callerLine = splitOnChar + targetLine[targetLine.length - 2] + splitOnChar + targetLine[targetLine.length - 1]
            
            if (callerLine.endsWith(")")) {
                const parts = callerLine.split("(")
                if (parts.length > 1) {
                    callerLine = parts[1]?.substring(0, callerLine.length - 1) || callerLine
                }
                callerLine = callerLine.substring(0, callerLine.length - 1)
            }
            
            return callerLine
        } catch (e) {
            return "!error!"
        }
    }

    private _formatStringArgs(args: unknown[]): string {
        return args.filter((arg): arg is string => typeof arg === 'string').join(" ")
    }

    private _logMultiLineString(fullString: string, patterns: Record<TMultipleLogLineType, string>): void {
        const lines = fullString.split("\n")
        for (let i = 0; i < lines.length; i++) {
            const isLast = i === lines.length - 1
            if (i === 0) {
                console.log(patterns.mlstart + lines[i])
            } else if (isLast) {
                console.log(patterns.mlend + lines[i])
            } else {
                console.log(patterns.mlstep + lines[i])
            }
        }
    }

    private _formatObject(arg: unknown, patterns: Record<TMultipleLogLineType, string>, isFirst: boolean, isLast: boolean, isMultipleArgs: boolean): string {
        const config = this.localConfig
        if (!config.convertObjects) {
            return String(arg)
        }

        try {
            const inspected = util.inspect(arg, {
                colors: config.convertObjectsColorized,
                depth: config.convertObjectsDepth
            })
            
            const lines = inspected.split("\n")
            if (lines.length > 1) {
                isMultipleArgs = true
            }

            return lines.map((line, i, l) => {
                const isLocalLast = i === l.length - 1
                const isLocalFirst = i === 0

                if (isFirst && isLast && isLocalLast && !isMultipleArgs) {
                    return `${patterns.base}${LoggyLogger.colors.Reset}${line}`
                }
                if (isFirst && isLocalFirst && isMultipleArgs) {
                    return `${patterns.mlstart}${LoggyLogger.colors.Reset}${line}`
                }
                if (isLast && isLocalLast) {
                    return `\n${patterns.mlend}${LoggyLogger.colors.Reset}${line}`
                }
                return `\n${patterns.mlstep}${LoggyLogger.colors.Reset}${line}`
            }).join("")
        } catch (e) {
            return String(arg)
        }
    }

    private _formatString(arg: string, patterns: Record<TMultipleLogLineType, string>, index: number, total: number, lastStringIndex: number, convertObjects: boolean): string {
        const lines = arg.split("\n")
        const isFirst = index === 0
        const isLast = index === total - 1
        const isLastString = lastStringIndex === index
        let isMultipleArgs = total > 1

        if (lines.length > 1) {
            isMultipleArgs = true
        }

        return lines.map((line, i, l) => {
            const isLocalLast = i === l.length - 1
            const isLocalFirst = i === 0

            if ((isFirst && isLocalFirst && isLast && isLocalLast && !isMultipleArgs) ||
                (isFirst && isLocalFirst && isLocalLast && !convertObjects)) {
                return `${patterns.base}${line}`
            }
            if (isFirst && isLocalFirst && isMultipleArgs) {
                return `${patterns.mlstart}${line}`
            }
            if ((isLast && isLocalLast) || (isLastString && isLocalLast && !convertObjects)) {
                return `\n${patterns.mlend}${line}`
            }
            return `\n${patterns.mlstep}${line}`
        }).join("")
    }

    private _findLastStringIndex(args: unknown[]): number {
        for (let i = args.length - 1; i >= 0; i--) {
            if (typeof args[i] === 'string') {
                return i
            }
        }
        return -1
    }

    private rawLog(type: TLogType, ...args: unknown[]): void {
        try {
            const date = new Date()
            const logLine = this._getLastCallerLine()
            const patterns = this._getLogPatterns(type, date, logLine)

            // Fast path: all strings
            if (args.length > 0 && args.every((arg): arg is string => typeof arg === 'string')) {
                const fullString = this._formatStringArgs(args)
                const hasMultipleLines = fullString.includes("\n")
                
                if (!hasMultipleLines) {
                    console.log(patterns.base + fullString)
                    return
                }
                
                this._logMultiLineString(fullString, patterns)
                return
            }

            // Complex path: mixed types
            const convertObjects = this.localConfig.convertObjects
            const lastStringIndex = this._findLastStringIndex(args)

            const formatted = args.map((arg, index) => {
                const isFirst = index === 0
                const isLast = index === args.length - 1
                const isMultipleArgs = args.length > 1

                if (typeof arg === 'string') {
                    return this._formatString(arg, patterns, index, args.length, lastStringIndex, convertObjects)
                }

                return this._formatObject(arg, patterns, isFirst, isLast, isMultipleArgs)
            })

            const filtered = formatted.filter((arg) => {
                if (typeof arg === 'string') {
                    const trimmed = arg.trim()
                    return trimmed !== "" && trimmed !== "\n"
                }
                return arg !== undefined && arg !== null
            })

            console.log(...filtered)
        } catch (error) {
            console.error(`[Loggy] Error in rawLog:`, error)
        }
    }

    /**
     * Reload the configuration for the current logger instance to match the global configuration.
     * This will clear any instance-specific overrides.
     * 
     * @example
     * ```typescript
     * LoggyLogger.conf.setLevel(LoggyLogger.LEVELS["7_DEBUG"])
     * logger.reloadConfig() // Now uses global level (clears local overrides)
     * ```
     */
    public reloadConfig(): void {
        // Clear local overrides to use global config
        (this as any)._localOverrides = undefined
    }

    /**
     * Log a verbose message (level 80)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public verbose(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["8_VERBOSE"]) {
            this.rawLog('verbose', ...args)
        }
    }

    /**
     * Log a debug message (level 70)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public debug(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["7_DEBUG"]) {
            this.rawLog('debug', ...args)
        }
    }

    /**
     * Log a general log message (level 60)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public log(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["6_LOG"]) {
            this.rawLog('log', ...args)
        }
    }

    /**
     * Log an info message (level 50)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public info(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["5_INFO"]) {
            this.rawLog('info', ...args)
        }
    }

    /**
     * Log a success message (level 40)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public success(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["4_SUCCESS"]) {
            this.rawLog('success', ...args)
        }
    }

    /**
     * Log a warning message (level 30)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public warn(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["3_WARN"]) {
            this.rawLog('warn', ...args)
        }
    }

    /**
     * Log an error message (level 20)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public error(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["2_ERROR"]) {
            this.rawLog('error', ...args)
        }
    }

    /**
     * Log a fatal message (level 10)
     * @param args - Arguments to log (strings, objects, etc.)
     */
    public fatal(...args: unknown[]): void {
        if (this.localConfig.level >= LoggyLogger.LEVELS["1_FATAL"]) {
            this.rawLog('fatal', ...args)
        }
    }
}


export default Logger
export { Logger }