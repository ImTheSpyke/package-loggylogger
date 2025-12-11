import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Logger } from '../Logger/index.js'
import { LoggyLogger, Loggy } from '../index.js'
import { LEVELS } from '../Logger/levels.js'
import { colors } from '../Logger/colors.js'
import { emojis } from '../Logger/emojis.js'
import { JSONBigInt } from '../Utils/JSONBigInt.js'

// Mock console.log for all tests
let consoleOutput: string[]
let originalConsoleLog: typeof console.log

function setupConsoleMock() {
    consoleOutput = []
    originalConsoleLog = console.log
    console.log = vi.fn((...args: unknown[]) => {
        consoleOutput.push(args.map(String).join(' '))
    })
}

function restoreConsole() {
    console.log = originalConsoleLog
}

function resetGlobalConfig() {
    Logger.globalConfig = {
        level: LEVELS.DEFAULT,
        colors: true,
        emojis: true,
        showCallLines: false,
        cleanDate: true,
        convertObjects: false,
        convertObjectsColorized: true,
        convertObjectsDepth: 2
    }
}

// ============================================================================
// LEVELS
// ============================================================================
describe('LEVELS', () => {
    it('should have correct level values', () => {
        expect(LEVELS['1_FATAL']).toBe(10)
        expect(LEVELS['2_ERROR']).toBe(20)
        expect(LEVELS['3_WARN']).toBe(30)
        expect(LEVELS['4_SUCCESS']).toBe(40)
        expect(LEVELS['5_INFO']).toBe(50)
        expect(LEVELS['6_LOG']).toBe(60)
        expect(LEVELS['7_DEBUG']).toBe(70)
        expect(LEVELS['8_VERBOSE']).toBe(80)
        expect(LEVELS['9_SILLY']).toBe(90)
        expect(LEVELS.DEFAULT).toBe(60)
    })

    it('should be accessible via Logger.LEVELS', () => {
        expect(Logger.LEVELS).toBe(LEVELS)
    })
})

// ============================================================================
// COLORS
// ============================================================================
describe('colors', () => {
    it('should have reset code', () => {
        expect(colors.Reset).toBe('\x1b[0m')
    })

    it('should have foreground colors', () => {
        expect(colors.FgRed).toBe('\x1b[31m')
        expect(colors.FgGreen).toBe('\x1b[32m')
        expect(colors.FgBlue).toBe('\x1b[34m')
        expect(colors.FgWhite).toBe('\x1b[37m')
    })

    it('should have background colors', () => {
        expect(colors.BgRed).toBe('\x1b[41m')
        expect(colors.BgGreen).toBe('\x1b[42m')
        expect(colors.BgBlue).toBe('\x1b[44m')
    })

    it('should be accessible via Logger.colors', () => {
        expect(Logger.colors).toBe(colors)
    })
})

// ============================================================================
// EMOJIS
// ============================================================================
describe('emojis', () => {
    it('should have standard emojis', () => {
        expect(emojis.dot____).toBe('•')
        expect(emojis.warn___).toBe('⚠')
        expect(emojis.cross__).toBe('🞪')
    })

    it('should have multiline emojis', () => {
        expect(emojis.mlstart).toBe('┠')
        expect(emojis.mlstep).toBe('┇')
        expect(emojis.mlend).toBe('┇')
    })

    it('should be accessible via Logger.emojis', () => {
        expect(Logger.emojis).toBe(emojis)
    })
})

// ============================================================================
// JSONBigInt UTILITY
// ============================================================================
describe('JSONBigInt', () => {
    it('should stringify bigint values', () => {
        const data = { value: BigInt('12345678901234567890') }
        const json = JSONBigInt.stringify(data)
        expect(json).toContain('_type')
        expect(json).toContain('bigint')
        expect(json).toContain('12345678901234567890')
    })

    it('should parse bigint values back', () => {
        const data = { value: BigInt('12345678901234567890') }
        const json = JSONBigInt.stringify(data)
        const parsed = JSONBigInt.parse(json)
        expect(parsed.value).toBe(BigInt('12345678901234567890'))
    })

    it('should handle regular values', () => {
        const data = { str: 'test', num: 42, bool: true }
        const json = JSONBigInt.stringify(data)
        const parsed = JSONBigInt.parse(json)
        expect(parsed).toEqual(data)
    })

    it('should handle nested objects with bigint', () => {
        const data = { nested: { big: BigInt(999) } }
        const json = JSONBigInt.stringify(data)
        const parsed = JSONBigInt.parse(json)
        expect(parsed.nested.big).toBe(BigInt(999))
    })
})

// ============================================================================
// LOGGER CLASS
// ============================================================================
describe('Logger', () => {
    beforeEach(() => {
        setupConsoleMock()
        resetGlobalConfig()
    })

    afterEach(() => {
        restoreConsole()
    })

    describe('constructor', () => {
        it('should create instance with default config', () => {
            const logger = new Logger()
            expect(logger).toBeInstanceOf(Logger)
        })

        it('should create instance with custom config', () => {
            const logger = new Logger({ level: LEVELS['7_DEBUG'], colors: false })
            expect(logger.localConfig.level).toBe(LEVELS['7_DEBUG'])
            expect(logger.localConfig.colors).toBe(false)
        })

        it('should use global config when useGlobalConfig is true', () => {
            Logger.conf.setLevel(LEVELS['8_VERBOSE'])
            const logger = new Logger({}, true)
            expect(logger.localConfig.level).toBe(LEVELS['8_VERBOSE'])
        })

        it('should accept boundDatas in constructor', () => {
            const logger = new Logger({}, false, { userId: 123 })
            expect(logger).toBeInstanceOf(Logger)
        })
    })

    describe('global config (Logger.conf)', () => {
        it('should set config options', () => {
            Logger.conf.set({ colors: false, emojis: false })
            expect(Logger.globalConfig.colors).toBe(false)
            expect(Logger.globalConfig.emojis).toBe(false)
        })

        it('should set and get level', () => {
            Logger.conf.setLevel(LEVELS['7_DEBUG'])
            expect(Logger.conf.getLevel()).toBe(LEVELS['7_DEBUG'])
        })

        it('should toggle colors without argument', () => {
            const original = Logger.globalConfig.colors
            Logger.conf.toggleColors()
            expect(Logger.globalConfig.colors).toBe(!original)
        })

        it('should set colors to specific value', () => {
            Logger.conf.toggleColors(false)
            expect(Logger.globalConfig.colors).toBe(false)
            Logger.conf.toggleColors(true)
            expect(Logger.globalConfig.colors).toBe(true)
        })
    })

    describe('instance config', () => {
        it('should set and get instance level', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.config.setLevel(LEVELS['7_DEBUG'])
            expect(logger.config.getLevel()).toBe(LEVELS['7_DEBUG'])
        })

        it('should toggle instance colors', () => {
            const logger = new Logger({ colors: true })
            logger.config.toggleColors(false)
            expect(logger.localConfig.colors).toBe(false)
        })

        it('should not modify instance config when useGlobalConfig is true', () => {
            const logger = new Logger({}, true)
            logger.config.setLevel(LEVELS['8_VERBOSE'])
            expect(Logger.globalConfig.level).toBe(LEVELS.DEFAULT)
        })
    })

    describe('reloadConfig', () => {
        it('should reload config from global', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            expect(logger.localConfig.level).toBe(LEVELS['5_INFO'])
            logger.reloadConfig()
            expect(logger.localConfig.level).toBe(LEVELS.DEFAULT)
        })
    })

    describe('level filtering', () => {
        it('should log when level allows', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.info('test')
            expect(console.log).toHaveBeenCalled()
        })

        it('should not log when level is too low', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.debug('should not appear')
            expect(console.log).not.toHaveBeenCalled()
        })

        it('should filter each level correctly', () => {
            const tests = [
                { level: LEVELS['1_FATAL'], method: 'fatal', shouldLog: true },
                { level: LEVELS['2_ERROR'], method: 'error', shouldLog: true },
                { level: LEVELS['3_WARN'], method: 'warn', shouldLog: true },
                { level: LEVELS['4_SUCCESS'], method: 'success', shouldLog: true },
                { level: LEVELS['5_INFO'], method: 'info', shouldLog: true },
                { level: LEVELS['6_LOG'], method: 'log', shouldLog: true },
                { level: LEVELS['7_DEBUG'], method: 'debug', shouldLog: true },
                { level: LEVELS['8_VERBOSE'], method: 'verbose', shouldLog: true },
            ]

            tests.forEach(({ level, method, shouldLog }) => {
                resetGlobalConfig()
                const logger = new Logger({ level })
                ;(logger as any)[method]('test')
                if (shouldLog) {
                    expect(console.log).toHaveBeenCalled()
                }
                vi.clearAllMocks()
            })
        })

        it('should not log verbose when at info level', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.verbose('test')
            expect(console.log).not.toHaveBeenCalled()
        })
        it('should not log silly when at info level', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.silly('test')
            expect(console.log).not.toHaveBeenCalled()
        })
        it('should not log log when at info level', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.log('test')
            expect(console.log).not.toHaveBeenCalled()
        })
    })

    describe('all log methods', () => {
        it('should have all 9 log methods', () => {
            const logger = new Logger({ level: LEVELS['9_SILLY'] })
            expect(typeof logger.silly).toBe('function')
            expect(typeof logger.verbose).toBe('function')
            expect(typeof logger.debug).toBe('function')
            expect(typeof logger.log).toBe('function')
            expect(typeof logger.info).toBe('function')
            expect(typeof logger.success).toBe('function')
            expect(typeof logger.warn).toBe('function')
            expect(typeof logger.error).toBe('function')
            expect(typeof logger.fatal).toBe('function')
        })

        it('should call all methods at silly level', () => {
            const logger = new Logger({ level: LEVELS['9_SILLY'] })
            logger.silly('s')
            logger.verbose('v')
            logger.debug('d')
            logger.log('l')
            logger.info('i')
            logger.success('s')
            logger.warn('w')
            logger.error('e')
            logger.fatal('f')
            expect(console.log).toHaveBeenCalledTimes(9)
        })
    })

    describe('string output', () => {
        it('should log simple strings', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.info('hello world')
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('hello world')
        })

        it('should handle multi-line strings', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.info('line1\nline2\nline3')
            expect(console.log).toHaveBeenCalledTimes(3)
        })

        it('should join multiple string arguments', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.info('hello', 'world')
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('object output', () => {
        it('should convert objects when enabled', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], convertObjects: true })
            logger.info({ key: 'value' })
            expect(console.log).toHaveBeenCalled()
        })

        it('should not expand objects when disabled', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], convertObjects: false })
            logger.info({ key: 'value' })
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('colors and emojis', () => {
        it('should include colors when enabled', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], colors: true })
            logger.info('test')
            expect(consoleOutput[0]).toContain('\x1b[')
        })

        it('should exclude colors when disabled', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], colors: false, emojis: false })
            logger.info('test')
            expect(consoleOutput[0]).not.toContain('\x1b[')
        })
    })

    describe('date formatting', () => {
        it('should clean date when cleanDate is true', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], cleanDate: true })
            logger.info('test')
            expect(consoleOutput[0]).not.toContain('T')
            expect(consoleOutput[0]).not.toContain('Z')
        })
    })

    describe('broadcast', () => {
        it('should call broadcast function when set', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            const broadcast = vi.fn()
            logger.setBroadcast(broadcast)
            logger.info('test')
            expect(broadcast).toHaveBeenCalledWith('info', expect.any(String), expect.any(Date), ['test'], {})
        })

        it('should not call broadcast when undefined', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'] })
            logger.setBroadcast(undefined)
            expect(() => logger.info('test')).not.toThrow()
        })
    })

    describe('callLineGetter', () => {
        it('should use custom call line getter', () => {
            const logger = new Logger({ level: LEVELS['5_INFO'], showCallLines: true })
            logger.setCallLineGetter(() => 'custom:123')
            logger.info('test')
            expect(consoleOutput[0]).toContain('custom:123')
        })
    })

    describe('bound logging methods', () => {
        it('should have bound logging methods', () => {
            const logger = new Logger({ level: LEVELS['8_VERBOSE'] })
            const extra = { requestId: 'abc' }
            logger._verboseBound(extra, 'v')
            logger._debugBound(extra, 'd')
            logger._logBound(extra, 'l')
            logger._infoBound(extra, 'i')
            logger._successBound(extra, 's')
            logger._warnBound(extra, 'w')
            logger._errorBound(extra, 'e')
            logger._fatalBound(extra, 'f')
            expect(console.log).toHaveBeenCalledTimes(8)
        })
    })
})

// ============================================================================
// LOGGYLOGGER CLASS
// ============================================================================
describe('LoggyLogger', () => {
    beforeEach(() => {
        setupConsoleMock()
        resetGlobalConfig()
    })

    afterEach(() => {
        restoreConsole()
    })

    describe('constructor', () => {
        it('should create with no options', () => {
            const loggy = new LoggyLogger()
            expect(loggy).toBeInstanceOf(LoggyLogger)
        })

        it('should apply initial config', () => {
            const loggy = new LoggyLogger({ config: { level: LEVELS['7_DEBUG'] } })
            expect(loggy.getLevel()).toBe(LEVELS['7_DEBUG'])
        })

        it('should enable production mode in constructor', () => {
            const loggy = new LoggyLogger({ production: true })
            expect(loggy.isProduction()).toBe(true)
        })
    })

    describe('LEVELS access', () => {
        it('should expose LEVELS', () => {
            const loggy = new LoggyLogger()
            expect(loggy.LEVELS).toBe(Logger.LEVELS)
        })
    })

    describe('setConfig', () => {
        it('should set config options', () => {
            const loggy = new LoggyLogger()
            loggy.setConfig({ level: LEVELS['8_VERBOSE'] })
            expect(loggy.getLevel()).toBe(LEVELS['8_VERBOSE'])
        })

        it('should normalize basePath', () => {
            const loggy = new LoggyLogger()
            loggy.setConfig({ basePath: '/some/path/' })
            // basePath should be set without errors
            const logger = loggy.createLogger()
            expect(logger).toBeDefined()
        })
    })

    describe('setLevel / getLevel', () => {
        it('should set and get level', () => {
            const loggy = new LoggyLogger()
            loggy.setLevel(LEVELS['7_DEBUG'])
            expect(loggy.getLevel()).toBe(LEVELS['7_DEBUG'])
        })
    })

    describe('toggleColors', () => {
        it('should toggle colors', () => {
            const loggy = new LoggyLogger()
            const original = Logger.globalConfig.colors
            loggy.toggleColors()
            expect(Logger.globalConfig.colors).toBe(!original)
        })
    })

    describe('createLogger', () => {
        it('should create a logger interface', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            expect(typeof logger.silly).toBe('function')
            expect(typeof logger.verbose).toBe('function')
            expect(typeof logger.debug).toBe('function')
            expect(typeof logger.log).toBe('function')
            expect(typeof logger.info).toBe('function')
            expect(typeof logger.success).toBe('function')
            expect(typeof logger.warn).toBe('function')
            expect(typeof logger.error).toBe('function')
            expect(typeof logger.fatal).toBe('function')
            expect(typeof logger.bind).toBe('function')
        })

        it('should log through created logger', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            logger.info('test message')
            expect(console.log).toHaveBeenCalled()
        })

        it('should accept config for logger', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger({ level: LEVELS['9_SILLY'] })
            logger.silly('verbose message')
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('bind', () => {
        it('should create bound logger with extra data', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            const boundLogger = logger.bind({ requestId: '123' })
            expect(typeof boundLogger.info).toBe('function')
            boundLogger.info('test')
            expect(console.log).toHaveBeenCalled()
        })

        it('should chain binds', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            const bound1 = logger.bind({ a: 1 })
            const bound2 = bound1.bind({ b: 2 })
            bound2.info('chained')
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('production mode', () => {
        it('should enable production', () => {
            const loggy = new LoggyLogger()
            loggy.enableProduction()
            expect(loggy.isProduction()).toBe(true)
        })

        it('should disable production', () => {
            const loggy = new LoggyLogger({ production: true })
            loggy.disableProduction()
            expect(loggy.isProduction()).toBe(false)
        })

        it('should keep fatal and error by default in production', () => {
            const loggy = new LoggyLogger({ production: true })
            const logger = loggy.createLogger()
            logger.fatal('fatal')
            logger.error('error')
            expect(console.log).toHaveBeenCalledTimes(2)
        })

        it('should disable other methods in production by default', () => {
            const loggy = new LoggyLogger({ production: true })
            const logger = loggy.createLogger()
            logger.silly('silly')
            logger.verbose('verbose')
            logger.debug('debug')
            logger.log('log')
            logger.info('info')
            logger.success('success')
            logger.warn('warn')
            expect(console.log).not.toHaveBeenCalled()
            logger.error('error')
            logger.fatal('fatal')
            expect(console.log).toHaveBeenCalledTimes(2)
        })

        it('should enable specific methods via productionConfig', () => {
            const loggy = new LoggyLogger({
                production: true,
                productionConfig: { logs: { info: true, warn: true } }
            })
            const logger = loggy.createLogger()
            logger.info('info')
            logger.warn('warn')
            expect(console.log).toHaveBeenCalledTimes(2)
        })

        it('should apply production settings', () => {
            const loggy = new LoggyLogger({
                production: true,
                productionConfig: {
                    settings: { colors: false, objectInspect: false, callLine: false }
                }
            })
            expect(Logger.globalConfig.colors).toBe(false)
            expect(Logger.globalConfig.convertObjects).toBe(false)
            expect(Logger.globalConfig.showCallLines).toBe(false)
        })

        it('should respect production logs on bound loggers', () => {
            const loggy = new LoggyLogger({
                production: true,
                productionConfig: { logs: { info: false } }
            })
            const logger = loggy.createLogger()
            const bound = logger.bind({ x: 1 })
            bound.info('should not log')
            expect(console.log).not.toHaveBeenCalled()
        })
    })

    describe('basePath', () => {
        it('should set basePath via config', () => {
            const loggy = new LoggyLogger({ config: { basePath: '/project' } })
            const logger = loggy.createLogger()
            expect(logger).toBeDefined()
        })

        it('should allow logger to override basePath', () => {
            const loggy = new LoggyLogger({ config: { basePath: '/project' } })
            const logger = loggy.createLogger({ basePath: '/other' })
            expect(logger).toBeDefined()
        })

        it('should set basePath via production settings', () => {
            const loggy = new LoggyLogger({
                production: true,
                productionConfig: { settings: { basePath: '/prod/path' } }
            })
            const logger = loggy.createLogger()
            expect(logger).toBeDefined()
        })

        it('should update existing loggers when basePath changes', () => {
            const loggy = new LoggyLogger()
            const logger1 = loggy.createLogger()
            loggy.setConfig({ basePath: '/new/path' })
            const logger2 = loggy.createLogger()
            expect(logger1).toBeDefined()
            expect(logger2).toBeDefined()
        })
    })
})

// ============================================================================
// DEFAULT INSTANCE (Loggy)
// ============================================================================
describe('Loggy (default instance)', () => {
    beforeEach(() => {
        setupConsoleMock()
        resetGlobalConfig()
    })

    afterEach(() => {
        restoreConsole()
    })

    it('should be a LoggyLogger instance', () => {
        expect(Loggy).toBeInstanceOf(LoggyLogger)
    })

    it('should create loggers', () => {
        const logger = Loggy.createLogger()
        expect(logger).toBeDefined()
        logger.info('test')
        expect(console.log).toHaveBeenCalled()
    })

    it('should have LEVELS', () => {
        expect(Loggy.LEVELS).toBe(LEVELS)
    })


    it('should not crash', () => {
        const Loggy2 = new LoggyLogger()
        Loggy2.setConfig({
            level: Loggy.LEVELS['9_SILLY'],
            colors: true,
            emojis: true,
            "showCallLines": true,
            "convertObjects": true,
            "convertObjectsColorized": true,
            "convertObjectsDepth": 2,
            "basePath": __dirname
        })

        const Logger = Loggy2.createLogger()

        Logger.silly("hello")
        Logger.verbose("hello")
        Logger.debug("hello")
        Logger.log("hello")
        Logger.info("hello")
        Logger.success("hello")
        Logger.warn("hello")
        Logger.error("hello")
        Logger.fatal("hello")

        expect(console.log).toHaveBeenCalledTimes(9)

    })
})

// ============================================================================
// Dashboard
// ============================================================================
describe('Dashboard', () => {

    it('should start dashboard', () => {
        const loggy = new LoggyLogger()
        loggy.startDashboard()
        expect((loggy as any)._server).toBeDefined()
        console.log('loggy: ', (loggy as any)._server)
    })
    

})