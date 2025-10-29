import { Routes } from '@angular/router';
import { CasosEnProcesoComponent } from './components/casos-en-proceso/casos-en-proceso.component';
import { CasosCerradosComponent } from './components/casos-cerrados/casos-cerrados.component';

export const routes: Routes = [
  { path: '', redirectTo: '/casos-en-proceso', pathMatch: 'full' },
  { path: 'casos-en-proceso', component: CasosEnProcesoComponent },
  { path: 'casos-cerrados', component: CasosCerradosComponent }
];
