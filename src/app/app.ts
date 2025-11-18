import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuAsesorComponent } from './components/menu-asesor/menu-asesor.component';
import { HardcodedAutheticationService } from './services/hardcoded-authetication.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, MenuAsesorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'Servicio al Cliente';

  constructor(public autenticador:HardcodedAutheticationService, public router: Router) {}
}
