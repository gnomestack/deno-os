import { test, assert } from "../../deps.dev.ts"
import { Registry } from "./mod.ts";
import { IS_WINDOWS } from "../../deps.ts";

test.when(IS_WINDOWS, "registry", () => {
    const hkcu = Registry.hkcu;
    assert.exists(hkcu);
    const key = Registry.hkcu.openSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Run");
    assert.exists(key);
    assert.equals(key.name, "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run");
    Registry.close();
});