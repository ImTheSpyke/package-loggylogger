# LoggyLogger 🚀

LoggyLogger is a next-gen, plug-and-play logging system for Node.js that empowers developers with real-time telemetry and a production-optimized build. Say goodbye to tedious console.log statements and hello to a professional-grade dashboard with live log viewing, searching, filtering, recording and much more.


## ✨ Features
- 🔌 **Runtime control:** Flip log levels, object depth, and more without restarting.
- 🗂️ **Smart outputs:** Gather all the datas, filter to your needs with custom checking functions.
- 🖥️ **Live web dashboard:** Real‑time view of logs with level filters, file&line scoping, regex search and more.
- 🛡️ **Production mode:** Tunable minimal footprint while preserving essential telemetry.
- 🧭 **Rich context:** Object pretty‑printing, colorized output.
- 🧩 **Flexible API:** Simple factory, global config, and granular per-file/calls overrides.

## 📦 Install
```bash
npm install @imthespyke/loggylogger
```

## 🚀 Quick start
```ts
import Loggy from '@imthespyke/loggylogger'

// Create a logger (uses global config by default)
const logger = Loggy.createLogger()

logger.info('Server starting…')
logger.warn('Cache miss', { userId: 42 })
logger.error('Unhandled exception', new Error('boom'))
```

## ⚙️ Configuration
`Loggy.globalConfig` holds defaults for every instance. Override globally or per instance:

```ts
// Global tweak (affects future instances)
Loggy.globalConfig.setLevel(Loggy.LEVELS['7_DEBUG'])
Loggy.globalConfig.toggleColors(true)

// Per-instance customization
const prodLogger = Loggy.createLogger(
  {
    level: Loggy.LEVELS['5_INFO'],
    colors: false,
    emojis: false,
    showCallLines: false,
    cleanDate: true,
    convertObjects: true,
    convertObjectsColorized: false,
    convertObjectsDepth: 1,
  },
  false // set to true to force using the current global config
)

// Instance-level config changes
prodLogger.config.setLevel(Loggy.LEVELS['3_WARN'])
```

**Note:** Configuration is validated - invalid values (e.g., negative levels, non-boolean flags) will throw errors.

### Common settings
- `level`: Minimum level to emit (`Loggy.LEVELS` from `1_FATAL` to `9_SILLY`).
- `colors` / `emojis`: Toggle visual helpers.
- `showCallLines`: Include caller info.
- `cleanDate`: Shortened timestamps.
- `convertObjects*`: Control pretty‑printing depth and color.

## 🌐 Remote & live control
- **Remote runtime switches:** Wire `Loggy.globalConfig` updates to your control plane (e.g., fetch from an API or feature flag) and call `logger.reloadConfig()` on long‑lived instances to apply.
- **Web dashboard:** Stream logs to a lightweight web UI for real‑time filtering by level/file and quick drill‑downs.

## 🗄️ File logging
- Target specific files or modules to also write to a rotating logfile while keeping console output clean.
- Combine with production mode to persist only actionable events.

## 🏎️ Production mode
- Strip colors/emojis, minimize object conversions, and drop to the minimal level needed.
- Keep critical metadata (timestamp, level, file, message) so postmortems stay actionable.

## 🧭 API overview
- `Loggy.createLogger(config?, useGlobalConfig?)` → new logger instance.
- `Loggy.globalConfig` → shared defaults API (`setLevel`, `getLevel`, `toggleColors`, `set`).
- `Loggy.LEVELS` → level map for quick thresholds.
- Instance methods: `verbose`, `debug`, `log`, `info`, `success`, `warn`, `error`, `fatal`.
- Instance config: `logger.config.setLevel()`, `logger.config.getLevel()`, `logger.config.toggleColors()`.
- Utility: `logger.reloadConfig()` to re‑sync with `globalConfig` after remote updates.

### TypeScript Support
Full TypeScript support with exported types:
```ts
import Loggy, { LoggyLogger, TLoggyConfig, TLoggyConfigOptional } from '@imthespyke/loggylogger'
```

## 📜 Scripts
- `npm run build` – Build ESM, CJS, and type declarations via `tsup`.
- `npm start` – Run the built entry.
- `npm test` – Run tests in watch mode.
- `npm run test:run` – Run tests once.
- `npm run test:ui` – Run tests with UI interface.

## 🛣️ Roadmap
- Fine‑grained per‑file routing rules.
- Built‑in web dashboard bundle and event stream endpoint.
- Remote configuration helpers (HTTP + WS) out of the box.
- Structured log export adapters (JSONL, OpenTelemetry, SIEM).

## 🪪 License
ISC © ImTheSpyke
