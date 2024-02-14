import {
    createErrnoError,
    Errno,
    fail,
    FunctionMissingError,
    IClosable,
    IS_WINDOWS,
    ok,
    PlatformNotSupportedError,
    StringBuilder,
} from "./types.ts";

export function getUserNameRes(uid: number) {
    if (IS_WINDOWS) {
        return fail<string>(new PlatformNotSupportedError("getUserNameRes is not supported on Windows"));
    }

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
                parameters: ["u32", "pointer", "pointer", "u32", "pointer"],
                result: "i32",
                optional: true,
            },
            strerror_r: {
                parameters: ["i32", "buffer", "i32"],
                result: "i32",
                optional: true,
            },
        });
        disposable = lib;

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null) {
            return fail<string>(new FunctionMissingError("getpwuid_r"));
        }

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE) {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);

            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);

            if (ret === 0) {
                const sb = new StringBuilder();
                for (let i = 0; i < buf.length; i++) {
                    const c = buf[i];
                    if (c === 0) {
                        break;
                    }
                    sb.appendChar(buf[i]);
                }

                const name = sb.toString();
                sb.clear();
                return ok(name);
            }

            bufLength *= 2;
        }

        const err = createErrnoError(ret, lib.symbols.strerror_r);
        return fail<string>(err);
    } catch (e) {
        return fail<string>(e);
    } finally {
        if (disposable) {
            disposable.close();
        }
    }
}

export function getUserName(uid: number) {
    if (IS_WINDOWS) {
        return null;
    }

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
                parameters: ["u32", "pointer", "pointer", "u32", "pointer"],
                result: "i32",
                optional: true,
            },
            strerror_r: {
                parameters: ["i32", "buffer", "i32"],
                result: "i32",
                optional: true,
            },
        });
        disposable = lib;

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null) {
            return null;
        }

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE) {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);

            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);

            if (ret === 0) {
                const sb = new StringBuilder();
                for (let i = 0; i < buf.length; i++) {
                    const c = buf[i];
                    if (c === 0) {
                        break;
                    }
                    sb.appendChar(buf[i]);
                }

                const name = sb.toString();
                sb.clear();
                return name;
            }

            bufLength *= 2;
        }

        return null;
    } finally {
        if (disposable) {
            disposable.close();
        }
    }
}
