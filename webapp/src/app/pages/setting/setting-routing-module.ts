import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./setting.component').then((m) => m.SettingComponent),
    children: [
      {
        path: '',
        redirectTo: 'ai-agent',
        pathMatch: 'full',
      },
      {
        path: 'ai-agent',
        loadComponent: () =>
          import('./pages/ai-agent-settings/ai-agent-settings.component').then(
            (m) => m.AiAgentSettingsComponent
          ),
      },
      {
        path: 'skills-hub',
        loadComponent: () =>
          import('./pages/skills-hub-settings/skills-hub-settings.component').then(
            (m) => m.SkillsHubSettingsComponent
          ),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule { }
