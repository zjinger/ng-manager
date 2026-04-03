import { inject, Injectable } from '@angular/core';

import type { SurveyStatus } from '../../models/survey.model';
import { SurveyEditorCommandService } from './survey-editor.command.service';
import { SurveyEditorQueryService } from './survey-editor.query.service';
import { SurveyEditorStore } from './survey-editor.store';

@Injectable()
export class SurveyEditorFacade {
  private readonly queryService = inject(SurveyEditorQueryService);
  private readonly commandService = inject(SurveyEditorCommandService);

  readonly store = new SurveyEditorStore();

  loadBySurveyId(surveyId: string): void {
    this.queryService.loadBySurveyId(this.store, surveyId);
  }

  save(): void {
    this.commandService.save(this.store);
  }

  changeStatus(status: SurveyStatus): void {
    this.commandService.changeStatus(this.store, status);
  }

  copyPublicLink(): void {
    this.commandService.copyPublicLink(this.store);
  }

  viewSubmissions(): void {
    this.commandService.viewSubmissions(this.store);
  }

  backToList(): void {
    this.commandService.backToList();
  }
}
