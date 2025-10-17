import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuAdminComponent } from './components/menu-admin/menu-admin.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuAdminComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Servicio al Cliente';
}
