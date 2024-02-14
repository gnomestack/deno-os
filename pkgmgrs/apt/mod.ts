import { ProcessError, ok } from "../../deps.ts";
import { Result, fail, ps } from "../../deps.ts";
import { PkgMgrResult } from "../types.ts";
import { IPkgIdInfo, PkgId, PkgMgrInstallOptions, PkgMgrInstallManyOptions } from "../types.ts";

export interface AptInstallOptions extends PkgMgrInstallOptions {
    noRecommends?: boolean;
}

export interface AptInstallManyOptions extends AptInstallOptions, PkgMgrInstallManyOptions {
}

export async function install(pkg: string | IPkgIdInfo, options?: AptInstallOptions): Promise<Result<PkgMgrResult>> {
    if (typeof pkg === "string") {
        pkg = PkgId.parse(pkg);
    }

    const splat = ["install"];
    if (options?.noRecommends) {
        splat.push("--no-install-recommends");
    }


    splat.push("-y");
    if (pkg.versionString) {
        splat.push(`${pkg.name}=${pkg.versionString}`);
    } else {
        splat.push(pkg.name);
    }

    options = options || {};

    const cmd = ps.ps("apt-get", splat);
    const r = options.quiet ? await cmd.quiet() : await cmd;
    if (r.code !== 0) {
        return fail<PkgMgrResult>(new ProcessError("apt-get", r.code, "apt-get failed to install package"));
    }

    return ok({
        name: pkg.name,
        versionString: pkg.versionString,
        version: pkg.version,
        code: r.code,
        stdout: r.stdout,
        stderr: r.stderr,
    } as PkgMgrResult);
}

export async function installMany(pkgs: (string | IPkgIdInfo)[], options?: AptInstallManyOptions): Promise<Result<PkgMgrResult>[]> {
    const results: Result<PkgMgrResult>[] = [];
    for (const pkg of pkgs) {
        const r = await install(pkg, options);
        results.push(r);

        if (options?.stopOnError && r.isError) {
            return results;
        }
    }

    return results;
}