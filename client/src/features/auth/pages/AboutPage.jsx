import { useUiText } from '../../localization/hooks/useUiText'
import { Link } from 'react-router-dom'

const values = [
  {
    icon: 'bean',
    title: 'Traceable origins',
    copy: 'Every bar names its farm.',
  },
  {
    icon: 'truffle',
    title: 'Small batches',
    copy: 'Made fresh, never rushed.',
  },
  {
    icon: 'bar',
    title: 'Fair partnerships',
    copy: 'Above-market farm prices.',
  },
  {
    icon: 'bonbon',
    title: 'Made to share',
    copy: 'Gift-ready on arrival.',
  },
]

const steps = [
  { label: 'Source', copy: 'Beans from partner farms' },
  { label: 'Roast', copy: 'Small roasts, bold flavor' },
  { label: 'Temper', copy: 'Clean snap and shine' },
  { label: 'Pack', copy: 'Hand-packed, shipped fresh' },
]

function ChocolateBar({ className = '' }) {
  return (
    <div className={`chocolate-bar ${className}`} aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function ChocolateBox() {
  return (
    <div className="story-chocolate-box" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

function CandyIcon({ type }) {
  return <span className={`candy-icon ${type}`} aria-hidden="true" />
}

export function AboutPage() {
  const ui = useUiText()
  return (
    <main className="about-story-page">
      <section className="about-story-hero">
        <ChocolateBar className="hero-bar hero-bar-left" />
        <ChocolateBar className="hero-bar hero-bar-right" />
        <span className="hero-bean bean-one" aria-hidden="true" />
        <span className="hero-bean bean-two" aria-hidden="true" />
        <span className="hero-bean bean-three" aria-hidden="true" />
        <span className="hero-truffle truffle-one" aria-hidden="true" />
        <span className="hero-truffle truffle-two" aria-hidden="true" />
        <span className="hero-truffle truffle-three" aria-hidden="true" />

        <div className="about-story-copy">
          <h1>{ui("Small batches. Big flavor.")}</h1>
          <p>
            {ui("SolCacao makes single-origin chocolate with honest ingredients, thoughtful gift boxes, and smooth ordering for customers and brands.")}
          </p>
          <div className="about-story-actions">
            <Link className="btn btn-gold" to="/shop">
              {ui("Shop now")}
            </Link>
            <a className="btn btn-outline-light" href="#our-story">
              {ui("Our story")}
            </a>
          </div>
        </div>
      </section>

      <section className="about-story-card" id="our-story" tabIndex={-1} style={{ scrollMarginTop: 88 }}>
        <ChocolateBox />
        <div className="about-story-text">
          <h2>{ui("Our story")}</h2>
          <p>
            {ui("We started with one question: why does most chocolate taste the same? So we began buying cacao straight from small farms and making it in small batches, tested by our own team. Today we make bars, gift boxes, and custom samplers.")}
          </p>
          <div className="about-story-note">
            <strong>{ui("Traceable origins. Fair prices for farmers.")}</strong>
            <span>{ui("Nothing we would not eat ourselves.")}</span>
          </div>
        </div>
      </section>

      <section className="about-values-section" aria-labelledby="about-values-title">
        <h2 id="about-values-title">{ui("What we stand for")}</h2>
        <div className="about-value-grid">
          {values.map((value) => (
            <article className="about-value-card" key={ui(value.title)}>
              <CandyIcon type={value.icon} />
              <div>
                <h3>{ui(value.title)}</h3>
                <p>{ui(value.copy)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="about-process-section" aria-labelledby="about-process-title">
        <h2 id="about-process-title">{ui("From bean to bar")}</h2>
        <div className="about-process-track">
          {steps.map((step, index) => (
            <article className="about-process-step" key={ui(step.label)}>
              <span>{index + 1}</span>
              <h3>{ui(step.label)}</h3>
              <p>{ui(step.copy)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta-panel">
        <div>
          <h2>{ui("Taste it for yourself.")}</h2>
          <p>{ui("Browse the shop or build a custom sampler for gifts and teams.")}</p>
        </div>
        <Link className="btn btn-gold" to="/sampler">
          {ui("Build a sampler")}
        </Link>
        <ChocolateBar className="cta-bar" />
        <span className="hero-truffle cta-truffle-one" aria-hidden="true" />
        <span className="hero-truffle cta-truffle-two" aria-hidden="true" />
      </section>
    </main>
  )
}
