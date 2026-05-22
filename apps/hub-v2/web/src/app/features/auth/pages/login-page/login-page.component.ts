import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

import { AuthService } from '@core/auth';
import { hasRequiredPermissions } from '@core/auth';

const ADMIN_CONSOLE_PERMISSIONS = [
  'admin.dashboard.view',
  'admin.users.manage',
  'admin.departments.manage',
  'admin.roles.manage',
  'admin.audit.view',
  'admin.settings.manage',
];

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
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        const canAccessAdmin = hasRequiredPermissions(user.permissionCodes ?? [], ADMIN_CONSOLE_PERMISSIONS, 'any');
        void this.router.navigateByUrl(canAccessAdmin ? '/admin' : '/dashboard');
      },
      error: () => {
        this.message.error('登录失败，请检查用户名和密码');
      },
    });
  }
}
