import {
    createErrnoError,
    Errno,
    fail,
    FunctionMissingError,
    IClosable,
    IGroup,
    IS_WINDOWS,
    ok,
    PlatformNotSupportedError,
} from "./types.ts";

export function getGroupRes(gid: number) {
    if (IS_WINDOWS) {
        return fail<IGroup>(new PlatformNotSupportedError("getGroupNameRes is not supported on Windows"));
    }

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgrgid_r: {
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

        if (lib.symbols.getgrgid_r === undefined || lib.symbols.getgrgid_r === null) {
            return fail<IGroup>(new FunctionMissingError("gitgrgid_r"));
        }

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE) {
            const buf = new Uint8Array(bufLength);
            const grpBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const grpBufPtr = Deno.UnsafePointer.of(grpBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);

            ret = lib.symbols.getgrgid_r(gid, grpBufPtr, bufPtr, bufLength, resultBufPtr);

            if (ret === 0) {
                const v = new Deno.UnsafePointerView(grpBufPtr as unknown as Deno.PointerObject<unknown>);
                const nameId = v.getBigInt64(0);
                const namePtr = Deno.UnsafePointer.create(nameId);
                const name = Deno.UnsafePointerView.getCString(namePtr as Deno.PointerObject);

                const pwId = v.getBigInt64(8);
                const pwPtr = Deno.UnsafePointer.create(pwId);
                const pw = Deno.UnsafePointerView.getCString(pwPtr as Deno.PointerObject);

                const gid = v.getUint32(16);

                const membersId = v.getBigInt64(24);
                const membersPtr = Deno.UnsafePointer.create(membersId);
                const members = new Deno.UnsafePointerView(membersPtr as Deno.PointerObject);

                let intptr: number | bigint = 1n;
                const set = new Array<string>();
                let i = 0;
                while (intptr !== 0n) {
                    intptr = members.getBigInt64(i);
                    i += 8;
                    if (intptr === 0 || intptr === 0n) {
                        break;
                    }

                    if (intptr >= 0n) {
                        const ptr = Deno.UnsafePointer.create(intptr);
                        set.push(Deno.UnsafePointerView.getCString(ptr as Deno.PointerObject));
                    } else {
                        break;
                    }
                }

                return ok({
                    name: name,
                    passwd: pw,
                    gid: gid,
                    members: set,
                } as IGroup);
            }

            bufLength *= 2;
        }

        const err = createErrnoError(ret, lib.symbols.strerror_r);
        return fail<IGroup>(err);
    } catch (e) {
        return fail<IGroup>(e);
    } finally {
        if (disposable) {
            disposable.close();
        }
    }
}

export function getGroup(gid: number): IGroup | null {
    if (IS_WINDOWS) {
        return null;
    }

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgrgid_r: {
                parameters: ["u32", "pointer", "pointer", "u32", "pointer"],
                result: "i32",
                optional: true,
            },
        });
        disposable = lib;

        if (lib.symbols.getgrgid_r === undefined || lib.symbols.getgrgid_r === null) {
            return null;
        }

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE) {
            const buf = new Uint8Array(bufLength);
            const grpBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const grpBufPtr = Deno.UnsafePointer.of(grpBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);

            ret = lib.symbols.getgrgid_r(gid, grpBufPtr, bufPtr, bufLength, resultBufPtr);

            if (ret === 0) {
                const v = new Deno.UnsafePointerView(grpBufPtr as unknown as Deno.PointerObject<unknown>);
                const nameId = v.getBigInt64(0);
                const namePtr = Deno.UnsafePointer.create(nameId);
                const name = Deno.UnsafePointerView.getCString(namePtr as Deno.PointerObject);

                const pwId = v.getBigInt64(8);
                const pwPtr = Deno.UnsafePointer.create(pwId);
                const pw = Deno.UnsafePointerView.getCString(pwPtr as Deno.PointerObject);

                const gid = v.getUint32(16);

                const membersId = v.getBigInt64(24);
                const membersPtr = Deno.UnsafePointer.create(membersId);
                const members = new Deno.UnsafePointerView(membersPtr as Deno.PointerObject);

                let intptr: number | bigint = 1n;
                const set = new Array<string>();
                let i = 0;
                while (intptr !== 0n) {
                    intptr = members.getBigInt64(i);
                    i += 8;
                    if (intptr === 0 || intptr === 0n) {
                        break;
                    }

                    if (intptr >= 0n) {
                        const ptr = Deno.UnsafePointer.create(intptr);
                        set.push(Deno.UnsafePointerView.getCString(ptr as Deno.PointerObject));
                    } else {
                        break;
                    }
                }

                return {
                    name: name,
                    passwd: pw,
                    gid: gid,
                    members: set,
                } as IGroup;
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
