import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { SurveyEditorLeftPanelComponent } from '../../components/survey-editor-left-panel.component';
import { SurveyEditorRightPanelComponent } from '../../components/survey-editor-right-panel.component';
import { SurveyEditorTopbarComponent } from '../../components/survey-editor-topbar.component';
import { SurveyPreviewModalComponent } from '../../components/survey-preview-modal.component';
import { SurveyQuestionCardComponent } from '../../components/survey-question-card.component';
import { SurveyEditorFacade } from './survey-editor.facade';

@Component({
  selector: 'app-survey-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    SurveyEditorTopbarComponent,
    SurveyEditorLeftPanelComponent,
    SurveyEditorRightPanelComponent,
    SurveyQuestionCardComponent,
    SurveyPreviewModalComponent,
  ],
  providers: [SurveyEditorFacade],
  templateUrl: './survey-editor-page.component.html',
  styleUrl: './survey-editor-page.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyEditorPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly facade = inject(SurveyEditorFacade);
  readonly store = this.facade.store;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const surveyId = (params.get('surveyId') || '').trim();
      this.facade.loadBySurveyId(surveyId);
    });
  }
}
