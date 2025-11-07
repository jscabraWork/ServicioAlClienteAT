import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthService } from "../seguridad/auth.service";
import { Router } from "@angular/router";
import { catchError, Observable, throwError } from "rxjs";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private auth: AuthService, private router: Router){}
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError(e => {
                if(e.status == 401) {
                    if(this.auth.isAuthenticated()){
                        this.auth.logout();
                        alert(`Hola ${this.auth.usuario.usuario} tu sesión ha expirado`);
                        this.router.navigate(['/logout'])
                    }
                }
                return throwError(e);
            })
        )
    }
}