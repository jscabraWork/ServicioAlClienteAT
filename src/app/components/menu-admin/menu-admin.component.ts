import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-admin.component.html',
  styleUrl: './menu-admin.component.scss'
})
export class MenuAdminComponent implements OnInit {
  @Input() nombre: string = '';
  isCollapsed = false;
  isMobile = false;

  navItems: any[] = [];

  constructor() {}

  ngOnInit() {
    this.checkScreenSize();
    this.updateNavItems();
  }

  ngOnChanges() {
    this.updateNavItems();
  }

  private updateNavItems() {
    const administrador = sessionStorage.getItem('administrador');
    this.navItems = [
      //{ route: `/buscar`, icon: 'assets/lupa2.png', label: '' },
      { route: `/casos-en-proceso/${administrador}`, icon: 'assets/casosProceso.png', label: 'Casos en proceso' },
      { route: `/casos-cerrados/${administrador}`, icon: 'assets/casosCerrados.png', label: 'Casos cerrados' },
      { route: '/logout', icon: 'assets/cerrar-sesion.png', label: 'Cerrar Sesión', isLogout: true }
    ];
  }

  @HostListener('window:resize') onResize() { this.checkScreenSize(); }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) this.isCollapsed = true;
    else this.isCollapsed = true; // Desktop: collapsed by default
  }

  toggleSidebar() { this.isCollapsed = !this.isCollapsed; }
  closeSidebar() { if (this.isMobile) this.isCollapsed = true; }

  onMouseEnter() {
    if (!this.isMobile) {
      this.isCollapsed = false;
    }
  }

  onMouseLeave() {
    if (!this.isMobile) {
      this.isCollapsed = true;
    }
  }
}