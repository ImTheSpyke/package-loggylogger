# 🚀 LoggyLogger

**Zero-config logging that scales from lightweight production to powerful debugging.**

LoggyLogger is a standalone, plug-and-play logging system for Node.js. No external APIs, no cloud services, no complex setup. Just import and log.

## Why LoggyLogger?

- 🚀 **Instant setup** - Import, create logger, done. Works out of the box.
- 🏠 **Standalone** - Lives entirely in your project. No external dependencies or services.
- ⚡ **Production mode** - Flip a switch to disable all heavy features. Minimal footprint when you need performance.
- 🧪 **Debug mode** - Deep object inspection, call stack tracing, colorized output, and a live web dashboard when you need to hunt bugs.

## Somes images
Full loggin dashboard
<br><img src="./github_assets/example1.png" height="200px" /><br>
Custom code snippet checks
<br><img src="./github_assets/example_check_add.png" height="200px" /><br>
Filter out logs by file and line range
<br><img src="./github_assets/example_file_filtering.png" height="200px" /><br>

## Install

```bash
npm install loggylogger
```

## Basic Usage

```ts
import Loggy from 'loggylogger'

// Create a logger - that's it
const logger = Loggy.createLogger()

// Start logging
logger.info('Server started')
logger.warn('Cache miss', { userId: 42 })
logger.error('Connection failed', new Error('timeout'))
logger.debug('Request payload', requestData)
```

## Production Mode

Switch to a lightweight logger with a single toggle. All heavy features disabled automatically:

```ts
import Loggy from 'loggylogger'

// Enable production mode - strips colors, emojis, object inspection, call lines
Loggy.toggleProductionMode(true)

const logger = Loggy.createLogger()

// Now logs are minimal and fast
logger.info('User logged in')  // Clean, lightweight output
logger.error('Payment failed') // Only essential info
```

Production mode automatically:
- Disables colors and emojis
- Turns off object deep inspection
- Removes call line tracking
- Sets level to FATAL only (configurable)

## Debug Mode (Default)

When you need to dig deep, LoggyLogger gives you everything:

```ts
import Loggy from 'loggylogger'

// Configure for maximum debug output
Loggy.setGlobalLoggerConfig({
    level: Loggy.LEVELS['8_VERBOSE'],      // Show all log levels >= Verbose
    colors: true,                           // Colorized output
    emojis: true,                           // Visual indicators
    showCallLines: true,                    // File:line for each log
    convertObjects: true,                   // Deep object inspection
    convertObjectsColorized: true,          // Colorized objects
    convertObjectsDepth: 4,                 // Inspect nested objects
})

const logger = Loggy.createLogger()

// Full debug power
logger.verbose('Entering function', { args: [1, 2, 3] })
logger.debug('Cache state', complexCacheObject)
logger.info('Processing request', req.body)
```

## Log Levels

9 levels from critical to verbose:

```ts
logger.fatal('System crash')        // Level 10 - Highest
logger.error('Operation failed')    // Level 20
logger.warn('Deprecation notice')   // Level 30
logger.success('Task completed')    // Level 40
logger.info('Status update')        // Level 50
logger.log('General message')       // Level 60 (default threshold)
logger.debug('Debug lines')         // Level 70
logger.verbose('Detailed trace')    // Level 80
logger.silly('Stupid precise data') // Level 90
// Level 90 - SILLY (most verbose)
```

Set the threshold:

```ts
// Global - affects all loggers unless overwritten
Loggy.setGlobalLoggerConfig({ level: Loggy.LEVELS['7_DEBUG'] })

// Per-instance (overwrite global config)
const verboseLogger = Loggy.createLogger({ level: Loggy.LEVELS['8_VERBOSE'] })
```

## Configuration

### Global Config

Affects all loggers created after the change:

```ts
import Loggy from 'loggylogger'

Loggy.setGlobalLoggerConfig({
    level: Loggy.LEVELS['5_INFO'],
    colors: true,
    emojis: true,
    showCallLines: false,
    cleanDate: true,
    convertObjects: false,
    convertObjectsColorized: true,
    convertObjectsDepth: 2,
})
```

### Per-Instance Config

Override global settings for specific loggers:

```ts
// Quiet logger for noisy modules
const quietLogger = Loggy.createLogger({
    level: Loggy.LEVELS['3_WARN'],
    colors: false,
})

// Verbose logger for debugging specific code
const debugLogger = Loggy.createLogger({
    level: Loggy.LEVELS['8_VERBOSE'],
    showCallLines: true,
    convertObjects: true,
    convertObjectsDepth: 5,
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | number | 60 | Log level threshold (use `Loggy.LEVELS`) |
| `colors` | boolean | true | Enables ANSI colors in output |
| `emojis` | boolean | true | Emoji indicators |
| `showCallLines` | boolean | false | Show file:line for each log |
| `cleanDate` | boolean | true | Clean timestamp format |
| `convertObjects` | boolean | false | Deep inspect objects with `util.inspect` |
| `convertObjectsColorized` | boolean | true | Colorize inspected objects |
| `convertObjectsDepth` | number | 2 | Depth for object inspection |

## Available Levels

```ts
Loggy.LEVELS = {
    '1_FATAL': 10,
    '2_ERROR': 20,
    '3_WARN': 30,
    '4_SUCCESS': 40,
    '5_INFO': 50,
    '6_LOG': 60,      // DEFAULT
    '7_DEBUG': 70,
    '8_VERBOSE': 80,
    '9_SILLY': 90,
}
```