import type { BluetoothDevice, BluetoothRemoteGATTCharacteristic } from './webBluetoothTypes'

/** Service et caractéristique Bluetooth GATT standard pour la fréquence cardiaque. */
export const HEART_RATE_SERVICE = 'heart_rate'
export const HEART_RATE_MEASUREMENT_CHARACTERISTIC = 'heart_rate_measurement'

/** Levée quand l'appareil choisi se connecte mais n'a pas de capteur cardio. */
export class WrongHeartRateDeviceError extends Error {}

/**
 * Décode la caractéristique "Heart Rate Measurement" (spec Bluetooth SIG 0x2A37) :
 * le premier octet indique si la valeur tient sur 8 ou 16 bits, le reste est la
 * fréquence en battements/minute.
 */
export function parseHeartRateValue(value: DataView): number {
  const flags = value.getUint8(0)
  const is16Bit = (flags & 0x1) !== 0
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1)
}

/**
 * Connexion GATT + résolution de la caractéristique heart_rate_measurement, partagée
 * entre l'association (Réglages) et la reconnexion silencieuse (S'entraîner).
 */
export async function connectHeartRateCharacteristic(
  device: BluetoothDevice,
): Promise<BluetoothRemoteGATTCharacteristic> {
  const server = await device.gatt!.connect()
  let service
  try {
    service = await server.getPrimaryService(HEART_RATE_SERVICE)
  } catch {
    server.disconnect()
    throw new WrongHeartRateDeviceError('No heart_rate service on this device')
  }
  return service.getCharacteristic(HEART_RATE_MEASUREMENT_CHARACTERISTIC)
}
