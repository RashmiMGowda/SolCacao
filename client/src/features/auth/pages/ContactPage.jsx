import { Camera, Mail, MessageCircle } from 'lucide-react'
import { socialLinks } from '../data/socialLinks'

const contactCards = [
  {
    copy: 'See product stories, seasonal gift boxes, and chocolate presentation ideas.',
    icon: Camera,
    title: 'Follow SolCacao',
    ...socialLinks.instagram,
  },
  {
    copy: 'Share a prepared message with a WhatsApp recipient you choose.',
    icon: MessageCircle,
    title: 'Share on WhatsApp',
    ...socialLinks.whatsapp,
  },
  {
    copy: 'Send account, order, or collaboration questions to the project inbox.',
    icon: Mail,
    title: 'Email Support',
    ...socialLinks.email,
  },
]

export function ContactPage() {
  return (
    <main className="page-wrap contact-page">
      <section className="contact-hero panel-card">
        <p className="eyebrow">Connect</p>
        <h1>Contact SolCacao</h1>
        <p>
          Find us on Instagram, email a question, or share a message on WhatsApp.
        </p>
      </section>

      <section className="contact-card-grid" aria-label="SolCacao contact options">
        {contactCards.map(({ copy, icon: Icon, label, title, url }) => (
          <a className="contact-card" href={url} key={title} rel="noreferrer" target="_blank">
            <span className="contact-card-icon">
              <Icon size={24} aria-hidden="true" />
            </span>
            <h2>{title}</h2>
            <p>{copy}</p>
            <strong>{label}</strong>
          </a>
        ))}
      </section>
    </main>
  )
}
