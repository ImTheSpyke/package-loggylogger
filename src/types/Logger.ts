
export interface TLoggyConfig {
    /** Log level threshold (higher = more verbose). Use LoggyLogger.LEVELS constants. */
    level: number
    /** Enable ANSI color codes in output */
    colors: boolean
    /** Enable emoji characters in log patterns */
    emojis: boolean
    /** Show file path and line number in logs */
    showCallLines: boolean
    /** Clean ISO date format (remove T and Z) */
    cleanDate: boolean
    /** Convert objects to strings using util.inspect */
    convertObjects: boolean
    /** Enable colors in object inspection output */
    convertObjectsColorized: boolean
    /** Maximum depth for object inspection */
    convertObjectsDepth: number
}

export type TLoggyConfigOptional = Partial<TLoggyConfig>

export type TLogType = 'fatal' | 'error' | 'warn' | 'success' | 'info' | 'log' | 'debug' | 'verbose' | 'silly' | 'unknown'
export type TLogTypeList = ['fatal', 'error', 'warn', 'success', 'info', 'log', 'debug', 'verbose', 'silly', 'unknown']

export type TMultipleLogLineType = "base" | "mlstart" | "mlstep" | "mlend"

export enum LOG_LEVEL {
    FATAL = 10,
    ERROR = 20,
    WARN = 30,
    SUCCESS = 40,
    INFO = 50,
    LOG = 60,
    DEBUG = 70,
    VERBOSE = 80,
    SILLY = 90
}
export type AVAILABLE_LEVELS = {
    "DEFAULT": LOG_LEVEL.LOG,
    "1_FATAL": LOG_LEVEL.FATAL,
    "2_ERROR": LOG_LEVEL.ERROR,
    "3_WARN": LOG_LEVEL.WARN,
    "4_SUCCESS": LOG_LEVEL.SUCCESS,
    "5_INFO": LOG_LEVEL.INFO,
    "6_LOG": LOG_LEVEL.LOG,
    "7_DEBUG": LOG_LEVEL.DEBUG,
    "8_VERBOSE": LOG_LEVEL.VERBOSE,
    "9_SILLY": LOG_LEVEL.SILLY,
}

export type ColorType = 'Reset' | 'Bright' | 'Dim' | 'Underscore' | 'Blink' | 'Reverse' | 'Hidden' |
    'FgGray' | 'FgBlack' | 'FgRed' | 'FgGreen' | 'FgYellow' | 'FgBlue' | 'FgMagenta' | 'FgCyan' | 'FgWhite' |
    'BgGray' | 'BgBlack' | 'BgRed' | 'BgGreen' | 'BgYellow' | 'BgBlue' | 'BgMagenta' | 'BgCyan' | 'BgWhite';

export type EmojiType = 'none___' | 'empty__' | 'dot____' | 'warn___' | 'check__' | 'cross__' | 'interro' | 'mlstart' | 'mlstep' | 'mlend' | 'mlstart2' | 'mlstep2' | 'mlend2'

