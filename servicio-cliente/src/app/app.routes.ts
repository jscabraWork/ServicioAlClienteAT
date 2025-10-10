import { Routes } from '@angular/router';
import { CasosAbiertosComponent } from './components/casos-abiertos/casos-abiertos.component';
import { CasosEnProcesoComponent } from './components/casos-en-proceso/casos-en-proceso.component';

export const routes: Routes = [
  { path: '', redirectTo: '/casos-abiertos', pathMatch: 'full' },
  { path: 'casos-abiertos', component: CasosAbiertosComponent },
  { path: 'casos-en-proceso', component: CasosEnProcesoComponent }
];
