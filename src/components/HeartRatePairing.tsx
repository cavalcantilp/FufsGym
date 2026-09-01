import { useEffect, useState } from 'react'
import { useApp } from '../state/AppContext'
import { HEART_RATE_SERVICE, WrongHeartRateDeviceError, connectHeartRateCharacteristic } from '../lib/heartRate'
import type { BluetoothDevice } from '../lib/webBluetoothTypes'

/**
 * Association du capteur de fréquence cardiaque (Réglages). La connexion réelle
 * pendant l'entraînement se reconnecte ensuite silencieusement à l'appareil associé
 * ici (permissions Bluetooth persistantes) — aucun texte de configuration ne doit
 * apparaître ailleurs que dans cet écran.
 */
export function HeartRatePairing() {
  const { t } = useApp()
  const [paired, setPaired] = useState<boolean | null>(null)
  const [pairing, setPairing] = useState(false)
  const [error, setError] = useState<'generic' | 'wrongDevice' | null>(null)

  const refreshPaired = async () => {
    const devices = await navigator.bluetooth!.getDevices()
    setPaired(devices.length > 0)
  }

  useEffect(() => {
    if (navigator.bluetooth) void refreshPaired()
  }, [])

  const pair = async () => {
    setPairing(true)
    setError(null)
    let device: BluetoothDevice | undefined
    try {
      device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: [HEART_RATE_SERVICE],
      })
      await connectHeartRateCharacteristic(device)
      device.gatt?.disconnect()
      setPaired(true)
    } catch (err) {
      if (err instanceof WrongHeartRateDeviceError) {
        await device?.forget?.()
        setError('wrongDevice')
      } else if ((err as DOMException).name !== 'NotFoundError') {
        setError('generic')
      }
    } finally {
      setPairing(false)
    }
  }

  const forget = async () => {
    const devices = await navigator.bluetooth!.getDevices()
    await Promise.all(devices.map((device) => device.forget?.()))
    setPaired(false)
    setError(null)
  }

  if (typeof navigator === 'undefined' || !navigator.bluetooth) return null

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      {paired ? (
        <>
          <p className="hint">{t('settings.heartRatePaired')}</p>
          <button type="button" className="btn secondary" onClick={() => void forget()}>
            {t('settings.heartRateForget')}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn secondary" onClick={() => void pair()} disabled={pairing}>
            {pairing ? t('train.heartRateConnecting') : t('settings.heartRatePair')}
          </button>
          {error === 'wrongDevice' ? (
            <p className="hint danger">{t('train.heartRateWrongDevice')}</p>
          ) : error === 'generic' ? (
            <p className="hint danger">{t('train.heartRateError')}</p>
          ) : null}
        </>
      )}
    </div>
  )
}
