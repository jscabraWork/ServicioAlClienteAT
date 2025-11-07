import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../seguridad/auth.service";

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const token = auth.token;

    // No agregar token Bearer a la petición de OAuth (usa Basic Auth)
    if(req.url.includes('/oauth/token')) {
        return next(req);
    }

    if(token != null && token !== '') {
        const authReq = req.clone({
            headers: req.headers.set('Authorization', 'Bearer ' + token)
        });
        return next(authReq);
    }

    return next(req);
};