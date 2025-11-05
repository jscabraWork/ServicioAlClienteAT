import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuAdminComponent } from './components/menu-admin/menu-admin.component';
import { HardcodedAutheticationService } from './services/hardcoded-authetication.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuAdminComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Servicio al Cliente';

  constructor(public autenticador:HardcodedAutheticationService, public router: Router) {}
}
