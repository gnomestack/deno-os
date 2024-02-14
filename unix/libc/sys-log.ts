import { PlatformNotSupportedError, Result, fail, ok, sprintf } from "../../deps.ts";
import { IS_WINDOWS, FunctionMissingError } from "./types.ts";

export enum SysLogLevel {
    LOG_EMERG = 0,
    LOG_ALERT = 1,
    LOG_CRIT = 2,
    LOG_ERR = 3,
    LOG_WARNING = 4,
    LOG_NOTICE = 5,
    LOG_INFO = 6,
    LOG_DEBUG = 7,
}

export class SysLogger {
    #lib: Deno.DynamicLibrary<{ syslog: {
        parameters: ["i32", 'buffer'],
        result: 'void',
        optional: true,
    },
    openlog: {
        parameters: ['buffer', 'i32', 'i32'],
        result: 'void',
        optional: true,
    },

    closelog: {
        parameters: [],
        result: 'void',
        optional: true,
    }}>;

    #disposed = false;
    #closed = false;
    #open = false;
    #encoder: TextEncoder;

    constructor(private readonly _priority?: SysLogLevel) {
        this.#lib = Deno.dlopen("libc.so.6", {
            syslog: {
                parameters: ["i32", 'buffer'],
                result: 'void',
                optional: true,
            },
            openlog: {
                parameters: ['buffer', 'i32', 'i32'],
                result: 'void',
                optional: true,
            },

            closelog: {
                parameters: [],
                result: 'void',
                optional: true,
            }
        });

        this.#encoder = new TextEncoder();
    }

    open(identity: string, options: number, facility: number) {
        if (this.#open) {
            return;
        }

        const openlog = this.#lib.symbols.openlog;
        if (openlog === undefined || openlog === null) {
            return;
        }

        const buffer = this.#encoder.encode(identity);
        openlog(buffer, options, facility);
        this.#open = true;
    }

    logRes(priority: SysLogLevel | number, message: string, ...args: unknown[]) : Result<void>
    logRes(priority: SysLogLevel | number, message: string) : Result<void>
    logRes(message: string) : Result<void>
    logRes() : Result<void> {
        if (IS_WINDOWS)
            return fail<void>(new PlatformNotSupportedError("SysLogger is only supported on Unix platforms"));

        if (this.#disposed)
            return fail<void>(new Error("SysLogger has been disposed"));

        const syslog = this.#lib.symbols.syslog;
        if (syslog === undefined || syslog === null)
            return fail<void>(new FunctionMissingError("syslog is not available"));

        let message = '';
        let priority = SysLogLevel.LOG_INFO;
        let args: unknown[] = [];

        switch (arguments.length) {
            case 1:
                message = arguments[0];
                break;

            case 2:
                priority = arguments[0];
                message = arguments[1];
                break;

            case 3:
                priority = arguments[0];
                message = arguments[1];
                args = arguments[2];
                break;
        }

        if (args.length > 0) {
            message = sprintf(message, ...args);
        }

        const buffer = this.#encoder.encode(message);
        syslog(priority, buffer);
        return ok(void 0);
    }

    log(priority: SysLogLevel, message: string, ...args: unknown[]) : void
    log(priority: SysLogLevel, message: string) : void
    log(message: string) : void 
    log() {
        if (IS_WINDOWS)
            return;

        if (this.#disposed) {
            throw new Error("SysLogger has been disposed");
        }

        const syslog = this.#lib.symbols.syslog;
        if (syslog === undefined || syslog === null) {
            return;
        }

        let message = '';
        let priority = SysLogLevel.LOG_INFO;
        let args: unknown[] = [];

        switch (arguments.length) {
            case 1:
                message = arguments[0];
                break;

            case 2:
                priority = arguments[0];
                message = arguments[1];
                break;

            case 3:
                priority = arguments[0];
                message = arguments[1];
                args = arguments[2];
                break;
        }

        if (args.length > 0) {
            message = sprintf(message, ...args);
        }

        const buffer = this.#encoder.encode(message);
        syslog(priority, buffer);
    }

    [Symbol.dispose]() {
        this.close();
    }

    close() {
        if (this.#disposed)
            return;

        this.#disposed = true;
        if (!this.#closed) {
            const close = this.#lib.symbols.closelog;
            if (close !== undefined && close !== null)
                close();

            this.#closed = true;
        }

        if (this.#lib) {
            this.#lib.close();
        }
    }
}