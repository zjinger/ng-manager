"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UI = require("sketch/ui");
var i18n = require("./i18n");
var SETTINGS_PREFIX = "com.ng-manager.ai-handoff.";
var OUTPUT_ROOT_KEY = SETTINGS_PREFIX + "outputRoot";
var EXPORT_SCREENSHOT_KEY = SETTINGS_PREFIX + "exportScreenshot";
function joinPath() {
    var parts = Array.prototype.slice.call(arguments).filter(function (part) {
        return part !== null && part !== undefined && String(part).length > 0;
    });
    return parts
        .map(function (part, index) {
        var value = String(part);
        if (index === 0) {
            return value.replace(/\/+$/g, "");
        }
        return value.replace(/^\/+|\/+$/g, "");
    })
        .join("/");
}
function getDefaults() {
    return {
        outputRoot: joinPath(String(NSHomeDirectory()), "Desktop", "ngm-ai-handoff"),
        exportScreenshot: true,
    };
}
function getDefaultsStore() {
    return NSUserDefaults.standardUserDefaults();
}
function getStoredString(key) {
    var value = getDefaultsStore().objectForKey(key);
    if (!value) {
        return null;
    }
    return String(value);
}
function hasStoredValue(key) {
    var value = getDefaultsStore().objectForKey(key);
    return value !== null && value !== undefined;
}
function setStoredValue(key, value) {
    getDefaultsStore().setObject_forKey(String(value), key);
    getDefaultsStore().synchronize();
}
function setStoredBoolean(key, value) {
    getDefaultsStore().setBool_forKey(Boolean(value), key);
    getDefaultsStore().synchronize();
}
function getSettings() {
    var defaults = getDefaults();
    return {
        outputRoot: getStoredString(OUTPUT_ROOT_KEY) || defaults.outputRoot,
        exportScreenshot: hasStoredValue(EXPORT_SCREENSHOT_KEY)
            ? Boolean(getDefaultsStore().boolForKey(EXPORT_SCREENSHOT_KEY))
            : defaults.exportScreenshot,
    };
}
function chooseExportFolder(currentPath) {
    var panel = NSOpenPanel.openPanel();
    panel.setCanChooseFiles(false);
    panel.setCanChooseDirectories(true);
    panel.setCanCreateDirectories(true);
    panel.setAllowsMultipleSelection(false);
    panel.setPrompt(i18n.STRINGS.settings.chooseFolderButton);
    panel.setMessage(i18n.STRINGS.settings.chooseFolderPrompt);
    if (currentPath) {
        panel.setDirectoryURL(NSURL.fileURLWithPath(currentPath));
    }
    var response = panel.runModal();
    var okResponse = typeof NSModalResponseOK !== "undefined" ? NSModalResponseOK : 1;
    if (response !== okResponse && response !== 1) {
        return null;
    }
    return String(panel.URL().path());
}
function configureSettings() {
    var settings = getSettings();
    var alert = NSAlert.alloc().init();
    alert.setMessageText(i18n.STRINGS.settings.title);
    alert.setInformativeText([
        i18n.STRINGS.settings.exportFolder + "：",
        settings.outputRoot || i18n.STRINGS.settings.exportFolderPlaceholder,
        "",
        i18n.STRINGS.settings.screenshot + "：",
        settings.exportScreenshot ? i18n.STRINGS.settings.enabled : i18n.STRINGS.settings.disabled,
    ].join("\n"));
    alert.addButtonWithTitle(i18n.STRINGS.settings.chooseFolder);
    alert.addButtonWithTitle(settings.exportScreenshot ? i18n.STRINGS.settings.disable : i18n.STRINGS.settings.enable);
    alert.addButtonWithTitle(i18n.STRINGS.settings.cancel);
    var response = alert.runModal();
    var firstButton = typeof NSAlertFirstButtonReturn !== "undefined" ? NSAlertFirstButtonReturn : 1000;
    var secondButton = typeof NSAlertSecondButtonReturn !== "undefined" ? NSAlertSecondButtonReturn : 1001;
    if (response === firstButton) {
        var selected = chooseExportFolder(settings.outputRoot);
        if (selected) {
            setStoredValue(OUTPUT_ROOT_KEY, selected);
            UI.message(i18n.STRINGS.pluginName + " · " + i18n.STRINGS.settings.folderUpdated);
        }
        return;
    }
    if (response === secondButton) {
        setStoredBoolean(EXPORT_SCREENSHOT_KEY, !settings.exportScreenshot);
        UI.message(i18n.STRINGS.pluginName +
            " · " +
            (!settings.exportScreenshot ? i18n.STRINGS.settings.screenshotEnabled : i18n.STRINGS.settings.screenshotDisabled));
    }
}
module.exports = {
    getSettings: getSettings,
    configureSettings: configureSettings,
    joinPath: joinPath,
};
