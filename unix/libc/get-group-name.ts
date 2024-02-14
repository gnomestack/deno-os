import { fail, ok, Errno, FunctionMissingError, IClosable, IS_WINDOWS, PlatformNotSupportedError, StringBuilder, createErrnoError } from "./types.ts";


export function getGroupNameRes(gid: number) {
    if (IS_WINDOWS)
        return fail<string>(new PlatformNotSupportedError("getGroupNameRes is not supported on Windows"));

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgrgid_r: {
                parameters: ['u32', 'pointer', 'pointer', 'u32', 'pointer'],
                result: 'i32',
                optional: true,
            },
            strerror_r: {
                parameters: ['i32', 'buffer', 'i32'],
                result: 'i32',
                optional: true,
            }
        });
        disposable = lib;

        if (lib.symbols.getgrgid_r === undefined || lib.symbols.getgrgid_r === null)
            return fail<string>(new FunctionMissingError("gitgrgid_r"));

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const grpBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const grpBufPtr = Deno.UnsafePointer.of(grpBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getgrgid_r(gid, grpBufPtr, bufPtr, bufLength, resultBufPtr);
    
            if (ret === 0) {
                const sb = new StringBuilder();
                for(let i = 0; i < buf.length; i++) {
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
        if (disposable)
            disposable.close(); 
    }
}

export function getGroupName(gid: number): string | null {
    if (IS_WINDOWS)
        return null;

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgrgid_r: {
                parameters: ['u32', 'pointer', 'pointer', 'u32', 'pointer'],
                result: 'i32',
                optional: true,
            }
        });
        disposable = lib;

        if (lib.symbols.getgrgid_r === undefined || lib.symbols.getgrgid_r === null)
            return null;

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const grpBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const grpBufPtr = Deno.UnsafePointer.of(grpBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getgrgid_r(gid, grpBufPtr, bufPtr, bufLength, resultBufPtr);
    
            if (ret === 0) {
                const sb = new StringBuilder();
                for(let i = 0; i < buf.length; i++) {
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
        if (disposable)
            disposable.close(); 
    }
}
