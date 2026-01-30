import getPort from "get-port";
import open from "open";
import { startServerOnly } from "./server";

export async function startUi() {
    const port = await getPort({ port: [3210, 3211, 0] });

    startServerOnly({ port });

    await open(`http://127.0.0.1:${port}`);
}
