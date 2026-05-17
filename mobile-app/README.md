# AppRegistro SEMAPA (Expo)

Aplicación móvil de campo para registro de lecturas de medidores — React Native + Expo Go.

## Requisitos

- Node.js 18+
- Expo Go en el teléfono ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Backend SEMAPA en `http://<TU_IP>:8080`

## Configuración

```bash
cd mobile-app
cp .env.example .env
# Editar EXPO_PUBLIC_API_URL con la IP de tu PC (no localhost en dispositivo físico)
npm install
npm start
```

Escanear el QR con Expo Go.

## Credenciales demo

| Usuario  | Contraseña | Rol           |
|----------|------------|---------------|
| lector1  | lector123  | lector        |
| admin    | admin123   | administrador |

## Solo Expo Go

Esta app **no** usa EAS Build ni APK. Ejecución únicamente con la app **Expo Go** y `npm start`.

La API es **Go** (`backend-go`, puerto **8090**). Ver `ReadmeLUCAS.md` en la raíz del repo.

## Estructura

```
app/           # Expo Router (pantallas)
src/api/       # Axios + endpoints
src/store/     # Zustand (auth, app)
src/offline/   # Cola AsyncStorage
src/modules/   # LoRaWAN simulator
src/components/
```
