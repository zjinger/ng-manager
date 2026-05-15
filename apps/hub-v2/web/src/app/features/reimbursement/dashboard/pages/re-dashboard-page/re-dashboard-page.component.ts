import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  PageHeaderComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ReDashboardPanelComponent } from '../../components/re-dashboard-panel/re-dashboard-panel';
import {
  MyTodosCardComponent,
  TodoItem,
} from '../../components/my-todos-card/my-todos-card';
import { QuickAccessCardComponent } from '../../components/quick-access-card/quick-access-card';
import { ReAnnouncementsComponent } from '../../components/re-announcements-card/re-announcements-card';
import { Router } from '@angular/router';
@Component({
  selector: 'app-re-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ReDashboardPanelComponent,
    MyTodosCardComponent,
    NzButtonModule,
    PageHeaderComponent,
    NzPopconfirmModule,
    NzIconModule,
    QuickAccessCardComponent,
    ReAnnouncementsComponent,
  ],
  templateUrl: './re-dashboard-page.component.html',
  styleUrls: ['./re-dashboard-page.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReDashboardPageComponent {
  private router = inject(Router);
  mockTodos: TodoItem[] = [
    {
      id: '1',
      code: 'BX-202604-018',
      kind: 'rd_verify',
      title: '请审批研发部门的预算申请',
      applicant: '张三',
      amount: 3860.0,
      waitingHours: 6,
      entityId: 'RD-2024-001',
      projectId: 'PROJ_ALPHA',
    },
    {
      id: '2',
      code: 'BX-202604-019',
      kind: 'issue_verify',
      title: '需求验证：用户登录功能优化',
      applicant: '李四',
      amount: 12500.0,
      waitingHours: 12,
      entityId: 'ISS-2024-089',
      projectId: 'PROJ_BETA',
    },
    {
      id: '3',
      code: 'BX-202604-020',
      kind: 'issue_assigned',
      title: '作为负责人跟进前端架构升级',
      applicant: '王五',
      amount: 2500.0,
      waitingHours: 3,
      entityId: 'ISS-2024-090',
      projectId: 'PROJ_ALPHA',
    },
    {
      id: '4',
      code: 'BX-202604-021',
      kind: 'issue_collaborating',
      title: '协作完成数据库迁移方案',
      applicant: '赵六',
      amount: 0,
      waitingHours: 24,
      entityId: 'ISS-2024-091',
      projectId: 'PROJ_GAMMA',
    },
    {
      id: '5',
      code: 'BX-202604-022',
      kind: 'rd_assigned',
      title: '负责代码审查流程改进',
      applicant: '孙七',
      amount: 1000.0,
      waitingHours: 2,
      entityId: 'RD-2024-002',
      projectId: 'PROJ_BETA',
    },
    {
      id: '6',
      code: 'BX-202604-023',
      kind: 'issue_verify',
      title: '验证支付接口安全漏洞修复',
      applicant: '周八',
      amount: 8900.0,
      waitingHours: 48,
      entityId: 'ISS-2024-092',
    },
  ];

  announcements = [
    {
      id: '1',
      title: '关于2025年第一季度报销截止日期的通知',
      summary: '请各部门注意，第一季度报销截止日期为2025年3月31日，逾期将不再受理...',
      publishAt: '2025-03-15T09:00:00',
      pinned: true,
      projectId: null,
    },
    {
      id: '2',
      title: '差旅费报销标准调整公告',
      summary: '根据公司最新政策，自2025年4月1日起，差旅费报销标准将进行调整...',
      publishAt: '2025-03-10T14:30:00',
      pinned: true,
      projectId: null,
    },
    {
      id: '3',
      title: '星辰云平台项目-服务器采购报销流程说明',
      summary: '针对星辰云平台项目服务器采购，请按照以下流程提交报销申请...',
      publishAt: '2025-03-08T10:15:00',
      pinned: false,
      projectId: 'PROJ_ALPHA',
    },
    {
      id: '4',
      title: '智能数据分析系统-差旅报销补充说明',
      summary: '项目组成员前往客户现场差旅，需提前在系统中提交出差申请...',
      publishAt: '2025-03-05T16:20:00',
      pinned: false,
      projectId: 'PROJ_BETA',
    },
    {
      id: '5',
      title: '关于报销发票合规性要求的提醒',
      summary: '近期发现部分报销发票存在合规性问题，请务必按照财务规定提供发票...',
      publishAt: '2025-03-01T11:00:00',
      pinned: false,
      projectId: null,
    },
    {
      id: '6',
      title: '移动办公套件项目-加班餐费报销指引',
      summary: '项目冲刺期间加班餐费报销标准为每人每餐50元，需提供小票...',
      publishAt: '2025-02-28T09:45:00',
      pinned: false,
      projectId: 'PROJ_GAMMA',
    },
    {
      id: '7',
      title: '财务系统升级通知',
      summary: '报销系统将于3月20日22:00-24:00进行升级维护，期间暂停服务...',
      publishAt: '2025-02-25T15:30:00',
      pinned: false,
      projectId: null,
    },
    {
      id: '8',
      title: '第一季度团建费用报销说明',
      summary: '各部门团建费用报销标准为人均200元，需提供活动照片和参与人员名单...',
      publishAt: '2025-02-20T10:00:00',
      pinned: false,
      projectId: null,
    },
  ];
  // 新建差旅费报销
  createTravelReport(): void {
    this.router.navigate(['/financing/addTravelExpense']);
  }
}
