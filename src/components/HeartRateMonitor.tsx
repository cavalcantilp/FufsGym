import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { IconClose, IconHeart } from './icons'
import { HEART_RATE_MEASUREMENT_CHARACTERISTIC, HEART_RATE_SERVICE, parseHeartRateValue } from '../lib/heartRate'
import type { BluetoothDevice, BluetoothRemoteGATTCharacteristic } from '../lib/webBluetoothTypes'

/**
 * Lecture en direct de la fréquence cardiaque via Web Bluetooth (service GATT
 * standard "heart_rate") — fonctionne avec une montre Garmin qui diffuse sa FC
 * (Réglages > Capteurs > Fréquence cardiaque au poignet > Diffuser la FC).
 * Uniquement Chrome/Edge sur Android : invisible ailleurs (Web Bluetooth absent).
 */
export function HeartRateMonitor() {
  const { t } = useApp()
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [bpm, setBpm] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const deviceRef = useRef<BluetoothDevice | null>(null)
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  const onValueChanged = useCallback((event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    if (characteristic.value) setBpm(parseHeartRateValue(characteristic.value))
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

  const connect = async () => {
    if (!navigator.bluetooth) return
    setConnecting(true)
    setError(false)
    try {
      const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] })
      deviceRef.current = device
      device.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setBpm(null)
      })
      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_CHARACTERISTIC)
      characteristicRef.current = characteristic
      characteristic.addEventListener('characteristicvaluechanged', onValueChanged)
      await characteristic.startNotifications()
      setConnected(true)
    } catch (err) {
      if ((err as DOMException).name !== 'NotFoundError') setError(true)
    } finally {
      setConnecting(false)
    }
  }

  if (typeof navigator === 'undefined' || !navigator.bluetooth) return null

  if (!connected) {
    return (
      <div className="stack" style={{ gap: 4 }}>
        <button type="button" className="heart-rate-connect" onClick={() => void connect()} disabled={connecting}>
          <IconHeart size={14} />
          <span>{connecting ? t('train.heartRateConnecting') : t('train.heartRateConnect')}</span>
        </button>
        {error ? <p className="hint danger">{t('train.heartRateError')}</p> : null}
      </div>
    )
  }

  return (
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
  )
}
