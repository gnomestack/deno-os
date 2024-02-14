import { semver, Result } from "../deps.ts";

export interface IPkgMgr {
    install(pkg: string | IPkgIdInfo, options?: PkgMgrInstallOptions): Promise<Result<IPkgId>>;

    installMany(pkgs: (string | IPkgIdInfo)[], options?: PkgMgrInstallManyOptions): Promise<Result<PkgMgrResult>[]>;

    upgrade(pkg: string | IPkgIdInfo, options?: PkgMgrUpgradeOptions): Promise<Result<IPkgId>>;

    upgradeMany(pkgs: (string | IPkgIdInfo)[], options?: PkgMgrUpgradeManyOptions): Promise<Result<PkgMgrResult>[]>;

    uninstall(pkg: string | IPkgIdInfo, options?: PkgMgrUninstallOptions): Promise<Result<IPkgId>>;

    uninstallMany(pkgs: (string | IPkgIdInfo)[], options?: PkgMgrUninstallOptions): Promise<Result<PkgMgrResult>[]>;

    list(query?: string): Promise<Result<IPkgId[]>>;

    search(query?: string): Promise<Result<IPkgId[]>>;

    /**
     * Check if the package manager is installed
     * and available on the system.
     */
    online(): Promise<Result<boolean>>;
}

export interface PkgMgrInstallOptions extends Record<string, unknown> {
    quiet?: boolean;
}

export interface PkgMgrInstallManyOptions extends Record<string, unknown> {
    quiet?: boolean;
    stopOnError?: boolean;
}

export interface PkgMgrUpgradeOptions extends Record<string, unknown> {
    quiet?: boolean;
}

export interface PkgMgrUpgradeManyOptions extends Record<string, unknown> {
    quiet?: boolean;
    stopOnError?: boolean;
}


export interface PkgMgrUninstallOptions extends Record<string, unknown> {
    quiet?: boolean;
}

export interface PkgMgrListOptions extends Record<string, unknown> {
    query?: string;
}

export interface PkgMgrSearchOptions extends Record<string, unknown> {
    query?: string;
}

export interface PkgMgrResult extends Record<string, unknown> {
    name: string;
    versionString: string | undefined;
    code: number;
    stdout: Uint8Array;
    stderr: Uint8Array;
}

export interface IPkgIdInfo {
    name: string;
    versionString: string | undefined;
    version: semver.SemVer | undefined;
}

export interface IPkgId extends IPkgIdInfo {
    greaterThan(other: IPkgId): boolean;
    lessThan(other: IPkgId): boolean;
    equals(other: IPkgId): boolean;
    greaterOrEqual(other: IPkgId): boolean;
    lessOrEqual(other: IPkgId): boolean;
    toString(): string;
}

export class PkgId implements IPkgIdInfo, IPkgId {
    #version: semver.SemVer | undefined;
    #versionString: string | undefined;

    constructor(public name: string, versionString?: string) {
        this.versionString = versionString;
    }

    get versionString(): string | undefined {
        return this.#versionString;
    }

    set versionString(value: string | undefined) {
        this.#versionString = value;
        this.#version = undefined;
        if (value)
        {
            try {
                this.#version = semver.parse(value);
            } catch {
                // ignore
            }
        }
    }

    get version(): semver.SemVer | undefined {
        return this.#version;
    }

    set version(value: semver.SemVer | undefined) {
        this.#version = value;
        if (value)
            this.#versionString = semver.format(value);
        else 
            this.#versionString = undefined;
    }

    public static parse(pkg: string): PkgId {
        const idx = pkg.indexOf("@");
        if (idx === -1)
            return new PkgId(pkg);
        else
            return new PkgId(pkg.substring(0, idx), pkg.substring(idx + 1));
    }

    greaterThan(other: PkgId): boolean {
        if (this.version === undefined || other.version === undefined)
            return false;
        return semver.greaterThan(this.version, other.version);
    }

    lessThan(other: PkgId): boolean {
        if (this.version === undefined || other.version === undefined)
            return false;
        return semver.lessThan(this.version, other.version);
    }

    equals(other: PkgId): boolean {
        if (this.versionString === other.versionString)
            return true;

        if (this.version === undefined)
            return other.version === undefined;
        else if (other.version === undefined)
            return false;

        return semver.equals(this.version, other.version);
    }

    greaterOrEqual(other: PkgId): boolean {
        if (this.versionString === other.versionString)
            return true;

        if (this.version === undefined)
            return other.version === undefined || true; // if this version undefined and the other has a version, this counts as latest;
        else if (other.version === undefined)
            return true;

        return semver.greaterOrEqual(this.version, other.version);
    }

    lessOrEqual(other: PkgId): boolean {
        if (this.versionString === other.versionString)
            return true;

        if (other.version === undefined)
            return this.version === undefined || false; // if this has a version the other counts as latest;
        if (this.version === undefined)
            return true;
    
        return semver.lessOrEqual(this.version, other.version);
    }


    toString(): string {
        if (this.version === undefined)
            return this.name;
        else
            return `${this.name}@${this.version}`;
    }
}