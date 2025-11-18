import { Routes } from '@angular/router';
import { CasosComponent } from './components/casos/casos.component';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';
import { CrearAsesorComponent } from './components/crear-asesor/crear-asesor.component';

export const routes: Routes = [
  { path: '', component: LoginComponent},
  { path: 'login', component: LoginComponent},
  { path: 'home', component: LoginComponent},
  { path: 'casos-en-proceso/:nombreAsesor', component: CasosComponent, data: { tipo: 'en-proceso' } },
  { path: 'casos-cerrados/:nombreAsesor', component: CasosComponent, data: { tipo: 'cerrados' } },
  { path: 'crear-asesor', component: CrearAsesorComponent },
  { path: 'logout', component: LogoutComponent }
];
