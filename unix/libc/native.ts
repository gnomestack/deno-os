import { PlatformNotSupportedError } from "../../deps.ts";
import { StringBuilder, IS_WINDOWS, ok, fail } from "../../deps.ts";
import { FunctionMissingError } from "../../ffi/mod.ts";

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
export interface IClosable {
    close(): void;
}

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

export class ErrnoError extends Error {
    override readonly name = "ErrnoError";

    constructor(public errno: number, public message: string) {
        super(message);
    }
}

// TODO: Unable to getgrgid_r get data properly from group struct using deno. may require a c/rust lib. using buffer for now. 

export function getErrnoError(errno: number, strerror_r: null | ((errno: number, buf: Uint8Array, bufLength: number) => number)) {
    if (strerror_r === undefined || strerror_r === null) {
        return new ErrnoError(errno, `Error ${errno}`);
    }

    if (errno < 0)
        return new ErrnoError(errno, `Error ${errno}.  Negative errno is not valid.`);

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

export function getGroupRes(gid: number) {
    if (IS_WINDOWS)
        return fail<IGroup>(new PlatformNotSupportedError("getGroupNameRes is not supported on Windows"));

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
            return fail<IGroup>(new FunctionMissingError("gitgrgid_r"));

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
                    const tokens = new Array<string>();
                    const sb = new StringBuilder();
                    for(let i = 0; i < buf.length; i++) {
                        const c = buf[i];
                        if (c === 0) {
                            tokens.push(sb.toString());
                            sb.clear();
                            break;
                        }
                        sb.appendChar(buf[i]);
                    }
            
                    const group : IGroup = {
                        name: tokens[0],
                        gid: gid,
                        members: []
                    };

                    let hasX = false;
                    let hasGid = false;
                    for(let i = 1; i < tokens.length; i++) {
                        if (!hasX && tokens[i] === "x") {
                            hasX = true;
                            continue;
                        }

                        if (!hasGid) {
                            const gid = parseInt(tokens[i]);
                            if (!isNaN(gid)) {
                                group.gid = gid;
                                hasGid = true;
                                continue;
                            }
                        }

                        if (hasGid) {
                            group.members.push(tokens[i]);
                        }

                    }
                   
                    sb.clear();
                    return ok(group);
                }

                bufLength *= 2;
            }

            const err = getErrnoError(ret, lib.symbols.strerror_r);
            return fail<IGroup>(err);

    } catch (e) {
        return fail<IGroup>(e);
    } finally {
        if (disposable)
            disposable.close(); 
    }
}

export function getGroup(gid: number) : IGroup | null {
    if (IS_WINDOWS)
        return null;

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgrgid_r: {
                parameters: ['u32', 'pointer', 'pointer', 'u32', 'pointer'],
                result: 'i32',
                optional: true,
            },
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
                    const tokens = new Array<string>();
                    const sb = new StringBuilder();
                    for(let i = 0; i < buf.length; i++) {
                        const c = buf[i];
                        if (c === 0) {
                            tokens.push(sb.toString());
                            sb.clear();
                            break;
                        }
                        sb.appendChar(buf[i]);
                    }
            
                    const group : IGroup = {
                        name: tokens[0],
                        gid: gid,
                        members: []
                    };

                    let hasX = false;
                    let hasGid = false;
                    for(let i = 1; i < tokens.length; i++) {
                        if (!hasX && tokens[i] === "x") {
                            hasX = true;
                            continue;
                        }

                        if (!hasGid) {
                            const gid = parseInt(tokens[i]);
                            if (!isNaN(gid)) {
                                group.gid = gid;
                                hasGid = true;
                                continue;
                            }
                        }

                        if (hasGid) {
                            group.members.push(tokens[i]);
                        }

                    }
                   
                    sb.clear();
                    return group;
                }

                bufLength *= 2;
            }
            
            return null;
    } finally {
        if (disposable)
            disposable.close(); 
    }
}
 
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

        const err = getErrnoError(ret, lib.symbols.strerror_r);
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

export function getUserNameRes(uid: number) {
    if (IS_WINDOWS)
        return fail<string>(new PlatformNotSupportedError("getUserNameRes is not supported on Windows"));

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
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

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null)
            return fail<string>(new FunctionMissingError("getpwuid_r"));

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);
    
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

        const err = getErrnoError(ret, lib.symbols.strerror_r);
        return fail<string>(err);
    } catch (e) {
        return fail<string>(e);
    } finally {
        if (disposable)
            disposable.close(); 
    }
}

export function getUserName(uid: number) {
    if (IS_WINDOWS)
        return null;

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
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

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null)
            return null;

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);
    
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

export function getUserRes(uid: number) {
    if (IS_WINDOWS)
        return fail<IUser>(new PlatformNotSupportedError("getUserRes is not supported on Windows"));

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
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

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null)
            return fail<IUser>(new FunctionMissingError("Symbol getpwuid_r not found"));

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);
    
            if (ret === 0) {
                const tokens = new Array<string>();
                const sb = new StringBuilder();
                for(let i = 0; i < buf.length; i++) {
                    const c = buf[i];
                    if (c === 0) {
                        tokens.push(sb.toString());
                        sb.clear();
                        break;
                    }
                    sb.appendChar(buf[i]);
                }
        
                const user : IUser = {
                    name: tokens[0],
                    uid: uid,
                    gid: 0,
                };

                for (let i = 1; i < tokens.length; i++) {
                    switch(i)
                    {
                        case 1:
                            user.passwd = tokens[i];
                            break;
                        case 2:
                            user.uid = parseInt(tokens[i]);
                            break;
                        case 3:
                            user.gid = parseInt(tokens[i]);
                            break;
                        case 4:
                            user.gecos = tokens[i];
                            break;
                        case 5:
                            user.dir = tokens[i];
                            break;
                        case 6:
                            user.shell = tokens[i];
                            break;
                    }
                }

                return ok(user);
            }

            bufLength *= 2;
        }

        return fail<IUser>(getErrnoError(ret, lib.symbols.strerror_r));
    } catch (e) {
        return fail<IUser>(e);
    } finally {
        if (disposable)
            disposable.close(); 
    }
}

export function getUser(uid: number) {
    if (IS_WINDOWS)
        return null;

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getpwuid_r: {
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

        if (lib.symbols.getpwuid_r === undefined || lib.symbols.getpwuid_r === null)
            return null;

        let ret = Errno.ERANGE as number;
        let bufLength = 120;
        while (ret === Errno.ERANGE)
        {
            const buf = new Uint8Array(bufLength);
            const pwdBuf = new Uint8Array(bufLength);
            const resultBuf = new Uint8Array(bufLength);
            const bufPtr = Deno.UnsafePointer.of(buf);
            const pwdBufPtr = Deno.UnsafePointer.of(pwdBuf);
            const resultBufPtr = Deno.UnsafePointer.of(resultBuf);
        
            ret = lib.symbols.getpwuid_r(uid, pwdBufPtr, bufPtr, bufLength, resultBufPtr);
    
            if (ret === 0) {
                const tokens = new Array<string>();
                const sb = new StringBuilder();
                for(let i = 0; i < buf.length; i++) {
                    const c = buf[i];
                    if (c === 0) {
                        tokens.push(sb.toString());
                        sb.clear();
                        break;
                    }
                    sb.appendChar(buf[i]);
                }
        
                const user : IUser = {
                    name: tokens[0],
                    uid: uid,
                    gid: 0,
                };

                for (let i = 1; i < tokens.length; i++) {
                    switch(i)
                    {
                        case 1:
                            user.passwd = tokens[i];
                            break;
                        case 2:
                            user.uid = parseInt(tokens[i]);
                            break;
                        case 3:
                            user.gid = parseInt(tokens[i]);
                            break;
                        case 4:
                            user.gecos = tokens[i];
                            break;
                        case 5:
                            user.dir = tokens[i];
                            break;
                        case 6:
                            user.shell = tokens[i];
                            break;
                    }
                }

                return user;
            }

            bufLength *= 2;
        }

        return null;
    } finally {
        if (disposable)
            disposable.close(); 
    }
}

export function getGroupsRes() {
    if (IS_WINDOWS)
        return fail<Uint32Array>(new PlatformNotSupportedError("getGroupsRes is not supported on Windows"));

    let disposable: IClosable | undefined = undefined;
   
    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgroups: {
                parameters: ['i32', 'buffer'],
                result: 'i32',
                optional: true,
            },
        });
        disposable = lib;

        if (lib.symbols.getgroups === undefined || lib.symbols.getgroups === null)
            return fail<Uint32Array>(new FunctionMissingError("Symbol getgroups not found"));

        const buf = new Uint32Array(1024);
        const ret = lib.symbols.getgroups(1024, buf);

        if (ret === -1)
            return ok(new Uint32Array(0));

        const groups = buf.slice(0, ret);
        return ok(groups);
    } catch (e) {
        return fail<Uint32Array>(e);
    } finally {
        if (disposable)
            disposable.close();
    }
}

export function getGroups() {
    if (IS_WINDOWS)
        return new Uint32Array();

    let disposable: IClosable | undefined = undefined;

    try {
        const lib = Deno.dlopen("libc.so.6", {
            getgroups: {
                parameters: ['i32', 'buffer'],
                result: 'i32',
                optional: true,
            },
        });
        disposable = lib;

        if (lib.symbols.getgroups === undefined || lib.symbols.getgroups === null)
            throw new FunctionMissingError("Symbol getgroups not found");

        const buf = new Uint32Array(1024);
        const ret = lib.symbols.getgroups(1024, buf);
        if (ret === -1)
            return new Uint32Array(0);

        const groups = buf.slice(0, ret);
        return groups;
    } finally {
        if(disposable)
            disposable.close();
    }
}