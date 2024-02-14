import { test, assert } from "../../deps.dev.ts"
import { IS_WINDOWS } from "../../deps.ts";
import { getGroups, getGroupsRes, getGroup, getGroupRes, getGroupName, getGroupNameRes, getUserName, getUserNameRes, getUser, getUserRes } from "./native.ts";

test("getGroups", () => {
    const groups = getGroups();
    if (IS_WINDOWS) {
        assert.equals(groups.length, 0, "groups should be empty on Windows.");
    } else {
        assert.ok(groups.length > 0);
    }
});

test("getGroupsRes", () => {
    const r = getGroupsRes();
    if (IS_WINDOWS) {
        assert.falsey(r.isOk);
    } else {
        assert.ok(r.isOk);
        const groups = r.unwrap();
        assert.ok(groups.length > 0);
    }
});

test("getGroupName", () => {
    const name = getGroupName(0);
    if (IS_WINDOWS) {
        assert.ok(name === null, "name should be null on Windows.");
    } else {
        assert.equals(name, "root");
    }
});

test("getGroupNameRes", () => {
    const r = getGroupNameRes(0);
    if (IS_WINDOWS) {
        assert.falsey(r.isOk);
    } else {
        assert.ok(r.isOk);
        assert.equals(r.unwrap(), "root");
    }
});

test("getGroup", () => {
    const group = getGroup(0);
    if (IS_WINDOWS) {
        assert.ok(group === null, "group should be null on Windows.");
    } else {
        assert.exists(group);
        assert.equals(group.name, "root");
        assert.equals(group.gid, 0);
        assert.equals(group.members.length, 0);
    }
});

test("getGroupRes", () => {
    const r = getGroupRes(0);
    if (IS_WINDOWS) {
        assert.falsey(r.isOk);
    } else {
        assert.ok(r.isOk);
        const group = r.unwrap();
        assert.equals(group.name, "root");
        assert.equals(group.gid, 0);
        assert.equals(group.members.length, 0);
    }
});

test("getUserName", () => {
    const name = getUserName(0);
    if (IS_WINDOWS) {
        assert.ok(name === null, "name should be null on Windows.");
    } else {
        assert.exists(name);
        assert.equals(name, "root");
    }
});

test("getUserRes", () => {
    const r = getUserRes(0);
    if (IS_WINDOWS) {
        assert.falsey(r.isOk);
    } else {
        assert.ok(r.isOk);
        const user = r.unwrap();
        assert.equals(user.name, "root");
        assert.equals(user.uid, 0);
        assert.equals(user.gid, 0);
    }
});

test("getUser", () => {
    const user = getUser(0);
    if (IS_WINDOWS) {
        assert.ok(user === null, "user should be null on Windows.");
    } else {
        assert.exists(user);
        assert.equals(user.name, "root");
        assert.equals(user.uid, 0);
        assert.equals(user.gid, 0);
    }
});


