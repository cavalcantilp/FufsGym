import { useApp } from '../state/AppContext'
import { Logo, IconCalendar, IconClipboard, IconDumbbell, IconTrendingUp } from '../components/icons'
import { LANGS } from '../i18n/translations'
import type { Lang } from '../lib/types'

export function Onboarding() {
  const { t, lang, setLang, completeOnboarding } = useApp()

  return (
    <div className="onboarding">
      <div className="brand">
        <Logo />
        <h1>{t('onboarding.welcome')}</h1>
        <p>{t('onboarding.intro')}</p>
      </div>

      <div className="field">
        <label htmlFor="ob-lang">{t('settings.language')}</label>
        <select id="ob-lang" value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
          {LANGS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="features">
        <div className="feature">
          <IconClipboard size={20} />
          <span>{t('onboarding.feature.plan')}</span>
        </div>
        <div className="feature">
          <IconDumbbell size={20} />
          <span>{t('onboarding.feature.train')}</span>
        </div>
        <div className="feature">
          <IconCalendar size={20} />
          <span>{t('onboarding.feature.calendar')}</span>
        </div>
        <div className="feature">
          <IconTrendingUp size={20} />
          <span>{t('onboarding.feature.progress')}</span>
        </div>
      </div>

      <button type="button" className="btn" onClick={completeOnboarding}>
        {t('onboarding.start')}
      </button>
    </div>
  )
}
