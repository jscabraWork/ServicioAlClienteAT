import { Routes } from '@angular/router';
import { CasosComponent } from './components/casos/casos.component';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';
import { CrearAsesorComponent } from './components/crear-asesor/crear-asesor.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent},
  { path: 'login', component: LoginComponent},
  { path: 'home', component: LoginComponent},
  { path: 'casos-en-proceso/:nombreAsesor', component: CasosComponent, canActivate: [authGuard], data: { tipo: 'en-proceso' } },
  { path: 'casos-cerrados/:nombreAsesor', component: CasosComponent, canActivate: [authGuard], data: { tipo: 'cerrados' } },
  { path: 'crear-asesor', component: CrearAsesorComponent, canActivate: [authGuard] },
  { path: 'logout', component: LogoutComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login', pathMatch: 'full' }
];
