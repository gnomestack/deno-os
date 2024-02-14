import {
    createErrnoError,
    Errno,
    fail,
    FunctionMissingError,
    IClosable,
    IS_WINDOWS,
    IUser,
    ok,
    PlatformNotSupportedError,
} from "./types.ts";

export function getUserRes(uid: number) {
    if (IS_WINDOWS) {
        return fail<IUser>(new PlatformNotSupportedError("getUserRes is not supported on Windows"));
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
            return fail<IUser>(new FunctionMissingError("Symbol getpwuid_r not found"));
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
                const v = new Deno.UnsafePointerView(pwdBufPtr as unknown as Deno.PointerObject<unknown>);
                const nameId = v.getBigInt64(0);
                const namePtr = Deno.UnsafePointer.create(nameId);
                const name = Deno.UnsafePointerView.getCString(namePtr as Deno.PointerObject);
                const pwId = v.getBigInt64(8);
                const pwPtr = Deno.UnsafePointer.create(pwId);
                const pw = Deno.UnsafePointerView.getCString(pwPtr as Deno.PointerObject);
                const uid = v.getInt32(16);
                const gid = v.getInt32(20);
                const gecosId = v.getBigInt64(24);
                const gecosPtr = Deno.UnsafePointer.create(gecosId);
                const gecos = Deno.UnsafePointerView.getCString(gecosPtr as Deno.PointerObject);
                const dirId = v.getBigInt64(32);
                const dirPtr = Deno.UnsafePointer.create(dirId);
                const dir = Deno.UnsafePointerView.getCString(dirPtr as Deno.PointerObject);
                const shellId = v.getBigInt64(40);
                const shellPtr = Deno.UnsafePointer.create(shellId);
                const shell = Deno.UnsafePointerView.getCString(shellPtr as Deno.PointerObject);

                return ok({
                    name: name,
                    passwd: pw,
                    uid: uid,
                    gid: gid,
                    gecos: gecos,
                    dir: dir,
                    shell: shell,
                } as IUser);
            }

            bufLength *= 2;
        }

        return fail<IUser>(createErrnoError(ret, lib.symbols.strerror_r));
    } catch (e) {
        return fail<IUser>(e);
    } finally {
        if (disposable) {
            disposable.close();
        }
    }
}

export function getUser(uid: number) {
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
        let bufLength = 512;
        while (ret === Errno.ERANGE) {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);

            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);

            if (ret === 0) {
                const v = new Deno.UnsafePointerView(pwdBufPtr as unknown as Deno.PointerObject<unknown>);
                const nameId = v.getBigInt64(0);
                const namePtr = Deno.UnsafePointer.create(nameId);
                const name = Deno.UnsafePointerView.getCString(namePtr as Deno.PointerObject);
                const pwId = v.getBigInt64(8);
                const pwPtr = Deno.UnsafePointer.create(pwId);
                const pw = Deno.UnsafePointerView.getCString(pwPtr as Deno.PointerObject);
                const uid = v.getInt32(16);
                const gid = v.getInt32(20);
                const gecosId = v.getBigInt64(24);
                const gecosPtr = Deno.UnsafePointer.create(gecosId);
                const gecos = Deno.UnsafePointerView.getCString(gecosPtr as Deno.PointerObject);
                const dirId = v.getBigInt64(32);
                const dirPtr = Deno.UnsafePointer.create(dirId);
                const dir = Deno.UnsafePointerView.getCString(dirPtr as Deno.PointerObject);
                const shellId = v.getBigInt64(40);
                const shellPtr = Deno.UnsafePointer.create(shellId);
                const shell = Deno.UnsafePointerView.getCString(shellPtr as Deno.PointerObject);

                return {
                    name: name,
                    passwd: pw,
                    uid: uid,
                    gid: gid,
                    gecos: gecos,
                    dir: dir,
                    shell: shell,
                } as IUser;
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
