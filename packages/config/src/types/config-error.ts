export interface ConfigWarning {
  code: string;
  message: string;
  level?: "info" | "warning" | "error";
}
