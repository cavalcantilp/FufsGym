import { useApp } from '../state/AppContext'
import { Logo, IconCalendar, IconClipboard, IconDumbbell, IconTrendingUp } from '../components/icons'

export function Onboarding() {
  const { completeOnboarding } = useApp()

  return (
    <div className="onboarding">
      <div className="brand">
        <Logo />
        <h1>Bienvenue sur FufsGym</h1>
        <p>Planifiez vos programmes, loggez vos séances et suivez votre progression en musculation — 100 % hors ligne.</p>
      </div>

      <div className="features">
        <div className="feature">
          <IconClipboard size={20} />
          <span>Créez vos programmes : jours, exercices, séries et répétitions cibles.</span>
        </div>
        <div className="feature">
          <IconDumbbell size={20} />
          <span>Loggez chaque séance : charge, répétitions, séries validées.</span>
        </div>
        <div className="feature">
          <IconCalendar size={20} />
          <span>Retrouvez l'historique de vos séances sur le calendrier.</span>
        </div>
        <div className="feature">
          <IconTrendingUp size={20} />
          <span>Suivez votre 1RM estimé, votre volume et vos records personnels.</span>
        </div>
      </div>

      <button type="button" className="btn" onClick={completeOnboarding}>
        Commencer
      </button>
    </div>
  )
}
