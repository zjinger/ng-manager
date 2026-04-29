/**
 * 系统日志相关类型定义
 *  -debug: 详细调试信息，通常用于开发和排查问题
 *  -info: 一般信息，记录系统正常运行的事件
 *  -warn: 警告信息，表示可能存在的问题，但不影响系统运行
 *  -error: 错误信息，表示系统出现了问题，可能需要关注和处理
 *  -success: 成功信息，表示某个操作成功完成
 */
export type SystemLogLevel = "debug" | "info" | "warn" | "error" | "success";


/**
 * 日志来源，表示日志产生的具体来源或组件（谁产生了这条日志）
 * - system: 系统日志，通常由系统组件产生
 * - task: 任务日志，由具体的任务执行过程中产生
 * - server: 服务器日志，记录服务器端事件和操作
 * - desktop: 桌面日志，记录桌面应用相关事件
 * - web: Web 日志，记录 Web 端事件和操作 
 * - node-version: Node 版本管理相关日志，记录 Node 版本切换和管理事件
 */
export type SystemLogSource =
    | "system"
    | "task"
    | "server"
    | "desktop"
    | "node-version";

/**
 *  日志作用域，来源内部的操作范围 / 动作类型 / 子流程 （这条日志属于该 source 内部的哪个动作/子场景）
 * - system: 系统级日志，通常由系统组件产生
 * - task: 任务相关日志，由具体的任务执行过程中产生
 * - project: 项目相关日志，记录与项目操作相关的事件
 * - git: Git 相关日志，记录 Git 操作和事件
 * - svn: SVN 相关日志，记录 SVN 操作和事件
 * - sprite: Sprite 相关日志，记录与 Sprite 组件相关的事件
 * - fs: 文件系统相关日志，记录文件操作和事件
 * - terminal: 终端相关日志，记录终端输入输出和事件
 * - ai: AI 相关日志，记录与 AI 功能相关的事件
 * - node-version: Node 版本管理相关日志，记录 Node 版本切换和管理事件
 */
export type SystemLogScope =
    | "system"
    | "task"
    | "project"
    | "git"
    | "svn"
    | "sprite"
    | "fs"
    | "terminal"
    | "ai"
    | "node-version"
    | "server"
    | "ws"
    | "desktop"
    | "plugin"
    | "storage"
    | "process"
    | "core";

export interface SystemLogEntry {
    id?: string;
    ts: number;
    level: SystemLogLevel;
    source: SystemLogSource;
    scope: SystemLogScope;
    refId?: string; // 关联对象 ID：如 taskId、projectId 等，便于日志追踪和过滤
    text: string;
    data?: any;
}

export interface LogLine extends SystemLogEntry { }

export interface LogOutputPayload {
    level: SystemLogLevel;
    scope: SystemLogScope;
    source?: SystemLogSource;
    refId?: string;
    text: string;
    data?: Record<string, any>;
}
