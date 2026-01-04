import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-project-list.component',
  imports: [CommonModule, NzCardModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.less',
})
export class ProjectListComponent {

}
