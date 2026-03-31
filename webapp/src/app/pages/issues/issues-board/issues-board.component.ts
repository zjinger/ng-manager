import { Component, computed, input, output } from '@angular/core';
import { NzDrawerModule, NzDrawerPlacement } from 'ng-zorro-antd/drawer';
import { IssueCommentEntity, IssueEntity, IssueLogEntity } from '../models/issue.model';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { IssueActionAreaComponent } from '../issue-detail/issue-action-area/issue-action-area.component';

@Component({
  selector: 'app-issues-board',
  imports: [],
  template: ``,
  styleUrl: './issues-board.component.less',
})
export class IssuesBoardComponent {}
