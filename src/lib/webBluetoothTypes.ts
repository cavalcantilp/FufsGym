/**
 * Types minimaux pour Web Bluetooth (pas de paquet npm, juste ce que l'app
 * utilise réellement pour lire un capteur de fréquence cardiaque BLE standard).
 */

export interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
}

export interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

export interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

export interface BluetoothDevice extends EventTarget {
  name?: string
  gatt?: BluetoothRemoteGATTServer
  /** Révoque la permission accordée à ce site pour cet appareil (permissions persistantes). */
  forget?(): Promise<void>
}

interface BluetoothRequestDeviceOptions {
  filters?: { services?: string[] }[]
  acceptAllDevices?: boolean
  optionalServices?: string[]
}

interface Bluetooth {
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>
  /**
   * Permissions persistantes : renvoie les appareils déjà autorisés pour ce site lors
   * d'une session précédente, sans ouvrir de sélecteur — permet de se reconnecter
   * silencieusement à l'appareil associé dans Réglages.
   */
  getDevices(): Promise<BluetoothDevice[]>
}

declare global {
  interface Navigator {
    bluetooth?: Bluetooth
  }
}
