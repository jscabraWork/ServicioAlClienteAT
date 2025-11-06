import { Routes } from '@angular/router';
import { CasosEnProcesoComponent } from './components/casos-en-proceso/casos-en-proceso.component';
import { CasosCerradosComponent } from './components/casos-cerrados/casos-cerrados.component';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';
import { CrearAsesorComponent } from './components/crear-asesor/crear-asesor.component';

export const routes: Routes = [
  { path: '', component: LoginComponent},
  { path: 'login', component: LoginComponent},
  { path: 'home', component: LoginComponent},
  { path: 'casos-en-proceso/:nombreAdmin', component: CasosEnProcesoComponent },
  { path: 'casos-cerrados/:nombreAdmin', component: CasosCerradosComponent },
  { path: 'crear-asesor', component: CrearAsesorComponent },
  { path: 'logout', component: LogoutComponent }
];
