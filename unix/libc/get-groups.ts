import { FunctionMissingError, IClosable, IS_WINDOWS, PlatformNotSupportedError, fail, ok } from "./types.ts";



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