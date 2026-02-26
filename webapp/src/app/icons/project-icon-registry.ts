import { Injectable } from "@angular/core";
import { NzIconService } from "ng-zorro-antd/icon";
import { ICON_ANGULAR, ICON_ESLINT, ICON_NODE, ICON_REACT, ICON_SVN, ICON_VUE } from "./project-icons";

@Injectable({ providedIn: "root" })
export class ProjectIconRegistry {
    private inited = false;

    constructor(private icons: NzIconService) { }

    init() {
        if (this.inited) return;
        this.inited = true;

        // 注册为 nzType，可复用
        this.icons.addIconLiteral("proj:angular", ICON_ANGULAR);
        this.icons.addIconLiteral("proj:vue", ICON_VUE);
        this.icons.addIconLiteral("proj:react", ICON_REACT);
        this.icons.addIconLiteral("proj:node", ICON_NODE);
        this.icons.addIconLiteral("proj:eslint", ICON_ESLINT);
        this.icons.addIconLiteral("proj:svn", ICON_SVN);
    }
}
