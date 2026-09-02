import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { IconClose, IconHeart } from './icons'
import { connectHeartRateCharacteristic, parseHeartRateValue } from '../lib/heartRate'
import type { BluetoothDevice, BluetoothRemoteGATTCharacteristic } from '../lib/webBluetoothTypes'

interface HeartRateMonitorProps {
  /** Appelé à chaque nouvelle mesure, pour l'enregistrer dans la séance en cours. */
  onSample?: (bpm: number) => void
}

/**
 * Lecture en direct de la fréquence cardiaque via Web Bluetooth (service GATT
 * standard "heart_rate"). L'association du capteur se fait dans Réglages ; ici on
 * tente de se reconnecter silencieusement (permissions Bluetooth persistantes, sans
 * sélecteur) à l'appareil déjà associé. Si le navigateur exige un geste utilisateur
 * pour rouvrir la liaison BLE, une simple icône (sans texte) reste affichée pour
 * reconnecter en un tap — jamais de sélecteur d'appareils ni de message d'erreur ici,
 * uniquement quand un capteur est déjà associé dans Réglages.
 */
export function HeartRateMonitor({ onSample }: HeartRateMonitorProps) {
  const { t, heartRateEnabled } = useApp()
  const [paired, setPaired] = useState(false)
  const [connected, setConnected] = useState(false)
  const [bpm, setBpm] = useState<number | null>(null)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const onSampleRef = useRef(onSample)
  onSampleRef.current = onSample

  const onValueChanged = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    if (!characteristic.value) return
    const value = parseHeartRateValue(characteristic.value)
    setBpm(value)
    onSampleRef.current?.(value)
  }, [])

  const disconnect = useCallback(() => {
    characteristicRef.current?.removeEventListener('characteristicvaluechanged', onValueChanged)
    deviceRef.current?.gatt?.disconnect()
    deviceRef.current = null
    characteristicRef.current = null
    setConnected(false)
    setBpm(null)
  }, [onValueChanged])

  useEffect(() => () => disconnect(), [disconnect])

  const tryDevice = useCallback(
    async (device: BluetoothDevice) => {
      const characteristic = await connectHeartRateCharacteristic(device)
      deviceRef.current = device
      characteristicRef.current = characteristic
      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setBpm(null)
      })
      characteristic.addEventListener('characteristicvaluechanged', onValueChanged)
      await characteristic.startNotifications()
      setConnected(true)
    },
    [onValueChanged],
  )

  useEffect(() => {
    if (!heartRateEnabled || !navigator.bluetooth) {
      setPaired(false)
      disconnect()
      return
    }
    let cancelled = false
    void (async () => {
      const devices = await navigator.bluetooth!.getDevices()
      if (cancelled) return
      setPaired(devices.length > 0)
      for (const device of devices) {
        if (cancelled) return
        try {
          await tryDevice(device)
          return
        } catch {
          // Reconnexion silencieuse impossible (geste requis, hors de portée…) :
          // l'icône de reconnexion manuelle reste affichée pour l'utilisateur.
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [heartRateEnabled, disconnect, tryDevice])

  const connectManually = async () => {
    const devices = await navigator.bluetooth!.getDevices()
    for (const device of devices) {
      try {
        await tryDevice(device)
        return
      } catch {
        // essaie l'appareil suivant en silence
      }
    }
  }

  if (!paired) return null

  if (!connected) {
    return (
      <div className="heart-rate-corner">
        <button
          type="button"
          className="heart-rate-connect"
          onClick={() => void connectManually()}
          aria-label={t('train.heartRateConnect')}
        >
          <IconHeart size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="heart-rate-corner">
      <div className="heart-rate-badge">
        <IconHeart size={14} />
        <span>{bpm !== null ? `${bpm} bpm` : t('train.heartRateWaiting')}</span>
        <button
          type="button"
          className="icon-btn heart-rate-disconnect"
          onClick={disconnect}
          aria-label={t('train.heartRateDisconnectAria')}
        >
          <IconClose size={12} />
        </button>
      </div>
    </div>
  )
}
