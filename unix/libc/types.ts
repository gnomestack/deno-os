import { StringBuilder, PlatformNotSupportedError, ok, fail, IS_WINDOWS } from "../../deps.ts";
import { IClosable, FunctionMissingError } from "../../ffi/mod.ts";

export {
    StringBuilder,
    PlatformNotSupportedError,
    ok,
    fail,
    IS_WINDOWS,
    FunctionMissingError,
};

export type { IClosable };

export interface IGroup {
    name: string;
    passwd?: string;
    gid: number;
    members: string[];
}

export interface IUser {
    name: string;
    passwd?: string;
    uid: number;
    gid: number;
    gecos?: string;
    dir?: string;
    shell?: string;
}

export enum Errno {
    NONE = 0,
    EPERM = 1,
    ENOENT = 2,
    ESRCH = 3,
    EINTR = 4,
    EIO = 5,
    ENXIO = 6,
    E2BIG = 7,
    ENOEXEC = 8,
    EBADF = 9,
    ECHILD = 10,
    EAGAIN = 11,
    ENOMEM = 12,
    EACCES = 13,
    EFAULT = 14,
    ENOTBLK = 15,
    EBUSY = 16,
    EEXIST = 17,
    EXDEV = 18,
    ENODEV = 19,
    ENOTDIR = 20,
    EISDIR = 21,
    EINVAL = 22,
    ENFILE = 23,
    EMFILE = 24,
    ENOTTY = 25,
    ERANGE = 34,
}

/**
 * An error that represents an errno from libc.
 */
export class ErrnoError extends Error {
    override readonly name = "ErrnoError";

    constructor(public errno: number, message?: string) {
        super(message ?? `Unexpected errorno ${errno} error.`);
    }
}

/**
 * Creates an error from an errno from libc. The error message is created using `strerror_r` if available.
 * 
 * @description
 * Requires `strerror_r` to be available in the current environment and the deno ffi permission.
 * 
 * @param errno The errno to create an error from.
 * @param strerror_r The `strerror_r` function to use. If not provided, it will be loaded from the system library.
 * @returns The `ErrnoError`.
 * @see ErrnoError
 */
export function createErrnoError(errno: number, strerror_r: null | ((errno: number, buf: Uint8Array, bufLength: number) => number)) {
    if (errno < 0)
        return new ErrnoError(errno, `Error ${errno}.  Negative errno is not valid.`);
    
    if (strerror_r === undefined || strerror_r === null) {
        let disposable : IClosable | null = null;
        try {
            const lib = Deno.dlopen(Deno.build.os === "windows" ? "msvcrt.dll" : "libc.so", {
                strerror_r: {
                    parameters: ["i32", "buffer", "u32"],
                    result: "i32",
                    optional: true,
                },
            });
            disposable = lib;
            strerror_r = lib.symbols.strerror_r;
            if (strerror_r === undefined || strerror_r === null) {
                return new ErrnoError(errno);
            }

            let ret = Errno.ERANGE as number;
            let bufLength = 1024;
            while(ret === Errno.ERANGE)
            {
                const buf = new Uint8Array(bufLength);
                ret = strerror_r(errno, buf, bufLength);
                if (ret !== 0) {
                    const sb = new StringBuilder();
                    for (let i = 0; i < 64; i++)
                    {
                        const c = buf[i];
                        if (c === 0)
                            break;
                        sb.appendChar(c);
                    }
                    return new ErrnoError(errno, sb.toString());
                }
                bufLength *= 2;
            }
        } catch {
            return new ErrnoError(errno);
        } finally {
            if (disposable !== null)
                disposable.close();
        }
    }

    let bufLength = 1024;
    let ret = Errno.ERANGE as number;
    while(ret === Errno.ERANGE)
    {
        const buf = new Uint8Array(bufLength);
        ret = strerror_r(errno, buf, bufLength);
        if (ret !== 0) {
            const sb = new StringBuilder();
            for (let i = 0; i < 64; i++)
            {
                const c = buf[i];
                if (c === 0)
                    break;
                sb.appendChar(c);
            }
            return new ErrnoError(errno, sb.toString());
        }
        bufLength *= 2;
    }

    return new ErrnoError(errno, `Error ${errno}`);
}