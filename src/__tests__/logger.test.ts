import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Loggy, { LoggyLogger } from '../Logger/index.js'

describe('LoggyLogger', () => {
    let originalConsoleLog: typeof console.log
    let consoleOutput: string[]

    beforeEach(() => {
        consoleOutput = []
        originalConsoleLog = console.log
        console.log = vi.fn((...args: unknown[]) => {
            consoleOutput.push(args.map(String).join(' '))
        })
        
        // Reset global config
        LoggyLogger.globalConfig = {
            level: 60,
            colors: true,
            emojis: true,
            showCallLines: false,
            cleanDate: true,
            convertObjects: false,
            convertObjectsColorized: true,
            convertObjectsDepth: 2
        }
    })

    afterEach(() => {
        console.log = originalConsoleLog
    })

    describe('createLogger', () => {
        it('should create a logger instance with default config', () => {
            const logger = Loggy.createLogger()
            expect(logger).toBeInstanceOf(LoggyLogger)
        })

        it('should create a logger with custom config', () => {
            const logger = Loggy.createLogger({
                level: Loggy.LEVELS["7_DEBUG"],
                colors: false
            })
            expect(logger).toBeInstanceOf(LoggyLogger)
        })

        it('should use global config when useGlobalConfig is true', () => {
            Loggy.globalConfig.setLevel(Loggy.LEVELS["5_INFO"])
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["7_DEBUG"] }, true)
            logger.info('test')
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('level filtering', () => {
        it('should log info when level allows it', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            logger.info('test message')
            expect(console.log).toHaveBeenCalled()
        })

        it('should not log debug when level is too low', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            logger.debug('should not appear')
            expect(console.log).not.toHaveBeenCalled()
        })

        it('should log error regardless of level (error level is lower)', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            logger.error('error message')
            expect(console.log).toHaveBeenCalled()
        })

        it('should respect level hierarchy', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["7_DEBUG"] })
            logger.debug('debug')
            logger.info('info')
            logger.warn('warn')
            logger.error('error')
            expect(console.log).toHaveBeenCalledTimes(4)
        })
    })

    describe('config reload', () => {
        it('should reload config from global', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            Loggy.globalConfig.setLevel(Loggy.LEVELS["7_DEBUG"])
            logger.reloadConfig()
            logger.debug('should appear after reload')
            expect(console.log).toHaveBeenCalled()
        })
    })

    describe('global config', () => {
        it('should set global level', () => {
            Loggy.globalConfig.setLevel(Loggy.LEVELS["7_DEBUG"])
            expect(Loggy.globalConfig.getLevel()).toBe(Loggy.LEVELS["7_DEBUG"])
        })

        it('should toggle colors', () => {
            const original = LoggyLogger.globalConfig.colors
            Loggy.globalConfig.toggleColors()
            expect(LoggyLogger.globalConfig.colors).toBe(!original)
            Loggy.globalConfig.toggleColors() // restore
        })

        it('should set colors to specific value', () => {
            Loggy.globalConfig.toggleColors(false)
            expect(LoggyLogger.globalConfig.colors).toBe(false)
            Loggy.globalConfig.toggleColors(true)
            expect(LoggyLogger.globalConfig.colors).toBe(true)
        })
    })

    describe('instance config', () => {
        it('should set instance level', () => {
            const logger = Loggy.createLogger()
            logger.config.setLevel(Loggy.LEVELS["7_DEBUG"])
            logger.debug('should appear')
            expect(console.log).toHaveBeenCalled()
        })

        it('should get instance level', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            expect(logger.config.getLevel()).toBe(Loggy.LEVELS["5_INFO"])
        })
    })

    describe('validation', () => {
        it('should throw on invalid level', () => {
            expect(() => {
                Loggy.createLogger({ level: -1 as unknown as number })
            }).toThrow()
        })

        it('should throw on invalid colors', () => {
            expect(() => {
                Loggy.createLogger({ colors: 'true' as unknown as boolean })
            }).toThrow()
        })

        it('should throw on invalid depth', () => {
            expect(() => {
                Loggy.createLogger({ convertObjectsDepth: -1 })
            }).toThrow()
        })
    })

    describe('logging methods', () => {
        it('should call all log level methods', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["9_SILLY"] })
            logger.verbose('verbose')
            logger.debug('debug')
            logger.log('log')
            logger.info('info')
            logger.success('success')
            logger.warn('warn')
            logger.error('error')
            logger.fatal('fatal')
            expect(console.log).toHaveBeenCalledTimes(8)
        })
    })

    describe('string logging', () => {
        it('should log simple strings', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            logger.info('test message')
            expect(console.log).toHaveBeenCalled()
        })

        it('should handle multi-line strings', () => {
            const logger = Loggy.createLogger({ level: Loggy.LEVELS["5_INFO"] })
            logger.info('line1\nline2\nline3')
            expect(console.log).toHaveBeenCalledTimes(3)
        })
    })

    describe('object logging', () => {
        it('should log objects when convertObjects is enabled', () => {
            const logger = Loggy.createLogger({
                level: Loggy.LEVELS["5_INFO"],
                convertObjects: true
            })
            logger.info({ key: 'value' })
            expect(console.log).toHaveBeenCalled()
        })
    })
})

