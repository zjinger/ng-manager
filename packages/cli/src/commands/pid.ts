export function pidExists(pid: number): boolean {
    if (!pid || pid <= 0) return false;
    try {
        process.kill(pid, 0); // 不会真的 kill
        return true;
    } catch {
        return false;
    }
}
