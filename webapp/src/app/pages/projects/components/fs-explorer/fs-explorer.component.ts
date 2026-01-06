import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropDownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzModalModule } from "ng-zorro-antd/modal";
import { NzSwitchModule } from "ng-zorro-antd/switch";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { AboutRoutingModule } from "@pages/about/about-routing-module";
import { FsService } from "@pages/projects/services/fs.service";

@Component({
  selector: "app-fs-explorer",
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzDropDownModule,
    NzMenuModule,
    NzSwitchModule,
    NzModalModule,
    AboutRoutingModule,
  ],
  templateUrl: "./fs-explorer.component.html",
  styleUrl: "./fs-explorer.component.less",
})
export class FsExplorerComponent implements OnInit {
  constructor(public fs: FsService) { }

  ngOnInit() {
    this.fs.load();
  }
}
