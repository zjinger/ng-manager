import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from '@core/auth';
import { ProjectContextStore } from '@core/state';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, NzButtonModule, NzFormModule, NzIconModule, NzInputModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.projectContext.loadProjects({ refreshScope: true }).subscribe({
          next: () => void this.router.navigateByUrl('/dashboard'),
        });
      },
      error: () => {
        this.message.error('登录失败，请检查用户名和密码');
      },
    });
  }
}
