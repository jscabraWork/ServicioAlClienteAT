# Sonidos de Notificación

## Archivo de sonido requerido

Coloca un archivo de sonido llamado `notification.mp3` en esta carpeta para las notificaciones.

### Recomendaciones:
- **Formato:** MP3 o WAV
- **Duración:** 0.5 - 2 segundos
- **Volumen:** Moderado (no muy alto)
- **Tamaño:** Menos de 100KB

### Opciones para obtener un sonido:

1. **Descargar sonidos gratuitos:**
   - [Freesound.org](https://freesound.org/)
   - [Zapsplat.com](https://www.zapsplat.com/)
   - [Notification Sounds](https://notificationsounds.com/)

2. **Usar un sonido de sistema:**
   - Windows: Copiar desde `C:\Windows\Media\`
   - macOS: Copiar desde `/System/Library/Sounds/`

3. **Generar con herramientas online:**
   - [Bfxr](https://www.bfxr.net/) - Generador de efectos de sonido
   - [ChipTone](https://sfbgames.itch.io/chiptone) - Generador de sonidos retro

### Si no agregas un archivo:

El sistema automáticamente generará un "beep" simple usando Web Audio API.
Este sonido generado funcionará perfectamente, pero puedes personalizarlo agregando tu propio archivo.

### Ejemplo de nombre de archivo:

```
notification.mp3
```

o

```
notification.wav
```

## Cambiar el archivo de sonido

Si quieres usar un archivo con diferente nombre, edita el archivo:
`src/app/services/notificaciones.service.ts`

Y cambia esta línea:
```typescript
this.audioNotificacion.src = 'assets/sounds/notification.mp3';
```

Por tu nombre de archivo deseado.
