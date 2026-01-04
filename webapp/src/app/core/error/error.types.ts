export type ErrorLevel =
    | "silent"     // 不提示（状态变化即可）
    | "toast"      // 普通错误提示
    | "banner"     // 顶部/全局横幅（连接断开等）
    | "modal"      // 阻断操作（少见）
    | "dev-only";  // 只在 dev 环境 console


export type ErrorAction = {
    retry?: boolean;
    redirect?: string;
    reload?: boolean;
};
