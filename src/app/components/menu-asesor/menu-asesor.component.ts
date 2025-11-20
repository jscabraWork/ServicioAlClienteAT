import { CommonModule } from '@angular/common';
import { Component, HostListener, input, OnChanges, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

interface NavItem {
  route: string;
  icon: string;
  label: string;
  isLogout?: boolean;
}

@Component({
  selector: 'app-menu-asesor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-asesor.component.html',
  styleUrl: './menu-asesor.component.scss'
})
export class MenuAsesorComponent implements OnChanges {
  readonly nombre = input<string>('');
  readonly isCollapsed = signal(true);
  readonly isMobile = signal(false);
  readonly navItems = signal<NavItem[]>([]);

  constructor() {
    this.checkScreenSize();
    this.updateNavItems();
  }

  ngOnChanges(): void {
    this.updateNavItems();
  }

  private updateNavItems(): void {
    const asesor = sessionStorage.getItem('asesor');
    this.navItems.set([
      { route: `/crear-asesor`, icon: 'assets/agregarAsesor.png', label: 'Crear Asesor' },
      { route: `/casos-en-proceso/${asesor}`, icon: 'assets/casosProceso.png', label: 'Casos en proceso' },
      { route: `/casos-cerrados/${asesor}`, icon: 'assets/casosCerrados.png', label: 'Casos cerrados' },
      { route: '/logout', icon: 'assets/cerrar-sesion.png', label: 'Cerrar Sesión', isLogout: true }
    ]);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const mobile = window.innerWidth <= 768;
    this.isMobile.set(mobile);
    this.isCollapsed.set(true);
  }

  toggleSidebar(): void {
    this.isCollapsed.update(value => !value);
  }

  closeSidebar(): void {
    if (this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }

  onMouseEnter(): void {
    if (!this.isMobile()) {
      this.isCollapsed.set(false);
    }
  }

  onMouseLeave(): void {
    if (!this.isMobile()) {
      this.isCollapsed.set(true);
    }
  }
}