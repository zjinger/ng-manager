import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [NzIconModule, NzInputModule],
  host: {
    class: 'search-box',
  },
  template: `
      <nz-input-wrapper>
        <span nz-icon nzType="search" nzTheme="outline" nzInputPrefix></span>
        <input
          nz-input
          #box
          class="search-box__input"
          type="text"
          [placeholder]="placeholder()"
          [value]="value()"
          (input)="valueChange.emit(box.value)"
          (keyup.enter)="submitted.emit(box.value)"
        />
     </nz-input-wrapper>
  `,
  styles: [
    `
     :host.search-box {
        position: relative;
        display: flex;
        align-items: center;
        min-width: min(320px, 100%);
        flex: 1 1 320px;
        max-width: 320px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoxComponent {
  readonly value = input('');
  readonly placeholder = input('搜索…');
  readonly valueChange = output<string>();
  readonly submitted = output<string>();
}
