import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Logger as LoggerClass } from '../Logger/index.js'
import { LoggyLogger, Loggy, applyBasePath } from '../index.js'
import { LEVELS } from '../Logger/levels.js'
import { colors } from '../Logger/colors.js'
import { emojis } from '../Logger/emojis.js'
import { JSONBigInt } from '../Utils/JSONBigInt.js'
import path from 'path'

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

    it('should be accessible via Loggy.LEVELS', () => {
        expect(Loggy.LEVELS).toBe(LEVELS)
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

    it('should not be accessible via Loggy.colors', () => {
        expect(Loggy).not.toHaveProperty('colors')
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
        // clear imports
        vi.resetModules()
    })

    afterEach(() => {
        restoreConsole()
    })

    describe('constructor', () => {
        it('should create instance with default config', () => {
            const logger = Loggy.createLogger()
            expect(logger._instance).toBeInstanceOf(LoggerClass)
        })

        it('should create instance with custom config', () => {
            const logger = Loggy.createLogger({ level: LEVELS['7_DEBUG'], colors: false })
            expect(logger._instance.localConfig.level).toBe(LEVELS['7_DEBUG'])
            expect(logger._instance.config.getLevel()).toBe(LEVELS['7_DEBUG'])
            expect(logger._instance.localConfig.colors).toBe(false)
        })

        it('should use global config as fallback when config key is not specified', () => {
            Loggy.setConfig({ level: Loggy.LEVELS['7_DEBUG'], colors: false })
            const logger1 = Loggy.createLogger({ level: LEVELS['7_DEBUG'], colors: false })
            const logger2 = Loggy.createLogger({ level: LEVELS['9_SILLY'], colors: false })
            const logger3 = Loggy.createLogger({ colors: false })
            expect(logger1._instance.localConfig.level).toBe(Loggy.LEVELS['7_DEBUG'])
            expect(logger2._instance.localConfig.level).toBe(Loggy.LEVELS['9_SILLY'])
            expect(logger3._instance.localConfig.level).toBe(Loggy.LEVELS['7_DEBUG'])
            // If global config is changed, logger must inherit
            Loggy.setConfig({ level: Loggy.LEVELS['8_VERBOSE'] })
            expect(logger1._instance.localConfig.level).toBe(Loggy.LEVELS['7_DEBUG']) // Don't change
            expect(logger2._instance.localConfig.level).toBe(Loggy.LEVELS['9_SILLY']) //Don't change
            expect(logger3._instance.localConfig.level).toBe(Loggy.LEVELS['8_VERBOSE']) // change
        })

        it('should accept boundDatas in constructor', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['7_DEBUG'] }, { foo: 'bar' })
            expect(logger._instance.getBoundDatas()).toEqual({ foo: 'bar' })
        })

        it('should stack boundDatas', async () => {
            setupConsoleMock()
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['7_DEBUG'] }, { foo: 'bar' })

            const logBoundMock = vi.fn((boundDatas, ...args) => {
                console.log("bound", boundDatas)
            })

            logger._instance._logBound = logBoundMock

            logger.bind({ foobar: 'baz' }).log('test')
            expect(logger._instance.getBoundDatas()).toEqual({ foo: 'bar' })
            expect(logBoundMock).toHaveBeenCalledTimes(1)
            expect(logBoundMock).toHaveBeenCalledWith({ foobar: 'baz' }, 'test')

        })

        it('should replace bound datas if already set', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['7_DEBUG'] }, { foo: 'bar' })
            
            const logBoundMock = vi.fn((boundDatas, ...args) => {
                console.log("bound", boundDatas)
            })

            logger._instance._logBound = logBoundMock

            logger.bind({ foobar: 'baz' }).log('test')
            expect(logger._instance.getBoundDatas()).toEqual({ foo: 'bar' })
            expect(logBoundMock).toHaveBeenCalledTimes(1)
            expect(logBoundMock).toHaveBeenCalledWith({ foobar: 'baz' }, 'test')

            let logger2 = logger.bind({ foobar: 'baz2' })
            logger2.log('test2')
            expect(logger._instance.getBoundDatas()).toEqual({ foo: 'bar' })
            expect(logBoundMock).toHaveBeenCalledTimes(2)
            expect(logBoundMock).toHaveBeenCalledWith({ foobar: 'baz2' }, 'test2')

            logger2.bind({ foobar: 'baz3' }).log('test3')
            expect(logger._instance.getBoundDatas()).toEqual({ foo: 'bar' })
            expect(logBoundMock).toHaveBeenCalledTimes(3)
            expect(logBoundMock).toHaveBeenCalledWith({ foobar: 'baz3' }, 'test3')
        })
    })

    describe('global config (Logger.conf)', () => {
        it('should set config options', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'], colors: false, emojis: false })
            expect(logger._instance.localConfig.colors).toBe(false)
            expect(logger._instance.localConfig.emojis).toBe(false)
            const logger2 = Loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'], colors: true, emojis: true })
            expect(logger2._instance.localConfig.colors).toBe(true)
            expect(logger2._instance.localConfig.emojis).toBe(true)
        })

        it('should get correct level', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['3_WARN'] })
            expect(logger._instance.localConfig.level).toBe(Loggy.LEVELS['3_WARN'])
            expect(logger._instance.config.getLevel()).toBe(Loggy.LEVELS['3_WARN'])
        })
    })

    describe('instance config', () => {
        it('should set and get instance level', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger._instance.config.setLevel(LEVELS['7_DEBUG'])
            expect(logger._instance.config.getLevel()).toBe(LEVELS['7_DEBUG'])
            logger._instance.config.setLevel(LEVELS['9_SILLY'])
            expect(logger._instance.config.getLevel()).toBe(LEVELS['9_SILLY'])
        })

        it('should not modify instance config when useGlobalConfig is true', () => {
            const logger = Loggy.createLogger({
                level: LEVELS['5_INFO'],
            })
            logger._instance.config.setLevel(LEVELS['8_VERBOSE'])
            expect(logger._instance.localConfig.level).toBe(Loggy.LEVELS['8_VERBOSE'])
            
            Loggy.setConfig({
                level: Loggy.LEVELS['5_INFO']
            })

            expect(logger._instance.localConfig.level).toBe(Loggy.LEVELS['8_VERBOSE'])
        })
    })

    describe('clearConfig', () => {
        it('should clear config overrides from instance', () => {
            Loggy.setConfig({
                level: LEVELS['5_INFO']
            })
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'] })
            expect(logger._instance.localConfig.level).toBe(Loggy.LEVELS['9_SILLY'])
            logger._instance.clearConfig()
            expect(logger._instance.localConfig.level).toBe(Loggy.LEVELS['5_INFO'])
        })
    })

    describe('level filtering', () => {
        it('should output logs of each level when on level', () => {
            const logger_fatal = Loggy.createLogger({ level: Loggy.LEVELS['1_FATAL'] })
            logger_fatal.fatal('test')
            expect(console.log).toHaveBeenCalledTimes(1)

            const logger_error = Loggy.createLogger({ level: Loggy.LEVELS['2_ERROR'] })
            logger_error.error('test')
            expect(console.log).toHaveBeenCalledTimes(2)

            const logger_warn = Loggy.createLogger({ level: Loggy.LEVELS['3_WARN'] })
            logger_warn.warn('test')
            expect(console.log).toHaveBeenCalledTimes(3)

            const logger_success = Loggy.createLogger({ level: Loggy.LEVELS['4_SUCCESS'] })
            logger_success.success('test')
            expect(console.log).toHaveBeenCalledTimes(4)

            const logger_info = Loggy.createLogger({ level: Loggy.LEVELS['5_INFO'] })
            logger_info.info('test')
            expect(console.log).toHaveBeenCalledTimes(5)

            const logger_log = Loggy.createLogger({ level: Loggy.LEVELS['6_LOG'] })
            logger_log.log('test')
            expect(console.log).toHaveBeenCalledTimes(6)

            const logger_debug = Loggy.createLogger({ level: Loggy.LEVELS['7_DEBUG'] })
            logger_debug.debug('test')
            expect(console.log).toHaveBeenCalledTimes(7)

            const logger_verbose = Loggy.createLogger({ level: Loggy.LEVELS['8_VERBOSE'] })
            logger_verbose.verbose('test')
            expect(console.log).toHaveBeenCalledTimes(8)

            const logger_silly = Loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'] })
            logger_silly.silly('test')
            expect(console.log).toHaveBeenCalledTimes(9)

            const logger_default = Loggy.createLogger({ level: Loggy.LEVELS['DEFAULT'] })
            logger_default.log('test')
            expect(console.log).toHaveBeenCalledTimes(10)

        })

        it('should not log when level is too low', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger.log('should not appear')
            logger.debug('should not appear')
            logger.verbose('should not appear')
            logger.silly('should not appear')
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
                const logger = Loggy.createLogger({ level })
                ;(logger as any)[method]('test')
                if (shouldLog) {
                    expect(console.log).toHaveBeenCalled()
                } else {
                    expect(console.log).not.toHaveBeenCalled()
                }
                vi.clearAllMocks()
            })
        })

        it('should not output under level, and output above level when at level: fatal', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['1_FATAL'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(1)
        })
        it('should not output under level, and output above level when at level: error', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['2_ERROR'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(2)
        })
        it('should not output under level, and output above level when at level: warn', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['3_WARN'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(3)
        })
        it('should not output under level, and output above level when at level: success', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['4_SUCCESS'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(4)
        })
        it('should not output under level, and output above level when at level: info', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['5_INFO'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(5)
        })
        it('should not output under level, and output above level when at level: log', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['6_LOG'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(6)
        })
        it('should not output under level, and output above level when at level: debug', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['7_DEBUG'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(7)
        })
        it('should not output under level, and output above level when at level: verbose', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['8_VERBOSE'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(8)
        })
        it('should not output under level, and output above level when at level: silly', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'] })
            logger.fatal('f')
            logger.error('e')
            logger.warn('w')
            logger.success('s')
            logger.info('i')
            logger.log('l')
            logger.debug('d')
            logger.verbose('v')
            logger.silly('s')
            expect(console.log).toHaveBeenCalledTimes(9)
        })

    })

    describe('all log methods', () => {
        it('should have all 9 log methods', () => {
            const logger = Loggy.createLogger({ level: LEVELS['9_SILLY'] })
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

        it('should have a bind method and a _instance property', () => {
            const logger = Loggy.createLogger({ level: LEVELS['9_SILLY'] })
            expect(typeof logger.bind).toBe('function')
            expect(logger._instance).toBeInstanceOf(LoggerClass)
        })

        it('should call all logging methods at silly level', () => {
            const logger = Loggy.createLogger({ level: LEVELS['9_SILLY'] })
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
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger.info('hello world')
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('hello world')
        })

        it('should handle multi-line strings', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger.info('line1\nline2\nline3')
            expect(console.log).toHaveBeenCalledTimes(3)
        })

        it('should join multiple string arguments', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger.info('hello', 'world')
            expect(console.log).toHaveBeenCalledTimes(1)
        })
    })

    describe('object output', () => {
        it('should convert objects when enabled', () => {
            const logger = Loggy.createLogger({
                level: LEVELS['5_INFO'],
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 0,
                colors: false
            })
            logger.info({ arr: [ { obj: { key: "value" } } ] })
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{ arr: [Array] }')
        })

        it('should not expand objects when disabled', () => {
            const logger = Loggy.createLogger({
                level: LEVELS['5_INFO'],
                convertObjects: false,
                convertObjectsColorized: false,
                convertObjectsDepth: 0,
                colors: false
            })
            logger.info({ arr: [ { obj: { key: "value" } } ] })
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('[object Object]')
        })

        it('should expand objects to the correct depth when enabled', () => {
            
            const logger0 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 0
            })
            const logger1 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 1
            })
            const logger2 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 2
            })
            const logger3 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 3
            })
            const logger4 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 4
            })
            const logger5 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 5
            })
            const logger6 = Loggy.createLogger({
                level: Loggy.LEVELS['9_SILLY'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsColorized: false,
                convertObjectsDepth: 6
            })
            
            const obj = { arr: [ { obj: { key: { subvalue: [ "value1", { v: { foo: "bar" }} ] } } } ] }

            logger0.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{ arr: [Array] }')
            setupConsoleMock()
            expect(consoleOutput.length).toBe(0)

            logger1.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{ arr: [ [Object] ] }')
            setupConsoleMock()
            
            logger2.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{ arr: [ { obj: [Object] } ] }')
            setupConsoleMock()
            
            logger3.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{')
            expect(consoleOutput[1]).toContain('  arr: [ { obj: { key: [Object] } } ]')
            expect(consoleOutput[2]).toContain('}')
            setupConsoleMock()
            
            logger4.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain('{')
            expect(consoleOutput[1]).toContain('  arr: [')
            expect(consoleOutput[2]).toContain('    { obj: { key: { subvalue: [Array] } } }')
            expect(consoleOutput[3]).toContain('  ]')
            expect(consoleOutput[4]).toContain('}')
            setupConsoleMock()
            
            logger5.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain(`{`)
            expect(consoleOutput[1]).toContain(`  arr: [`)
            expect(consoleOutput[2]).toContain(`    {`)
            expect(consoleOutput[3]).toContain(`      obj: { key: { subvalue: [ 'value1', [Object] ] } }`)
            expect(consoleOutput[4]).toContain(`    }`)
            expect(consoleOutput[5]).toContain(`  ]`)
            expect(consoleOutput[6]).toContain(`}`)
            setupConsoleMock()
            
            logger6.info(obj)
            expect(console.log).toHaveBeenCalled()
            expect(consoleOutput[0]).toContain(`{`)
            expect(consoleOutput[1]).toContain(`  arr: [`)
            expect(consoleOutput[2]).toContain(`    {`)
            expect(consoleOutput[3]).toContain(`      obj: {`)
            expect(consoleOutput[4]).toContain(`        key: { subvalue: [ 'value1', { v: [Object] } ] }`)
            expect(consoleOutput[5]).toContain(`      }`)
            expect(consoleOutput[6]).toContain(`    }`)
            expect(consoleOutput[7]).toContain(`  ]`)
            expect(consoleOutput[8]).toContain(`}`)
        })

        it('should not display object colorization when disabled', () => {
            const logger = Loggy.createLogger({
                level: LEVELS['5_INFO'],
                colors: false,
                emojis: false,
                convertObjects: true,
                convertObjectsDepth: 3,
                convertObjectsColorized: false
            })
            logger.info("test")
            logger.info({ test: [ "test", 1, 2, 3] })
            let console_output_without_reset = consoleOutput.join("\n").split('\x1b[0m').join("")
            expect(console_output_without_reset).not.toContain('\x1b[')
        })
        it('should display object colorization when enabled', () => {
            const logger = Loggy.createLogger({
                level: LEVELS['5_INFO'],
                colors: false,
                convertObjects: true,
                convertObjectsDepth: 3,
                convertObjectsColorized: true
            })
            logger.info("test")
            logger.info({ test: [ "test", 1, 2, 3] })
            expect(consoleOutput.join("\n")).toContain('\x1b[')
        })

    })

    describe('colors and emojis', () => {
        it('should include colors when enabled', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'], colors: true })
            logger.info('test')
            expect(consoleOutput[0]).toContain('\x1b[')
        })

        it('should exclude colors when disabled', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'], colors: false, emojis: false })
            logger.info('test')
            expect(consoleOutput[0]).not.toContain('\x1b[')
        })
    })

    describe('date formatting', () => {
        it('should clean date when cleanDate is true', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'], cleanDate: true })
            logger.info('_')
            expect(consoleOutput[0]).not.toContain('T')
            expect(consoleOutput[0]).not.toContain('Z')
        })
        it('should display ISO date when cleanDate is false', () => {
            // mock date
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'], cleanDate: false })
            logger.info('_')
            expect(consoleOutput[0]).toContain('T')
            expect(consoleOutput[0]).toContain('Z')
        })
    })

    describe('broadcast', () => {
        it('should call broadcast function when set', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            const broadcast = vi.fn()
            logger._instance.setBroadcast(broadcast)
            logger.info('test')
            expect(broadcast).toHaveBeenCalledWith('info', expect.any(String), expect.any(Date), ['test'], {})
        })

        it('should not call broadcast when undefined', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'] })
            logger._instance.setBroadcast(undefined)
            expect(() => logger.info('test')).not.toThrow()
        })
    })

    describe('callLineGetter', () => {
        it('should use custom call line getter', () => {
            const logger = Loggy.createLogger({ level: LEVELS['5_INFO'], showCallLines: true })
            logger._instance.setCallLineGetter(() => '/custom/line/path/file.js:123')
            logger.info('test')
            expect(consoleOutput[0]).toContain('/custom/line/path/file.js:123')
        })
        
        it('should remove the base path of the callline', () => {
            expect(applyBasePath('/custom/base/path', undefined)).toBe('/custom/base/path')
            expect(applyBasePath('/custom/base/path/', undefined)).toBe('/custom/base/path/')
            expect(applyBasePath('/custom/base/path', '/test')).toBe('/custom/base/path')
            expect(applyBasePath('/custom/base/path/', '/custom/')).toBe('./base/path/')
            expect(applyBasePath('/custom/base/path', '/custom')).toBe('./base/path')
            expect(applyBasePath('/custom/base/path/', '/custom/base/')).toBe('./path/')
            expect(applyBasePath('/custom/base/path', '/custom/base')).toBe('./path')
        })
    })

    describe('bound logging methods', () => {
        it('should have bound logging methods', () => {
            const logger = Loggy.createLogger({ level: LEVELS['8_VERBOSE'] })
            const extra = { requestId: 'abc' }
            logger._instance._verboseBound(extra, 'v')
            logger._instance._debugBound(extra, 'd')
            logger._instance._logBound(extra, 'l')
            logger._instance._infoBound(extra, 'i')
            logger._instance._successBound(extra, 's')
            logger._instance._warnBound(extra, 'w')
            logger._instance._errorBound(extra, 'e')
            logger._instance._fatalBound(extra, 'f')
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
        vi.resetModules()
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
        it('should enable production mode in run time', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            logger.info('test')
            expect(loggy.isProduction()).toBe(false)
            loggy.enableProduction({})
            expect(loggy.isProduction()).toBe(true)
        })
    })

    describe('LEVELS access', () => {
        it('should expose LEVELS', () => {
            const loggy = new LoggyLogger()
            expect(loggy.LEVELS).toBe(LEVELS)
        })
    })

    describe('setConfig', () => {
        it('should set config options', () => {
            const loggy = new LoggyLogger()
            loggy.setConfig({ level: LEVELS['8_VERBOSE'] })
            expect(loggy.getLevel()).toBe(LEVELS['8_VERBOSE'])
        })

        it('should normalize basePath', () => {
            let test_path1 = path.resolve('/some/path')
            const loggy = new LoggyLogger()
            loggy.setConfig({ basePath: test_path1 })
            // basePath should be set without errors
            const logger = loggy.createLogger()
            expect(logger).toBeDefined()
            expect(loggy.getBasePath()).toBe(test_path1)
            
            let test_path2 = path.resolve('/some/path/') // with trailing slash
            const loggy2 = new LoggyLogger()
            loggy2.setConfig({ basePath: test_path2 })
            // basePath should be set without errors
            const logger2 = loggy2.createLogger()
            expect(logger2).toBeDefined()
            expect(loggy2.getBasePath()).toBe(test_path2)
        })
    })

    describe('setLevel / getLevel', () => {
        it('should set and get level', () => {
            const loggy = new LoggyLogger()
            loggy.setLevel(LEVELS['7_DEBUG'])
            expect(loggy.getLevel()).toBe(LEVELS['7_DEBUG'])

            loggy.setLevel(LEVELS['8_VERBOSE'])
            expect(loggy.getLevel()).toBe(LEVELS['8_VERBOSE'])
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
            expect(logger._instance).toBeInstanceOf(LoggerClass)
        })

        it('should log through created logger', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()
            logger.info('test message')
            expect(console.log).toHaveBeenCalledTimes(1)
        })

        it('should accept config for logger', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger({ level: LEVELS['9_SILLY'] })
            logger.silly('verbose message')
            expect(console.log).toHaveBeenCalledTimes(1)
        })

        it('should accept full config for logger', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger({
                level:                      Loggy.LEVELS['9_SILLY'],
                colors:                     true,
                emojis:                     true,
                showCallLines:              true,
                cleanDate:                  true,
                convertObjects:             true,
                convertObjectsColorized:    true,
                convertObjectsDepth:        2,
                basePath:                   process.cwd(),
            })
            logger.silly('verbose message')
            expect(console.log).toHaveBeenCalledTimes(1)
        })

    })

    describe('bind', () => {
        it('should create bound logger with extra data', () => {
            const loggy = new LoggyLogger()
            const boundLogger = loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'] }, { requestId: '123' })
            boundLogger.info('test message')
            expect(typeof boundLogger.info).toBe('function')
            expect(console.log).toHaveBeenCalled()
            expect(boundLogger._instance.getBoundDatas()).toEqual({ requestId: '123' })
        })

        it('should chain binds', () => {
            vi.resetAllMocks()
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger()

            const logBoundMock = vi.fn((boundDatas, ...args) => {
                console.log('bound', boundDatas)
            })
            logger._instance._logBound = logBoundMock

            const bound1 = logger.bind({ a: 1 })
            const bound2 = bound1.bind({ b: 2 })
            const bound3 = bound2.bind({ c: 3 })
            bound2.log('chained')
            expect(logBoundMock).toHaveBeenCalledWith({ a: 1, b: 2 }, 'chained')
            bound3.log('chained')
            expect(logBoundMock).toHaveBeenCalledWith({ a: 1, b: 2, c: 3 }, 'chained')
        })

        it('should override bound data', () => {
            const loggy = new LoggyLogger()
            const logger = loggy.createLogger({ level: Loggy.LEVELS['9_SILLY'] })
            
            const logBoundMock = vi.fn((boundDatas, ...args) => {
                console.log("bound", boundDatas)
            })
            logger._instance._logBound = logBoundMock

            const bound1 = logger.bind({ a: 1 })
            bound1.log('chained')
            expect(logBoundMock).toHaveBeenCalledWith({ a: 1 }, 'chained')
            const bound2 = bound1.bind({ b: 2 })
            bound2.log('chained')
            expect(logBoundMock).toHaveBeenCalledWith({ a:1, b: 2 }, 'chained')
            const bound3 = bound2.bind({ a: 3 })
            bound3.log('chained')
            expect(logBoundMock).toHaveBeenCalledWith({ a: 3, b: 2 }, 'chained')
            bound2.log('chained')
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

        it('should apply production to existing loggers', () => {
            const loggy = new LoggyLogger()
            
            loggy.setConfig({
                colors: true,
                convertObjects: true,
                convertObjectsColorized: true,
                convertObjectsDepth: 2,
                showCallLines: true,
                basePath: "/mockpath"
            })

            const logger = loggy.createLogger()

            expect(logger._instance.localConfig.colors).toBe(true)
            expect(logger._instance.localConfig.convertObjects).toBe(true)
            expect(logger._instance.localConfig.showCallLines).toBe(true)

            loggy.enableProduction({
                settings: {
                    colors: false,
                    objectInspect: false,
                    showCallLines: false,
                    basePath: "/some/path"
                }
            })
            expect(logger._instance.localConfig.colors).toBe(false)
            expect(logger._instance.localConfig.convertObjects).toBe(false)
            expect(logger._instance.localConfig.showCallLines).toBe(false)
        })
        
        it('should apply production to new loggers', () => {
            const loggy = new LoggyLogger()

            loggy.setConfig({
                colors: true,
                convertObjects: true,
                convertObjectsColorized: true,
                convertObjectsDepth: 2,
                showCallLines: true,
                basePath: "/mockpath"
            })

            loggy.enableProduction({
                settings: {
                    colors: false,
                    objectInspect: false,
                    showCallLines: false,
                    basePath: "/some/path"
                }
            })
            const logger = loggy.createLogger()
            expect(logger._instance.localConfig.colors).toBe(false)
            expect(logger._instance.localConfig.convertObjects).toBe(false)
            expect(logger._instance.localConfig.showCallLines).toBe(false)
        })

        it('should keep logger specific override in production', () => {
            const loggy = new LoggyLogger()

            loggy.setConfig({
                colors: false,
                convertObjects: false,
                convertObjectsColorized: false,
                convertObjectsDepth: 2,
                showCallLines: false,
                basePath: "/mockpath"
            })
            
            const logger_before_prod = loggy.createLogger({
                colors: true,
                convertObjects: true,
                convertObjectsColorized: true,
                convertObjectsDepth: 5,
                showCallLines: true,
            })


            loggy.enableProduction({
                settings: {
                    colors: false,
                    objectInspect: false,
                    showCallLines: false,
                    basePath: "/some/path"
                }
            })
            const logger_after_prod = loggy.createLogger({
                colors: true,
                convertObjects: true,
                convertObjectsColorized: true,
                convertObjectsDepth: 5,
                showCallLines: true,
            })

            expect(logger_before_prod._instance.localConfig.colors).toBe(true)
            expect(logger_before_prod._instance.localConfig.convertObjects).toBe(true)
            expect(logger_before_prod._instance.localConfig.convertObjectsColorized).toBe(true)
            expect(logger_before_prod._instance.localConfig.convertObjectsDepth).toBe(5)
            expect(logger_before_prod._instance.localConfig.showCallLines).toBe(true)

            expect(logger_after_prod._instance.localConfig.colors).toBe(true)
            expect(logger_after_prod._instance.localConfig.convertObjects).toBe(true)
            expect(logger_after_prod._instance.localConfig.convertObjectsColorized).toBe(true)
            expect(logger_after_prod._instance.localConfig.convertObjectsDepth).toBe(5)
            expect(logger_after_prod._instance.localConfig.showCallLines).toBe(true)

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

    })
})

// ============================================================================
// DEFAULT INSTANCE (Loggy)
// ============================================================================
describe('Loggy (default instance)', () => {
    beforeEach(() => {
        setupConsoleMock()
        vi.resetModules()
    })

    afterEach(() => {
        restoreConsole()
    })

    it('should be a LoggyLogger instance', () => {
        expect(Loggy).toBeInstanceOf(LoggyLogger)
    })

    it('should create loggers', () => {
        const logger = Loggy.createLogger({
            level: LEVELS['9_SILLY']
        })
        logger.warn('test')
        expect(logger).toBeDefined()
        expect(logger._instance).toBeInstanceOf(LoggerClass)
    })

    it('should work with every function on silly level', () => {
        Loggy.setConfig({
            level: Loggy.LEVELS['9_SILLY']
        })
        const logger = Loggy.createLogger({
            level: LEVELS['9_SILLY']
        })

        logger.silly("hello")
        logger.verbose("hello")
        logger.debug("hello")
        logger.log("hello")
        logger.info("hello")
        logger.success("hello")
        logger.warn("hello")
        logger.error("hello")
        logger.fatal("hello")

        expect(console.log).toHaveBeenCalledTimes(9)
    })

    it('should have LEVELS', () => {
        expect(Loggy.LEVELS).toBe(LEVELS)
    })

    it('should not crash', () => {
        Loggy.setConfig({
            level: Loggy.LEVELS['9_SILLY'],
            colors: true,
            emojis: true,
            "showCallLines": true,
            "convertObjects": true,
            "convertObjectsColorized": true,
            "convertObjectsDepth": 2,
            "basePath": __dirname
        })

        const logger = Loggy.createLogger()

        logger.silly("hello")
        logger.verbose("hello")
        logger.debug("hello")
        logger.log("hello")
        logger.info("hello")
        logger.success("hello")
        logger.warn("hello")
        logger.error("hello")
        logger.fatal("hello")

        expect(console.log).toHaveBeenCalledTimes(9)
    })


    it('should enable and disable production mode', () => {
        expect(Loggy.isProduction()).toBe(false)
        Loggy.enableProduction({
            settings: {
                colors: false,
                objectInspect: false,
                showCallLines: false,
                basePath: "/some/path"
            }
        })
        expect(Loggy.isProduction()).toBe(true)
        Loggy.disableProduction()
        expect(Loggy.isProduction()).toBe(false)
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

    it('should not start')
    

})