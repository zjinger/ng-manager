export interface Project {
    id: string;
    name: string;
    root: string;            // 工程根目录
    createdAt: number;
    updatedAt: number;

    // v0.1 先只支持“脚本字符串”，后续再扩展成模板/变量
    scripts?: {
        start?: string;        // eg: "npm run dev"
        build?: string;
        test?: string;
    };

    // 可选：环境变量（v0.1 可以先不做 UI）
    env?: Record<string, string>;
}
