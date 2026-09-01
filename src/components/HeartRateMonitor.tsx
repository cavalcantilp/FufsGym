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
 * se reconnecte silencieusement (permissions Bluetooth persistantes, sans sélecteur)
 * à l'appareil déjà associé — la pastille n'apparaît que si la reconnexion réussit,
 * jamais de bouton ni de message d'erreur pendant l'entraînement.
 */
export function HeartRateMonitor({ onSample }: HeartRateMonitorProps) {
  const { t, heartRateEnabled } = useApp()
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

  useEffect(() => {
    if (!heartRateEnabled || !navigator.bluetooth) {
      disconnect()
      return
    }
    let cancelled = false
    const reconnect = async () => {
      const devices = await navigator.bluetooth!.getDevices()
      for (const device of devices) {
        if (cancelled) return
        try {
          const characteristic = await connectHeartRateCharacteristic(device)
          if (cancelled) {
            device.gatt?.disconnect()
            return
          }
          deviceRef.current = device
          characteristicRef.current = characteristic
          device.addEventListener('gattserverdisconnected', () => {
            setConnected(false)
            setBpm(null)
          })
          characteristic.addEventListener('characteristicvaluechanged', onValueChanged)
          await characteristic.startNotifications()
          setConnected(true)
          return
        } catch {
          // Appareil hors de portée ou non pertinent : on essaie le suivant en silence.
        }
      }
    }
    void reconnect()
    return () => {
      cancelled = true
    }
  }, [heartRateEnabled, onValueChanged, disconnect])

  if (!connected) return null

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
