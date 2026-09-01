/** Service et caractéristique Bluetooth GATT standard pour la fréquence cardiaque. */
export const HEART_RATE_SERVICE = 'heart_rate'
export const HEART_RATE_MEASUREMENT_CHARACTERISTIC = 'heart_rate_measurement'

/**
 * Identifiant fabricant Bluetooth SIG de Garmin (0x0087), présent dans les données
 * constructeur de l'annonce BLE même quand l'appareil n'annonce ni nom ni service
 * heart_rate — permet de filtrer le sélecteur sur les seuls appareils Garmin plutôt
 * que de lister tous les appareils BLE à proximité.
 */
export const GARMIN_COMPANY_ID = 0x0087

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
