
import * as fs from "fs";
import * as path from "path";
import { ProjectFramework } from "../project.meta";
import { ParsedPackageJson } from "../parsers/parsePackageJson";

export function detectFramework(
    rootDir: string,
    pkg: ParsedPackageJson | null
): ProjectFramework {
    // 1️⃣ angular.json 优先
    if (fs.existsSync(path.join(rootDir, "angular.json"))) {
        return "angular";
    }
    const deps = {
        ...(pkg?.dependencies ?? {}),
        ...(pkg?.devDependencies ?? {}),
    };
    // 2️⃣ Angular
    if (deps["@angular/core"]) return "angular";

    // 3️⃣ Vue
    if (deps["vue"]) return "vue";

    // 4️⃣ React
    if (deps["react"]) return "react";

    // 5️⃣ Node
    if (pkg) return "node";

    return "unknown";
}
