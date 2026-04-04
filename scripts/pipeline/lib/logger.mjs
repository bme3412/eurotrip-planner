/**
 * Pipeline Logger
 *
 * Structured JSON logging for data pipeline operations.
 * Supports multiple output levels and audit trail generation.
 */

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  debug: '\x1b[90m',   // Gray
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  reset: '\x1b[0m',
};

class PipelineLogger {
  constructor(options = {}) {
    this.level = LEVELS[options.level || 'info'];
    this.json = options.json || false;
    this.context = options.context || {};
    this.auditTrail = [];
    this.startTime = Date.now();
  }

  /**
   * Create a child logger with additional context.
   */
  child(additionalContext) {
    const child = new PipelineLogger({
      level: Object.keys(LEVELS).find(k => LEVELS[k] === this.level),
      json: this.json,
      context: { ...this.context, ...additionalContext },
    });
    child.auditTrail = this.auditTrail;
    child.startTime = this.startTime;
    return child;
  }

  /**
   * Log a debug message.
   */
  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  /**
   * Log an info message.
   */
  info(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * Log a warning message.
   */
  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  /**
   * Log an error message.
   */
  error(message, data = {}) {
    this._log('error', message, data);
  }

  /**
   * Log a success message (info level with checkmark).
   */
  success(message, data = {}) {
    this._log('info', `✓ ${message}`, data);
  }

  /**
   * Start a timed operation.
   */
  startTimer(label) {
    return {
      label,
      startTime: Date.now(),
      end: () => {
        const duration = Date.now() - this.startTime;
        this.info(`${label} completed`, { durationMs: duration });
        return duration;
      },
    };
  }

  /**
   * Add an audit entry.
   */
  audit(action, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      ...this.context,
      ...details,
    };
    this.auditTrail.push(entry);
    this.debug(`Audit: ${action}`, details);
  }

  /**
   * Get the audit trail.
   */
  getAuditTrail() {
    return this.auditTrail;
  }

  /**
   * Get summary statistics.
   */
  getSummary() {
    const duration = Date.now() - this.startTime;
    const actionCounts = {};

    for (const entry of this.auditTrail) {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    }

    return {
      totalDurationMs: duration,
      totalActions: this.auditTrail.length,
      actionCounts,
    };
  }

  /**
   * Internal log method.
   */
  _log(level, message, data) {
    if (LEVELS[level] < this.level) return;

    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;

    if (this.json) {
      console.log(JSON.stringify({
        timestamp,
        level,
        message,
        elapsedMs: elapsed,
        ...this.context,
        ...data,
      }));
    } else {
      const color = COLORS[level];
      const prefix = `${color}[${level.toUpperCase().padEnd(5)}]${COLORS.reset}`;
      const contextStr = Object.keys(this.context).length > 0
        ? ` [${Object.values(this.context).join('/')}]`
        : '';

      let output = `${prefix}${contextStr} ${message}`;

      if (Object.keys(data).length > 0) {
        output += ` ${COLORS.debug}${JSON.stringify(data)}${COLORS.reset}`;
      }

      console.log(output);
    }
  }
}

/**
 * Create a pipeline logger.
 */
export function createLogger(options = {}) {
  return new PipelineLogger(options);
}

/**
 * Parse CLI arguments for logger configuration.
 */
export function parseLoggerArgs(args) {
  return {
    level: args.includes('--verbose') ? 'debug' : 'info',
    json: args.includes('--json'),
    ci: args.includes('--ci'),
  };
}

export default PipelineLogger;
