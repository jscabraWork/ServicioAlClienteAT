import { Injectable } from "@angular/core";
import { Client } from "@stomp/stompjs";
import SockJS from 'sockjs-client';
import { Observable, Subject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private client: Client;
    private mensajesSubject = new Subject<any>();
    private conectado = false;

    constructor() {
        this.client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8090/api/sac/ws'),
            reconnectDelay: 5000,
            debug: (str) => console.log(str),
            onConnect: () => {
                console.log('WebSocket conectado');
                this.conectado = true;
            },
            onDisconnect: () => {
                console.log('WebSocket desconectado');
                this.conectado = false;
            },
            onStompError: (frame) => {
                console.error('Error STOMP:', frame);
            }
        });
    }

    conectar() {
        if (!this.client.active) {
            this.client.activate();
        }
    }

    suscribirACaso(casoId: string): Observable<any> {
        const subject = new Subject<any>();

        const suscribir = () => {
            this.client.subscribe(`/topic/casos/${casoId}/mensajes`, (message) => {
                const mensaje = JSON.parse(message.body);
                subject.next(mensaje);
            });
        };

        if (this.conectado) {
            suscribir();
        } else {
            const intervalo = setInterval(() => {
                if (this.conectado) {
                    suscribir();
                    clearInterval(intervalo);
                }
            }, 100);
        }

        if (!this.client.active) {
            this.client.activate();
        }

        return subject.asObservable();
    }

    desconectar() {
        if (this.client.active) {
            this.client.deactivate();
        }
    }
}