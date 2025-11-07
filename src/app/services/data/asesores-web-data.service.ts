import { Injectable } from "@angular/core";
import { CommonDataServiceUsuario } from "../commons/common-data-usuario.service";
import { API_URL_USUARIOS } from "../../app.constants";
import { Usuario } from "../../models/usuario.model";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class AsesoresWebDataService extends CommonDataServiceUsuario<Usuario> {
    protected override baseEndpoint = `${API_URL_USUARIOS}/asesor`;

    constructor(protected override http: HttpClient) {
        super(http)
    }
}