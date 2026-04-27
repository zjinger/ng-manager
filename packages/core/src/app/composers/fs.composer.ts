import { FsServiceImpl } from "../../domain/fs/fs.service.impl";

export function createFsDomain() {
    return new FsServiceImpl();
}
