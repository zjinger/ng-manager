export type ConfigField =
    | { kind: "boolean"; key: string; label: string; path: string; default?: boolean; help?: string }
    | { kind: "string"; key: string; label: string; path: string; placeholder?: string; help?: string }
    | { kind: "path"; key: string; label: string; path: string; mustExist?: boolean; placeholder?: string; help?: string }
    | { kind: "select"; key: string; label: string; path: string; options: { label: string; value: any }[]; help?: string };

export type ConfigGroup = {
    id: string;
    title: string;      // 右侧 group-title
    fields: ConfigField[];
};

export type ConfigCategory = {
    id: string;          // 左侧 item id，例如 "angular" | "eslint"
    name: string;        // 左侧 name
    description?: string;// 左侧 description
    icon?: string;       // 左侧 icon type，例如 "proj:angular"
    groups: ConfigGroup[];
};

export type ConfigDescriptor = {
    projectType: "angular";
    file: string; // angular.json absolute path（当前类目主要入口文件）
    categories: ConfigCategory[];
};

export type JsonPatchOp =
    | { op: "add" | "replace"; path: string; value: any }
    | { op: "remove"; path: string };

export type PatchResult = {
    ok: boolean;
    file: string;
    dryRun: boolean;
    backupId?: string;
    diffText?: string;
};
