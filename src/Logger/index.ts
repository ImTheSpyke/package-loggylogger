import util from 'node:util'
import * as Types from '../types/index.js'
import { colors } from './colors.js'
import { emojis } from './emojis.js'
import { LEVELS } from './levels.js'

type LogType = Types.Logger.TLogType
type LineType = Types.Logger.TMultipleLogLineType

const FIRST_CHARS: Record<LineType, string> = { base: '┃', mlstart: '┠', mlstep: '┇', mlend: '┇' }
const EMOJI_MAPS: Record<'base' | 'mlstart', Record<LogType, Types.Logger.EmojiType>> = {
    base: { silly: 'empty__', verbose: 'empty__', debug: 'empty__', log: 'empty__', info: 'dot____', success: 'dot____', warn: 'warn___', error: 'cross__', fatal: 'cross__', unknown: 'interro' },
    mlstart: { silly: 'mlstart2', verbose: 'mlstart2', debug: 'mlstart2', log: 'mlstart2', info: 'dot____', success: 'dot____', warn: 'warn___', error: 'cross__', fatal: 'cross__', unknown: 'interro' }
}
const LOG_PATTERNS: Record<LogType, [string, string, string]> = {
    silly: ['{FgGray}', '{date} {line}  S ', ''],
    verbose: ['{FgGray}', '{date} {line}  V ', ''],
    debug: ['{FgGray}', '{date} {line}  D ', ''],
    log: ['{FgWhite}', '{date} {FgGray}{line}{Reset} {BgGray}{FgWhite} L {Reset}{FgWhite}', ''],
    info: ['{FgBlue}', '{FgWhite}{date} {FgGray}{line}{Reset} {BgBlue}{FgWhite} I {Reset}{FgBlue}', ''],
    success: ['{FgGreen}', '{FgWhite}{date} {FgGray}{line}{Reset} {BgGreen}{FgBlack} S {Reset}{FgGreen}', ''],
    warn: ['{FgYellow}', '{date} {FgGray}{line}{Reset} {BgYellow}{FgBlack} W {Reset}{FgYellow}', ''],
    error: ['{FgRed}', '{date} {FgGray}{line}{Reset} {BgRed}{FgBlack} E {Reset}{FgRed}', ''],
    fatal: ['{FgRed}', '{date} {FgGray}{line}{Reset} {BgRed}{FgBlack} F {Reset}{FgRed}', ''],
    unknown: ['{FgGray}', '{date} {line}  ? ', '']
}

export type BroadcastFn = (type: string, callLine: string, date: Date, args: unknown[], boundDatas: Record<string, unknown>) => void
export type CallLineGetterFn = () => string

export class Logger {
    private _overrides?: Types.Logger.TLoggyConfigOptional
    private readonly _useGlobal: boolean
    private _broadcast?: BroadcastFn
    private _callLineGetter?: CallLineGetterFn
    private _boundDatas: Record<string, unknown> = {}

    static globalConfig: Types.Logger.TLoggyConfig = {
        level: LEVELS.DEFAULT, colors: true, emojis: true, showCallLines: false,
        cleanDate: true, convertObjects: false, convertObjectsColorized: true, convertObjectsDepth: 2
    }
    static readonly LEVELS = LEVELS
    static readonly colors = colors
    static readonly emojis = emojis

    constructor(config?: Types.Logger.TLoggyConfigOptional, useGlobalConfig = false, boundDatas: Record<string, unknown> = {}) {
        this._useGlobal = useGlobalConfig
        this._overrides = useGlobalConfig ? undefined : config
        this._boundDatas = boundDatas
    }

    setBroadcast(fn: BroadcastFn | undefined) { this._broadcast = fn }
    setCallLineGetter(fn: CallLineGetterFn | undefined) { this._callLineGetter = fn }

    get localConfig(): Types.Logger.TLoggyConfig {
        return this._useGlobal ? Logger.globalConfig : { ...Logger.globalConfig, ...this._overrides }
    }

    getBoundDatas() { return this._boundDatas }

    static get conf() {
        return {
            set: (c: Types.Logger.TLoggyConfigOptional) => { Logger.globalConfig = { ...Logger.globalConfig, ...c } },
            get: () => Logger.globalConfig,
            setLevel: (l: number) => { Logger.globalConfig.level = l },
            getLevel: () => Logger.globalConfig.level,
            toggleColors: (v?: boolean) => { Logger.globalConfig.colors = v ?? !Logger.globalConfig.colors }
        }
    }

    get config() {
        return {
            setLevel: (l: number) => { if (!this._useGlobal) (this._overrides ??= {}).level = l },
            getLevel: () => this.localConfig.level,
            toggleColors: (v?: boolean) => { if (!this._useGlobal) (this._overrides ??= {}).colors = v ?? !this.localConfig.colors }
        }
    }

    clearConfig() { this._overrides = undefined }

    private _getStartChar(type: LogType, line: LineType): string {
        const first = FIRST_CHARS[line]
        if (line === 'mlstep') return first + emojis.mlstep2
        if (line === 'mlend') return first + emojis.mlend2
        const map = EMOJI_MAPS[line === 'base' ? 'base' : 'mlstart']
        return first + (this.localConfig.emojis ? emojis[map[type] || 'interro'] : emojis.none___)
    }

    private _buildPattern(type: LogType, line: LineType, date: Date, callLine: string): string {
        const cfg = this.localConfig
        const [pre, mid] = LOG_PATTERNS[type] || LOG_PATTERNS.unknown
        let p = `${pre}${this._getStartChar(type, line)}  ${mid} `

        // Process colors
        for (const [k, v] of Object.entries(colors)) p = p.split(`{${k}}`).join(cfg.colors ? v : '')

        // Process date
        let d = date.toISOString()
        if (cfg.cleanDate) d = d.replace(/[TZ]/g, ' ').trim()
        if (line === 'mlstep' || line === 'mlend') d = ' '.repeat(d.length)
        p = p.replace('{date}', d)

        // Process line
        p = p.replace('{line}', cfg.showCallLines ? `(${callLine})` : '')
        return p
    }

    private _getCallLine(): string {
        if (!this.localConfig.showCallLines) return ''
        // Use custom call line getter if available (set by LoggyLogger for external caller detection)
        if (this._callLineGetter) {
            return this._callLineGetter()
        }
        // Fallback to default stack trace parsing
        try {
            const stack = (new Error()).stack?.split('\n')[4] || ''
            const parts = stack.replace(/\//g, '\\').split('\\')
            if (parts.length < 2) return ''
            let line = '\\' + parts.slice(-2).join('\\')
            if (line.endsWith(')')) line = line.split('(').pop()?.slice(0, -1) || line
            return line
        } catch { return '!error!' }
    }

    private _log(type: LogType, args: unknown[], skipBroadcast = false, extraBoundDatas: Record<string, unknown> = {}): void {
        const date = new Date(), line = this._getCallLine(), cfg = this.localConfig
        const mergedBoundDatas = { ...this._boundDatas, ...extraBoundDatas }

        // Broadcast to websocket if available
        if (!skipBroadcast && this._broadcast) this._broadcast(type, line, date, args, mergedBoundDatas)
        const patterns: Record<LineType, string> = {
            base: this._buildPattern(type, 'base', date, line),
            mlstart: this._buildPattern(type, 'mlstart', date, line),
            mlstep: this._buildPattern(type, 'mlstep', date, line),
            mlend: this._buildPattern(type, 'mlend', date, line)
        }

        // Fast path: single string without newlines
        if (args.length === 1 && typeof args[0] === 'string' && !args[0].includes('\n')) {
            console.log(patterns.base + args[0])
            return
        }

        // Fast path: all strings
        if (args.every(a => typeof a === 'string')) {
            const full = args.join(' ')
            if (!full.includes('\n')) { console.log(patterns.base + full); return }
            const lines = full.split('\n')
            lines.forEach((l, i) => console.log((i === 0 ? patterns.mlstart : i === lines.length - 1 ? patterns.mlend : patterns.mlstep) + l))
            return
        }

        // Complex path: mixed types
        const out: string[] = []
        args.forEach((arg, i) => {
            const isFirst = i === 0, isLast = i === args.length - 1
            if (typeof arg === 'string') {
                const lines = arg.split('\n')
                lines.forEach((l, j) => {
                    const p = (isFirst && j === 0 && lines.length === 1 && args.length === 1) ? patterns.base
                        : (isFirst && j === 0) ? patterns.mlstart
                        : (isLast && j === lines.length - 1) ? patterns.mlend : patterns.mlstep
                    out.push(p + l)
                })
            } else if (cfg.convertObjects) {
                const inspected = util.inspect(arg, { colors: cfg.convertObjectsColorized, depth: cfg.convertObjectsDepth })
                inspected.split('\n').forEach((l, j, arr) => {
                    const p = (isFirst && j === 0) ? patterns.mlstart : (isLast && j === arr.length - 1) ? patterns.mlend : patterns.mlstep
                    out.push(p + colors.Reset + l)
                })
            } else {
                out.push((isFirst ? patterns.mlstart : isLast ? patterns.mlend : patterns.mlstep) + String(arg))
            }
        })
        out.forEach(l => console.log(l))
    }

    silly(...args: unknown[]) { if (this.localConfig.level >= LEVELS['9_SILLY']) this._log('silly', args) }
    verbose(...args: unknown[]) { if (this.localConfig.level >= LEVELS['8_VERBOSE']) this._log('verbose', args) }
    debug(...args: unknown[]) { if (this.localConfig.level >= LEVELS['7_DEBUG']) this._log('debug', args) }
    log(...args: unknown[]) { if (this.localConfig.level >= LEVELS['6_LOG']) this._log('log', args) }
    info(...args: unknown[]) { if (this.localConfig.level >= LEVELS['5_INFO']) this._log('info', args) }
    success(...args: unknown[]) { if (this.localConfig.level >= LEVELS['4_SUCCESS']) this._log('success', args) }
    warn(...args: unknown[]) { if (this.localConfig.level >= LEVELS['3_WARN']) this._log('warn', args) }
    error(...args: unknown[]) { if (this.localConfig.level >= LEVELS['2_ERROR']) this._log('error', args) }
    fatal(...args: unknown[]) { if (this.localConfig.level >= LEVELS['1_FATAL']) this._log('fatal', args) }

    // Internal methods for bound logging (with extra boundDatas)
    _sillyBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['9_SILLY']) this._log('silly', args, false, extraBoundDatas) }
    _verboseBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['8_VERBOSE']) this._log('verbose', args, false, extraBoundDatas) }
    _debugBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['7_DEBUG']) this._log('debug', args, false, extraBoundDatas) }
    _logBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['6_LOG']) this._log('log', args, false, extraBoundDatas) }
    _infoBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['5_INFO']) this._log('info', args, false, extraBoundDatas) }
    _successBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['4_SUCCESS']) this._log('success', args, false, extraBoundDatas) }
    _warnBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['3_WARN']) this._log('warn', args, false, extraBoundDatas) }
    _errorBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['2_ERROR']) this._log('error', args, false, extraBoundDatas) }
    _fatalBound(extraBoundDatas: Record<string, unknown>, ...args: unknown[]) { if (this.localConfig.level >= LEVELS['1_FATAL']) this._log('fatal', args, false, extraBoundDatas) }
}

export default Logger
