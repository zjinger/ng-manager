import { Component } from '@angular/core';
import { ProjectService } from '../project.service';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-import.component',
  imports: [CommonModule, FormsModule, RouterModule, NzCardModule, NzInputModule, NzButtonModule],
  templateUrl: './project-import.component.html',
  styleUrl: './project-import.component.less',
})
export class ProjectImportComponent {
  path = '';

  constructor(
    private api: ProjectService,
    private router: Router,
    private msg: NzMessageService
  ) { }

  async pick() {
    const p = await this.api.pickFolder();
    if (p) this.path = p;
  }

  goCreate() {
    const p = this.path.trim();
    if (!p) return;
    // 关键：导入后走 create 的 Step2（预设识别/导入任务）
    this.router.navigate(['/projects/create'], { queryParams: { mode: 'import', path: p } });
  }
}
