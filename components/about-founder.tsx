'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Award, GraduationCap, HeartHandshake, ShieldCheck, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

const gallerySlides = [
  {
    id: 'portrait',
    src: '/images/dr-tina-zuoere-portrait.jpg',
    title: 'Dr. Tina Zuoere',
    subtitle: 'Founder & Visionary Leader',
    tag: 'Official Portrait',
    description: 'Dr. Tina Zuoere brings strategic vision and deep compassion to grassroots community empowerment across Nigeria.',
  },
  {
    id: 'award',
    src: '/images/dr-tina-zuoere-award.jpg',
    title: 'The Sacred Crown Awards',
    subtitle: 'Distinguished Legacy & Humanitarian Impact Excellence',
    tag: 'Honour Citation',
    description: 'Honoured for sustained humanitarian service, transformative leadership, and creating enduring pathways of dignity for others.',
  },
  {
    id: 'foundation',
    src: '/images/king-kendrick-logo.jpg',
    title: 'King Kendrick Idiseye Foundation',
    subtitle: '...Service to Humanity',
    tag: 'Sister Foundation',
    description: 'Founded by Dr. Tina Zuoere to drive targeted philanthropy, educational access, and grassroots welfare support.',
  },
]

export function AboutFounder() {
  const [activeSlide, setActiveSlide] = useState(0)

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % gallerySlides.length)
  }

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length)
  }

  const current = gallerySlides[activeSlide]

  return (
    <section className="founder-section" id="about">
      <div className="section-wrap founder-container">
        
        {/* Left Column: Visual Showcase & Gallery */}
        <div className="founder-visual-wrap">
          <div className="founder-card-frame">
            <div className="founder-slide-wrapper">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  className="founder-slide-content"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img
                    src={current.src}
                    alt={current.title}
                    className={`founder-slide-img ${current.id === 'foundation' ? 'is-logo-slide' : ''}`}
                  />
                  <div className="founder-slide-overlay">
                    <span className="founder-slide-tag">{current.tag}</span>
                    <h4 className="founder-slide-title">{current.title}</h4>
                    <p className="founder-slide-subtitle">{current.subtitle}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button
                type="button"
                className="founder-nav-btn prev"
                onClick={prevSlide}
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="founder-nav-btn next"
                onClick={nextSlide}
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Thumbnails Row */}
            <div className="founder-thumbnails" role="tablist" aria-label="Founder photo gallery">
              {gallerySlides.map((slide, idx) => (
                <button
                  type="button"
                  key={slide.id}
                  role="tab"
                  aria-selected={activeSlide === idx}
                  className={`founder-thumb-btn ${activeSlide === idx ? 'is-active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                >
                  <img
                    src={slide.src}
                    alt={slide.title}
                    className={`founder-thumb-img ${slide.id === 'foundation' ? 'is-thumb-logo' : ''}`}
                  />
                  <span className="founder-thumb-label">{slide.tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Founder Narrative & Accreditations */}
        <div className="founder-bio-wrap">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow dark-eyebrow">Leadership &amp; Vision</span>
            <h2 className="founder-name">Dr. Tina Zuoere</h2>
            
            {/* Academic & Professional Honors */}
            <div className="founder-credentials">
              <span className="credential-pill">
                <GraduationCap size={15} /> Ph.D.
              </span>
              <span className="credential-pill">
                <ShieldCheck size={15} /> CPM
              </span>
              <span className="credential-pill">
                <ShieldCheck size={15} /> CHRC
              </span>
              <span className="credential-pill award-pill">
                <Award size={15} /> Sacred Crown Impact Award
              </span>
            </div>

            {/* Leadership Titles */}
            <div className="founder-roles">
              <div className="founder-role-item">
                <HeartHandshake size={18} className="role-icon" />
                <div>
                  <strong>Founder</strong>
                  <p>Tina Like Minds Empowerment Initiative</p>
                </div>
              </div>
              <div className="founder-role-item">
                <Sparkles size={18} className="role-icon" />
                <div>
                  <strong>Founder</strong>
                  <p>King Kendrick Idiseye Foundation <span className="sub-tag">...Service to Humanity</span></p>
                </div>
              </div>
              <div className="founder-role-item">
                <ShieldCheck size={18} className="role-icon" />
                <div>
                  <strong>Founder &amp; CEO</strong>
                  <p>KKE Exclusive</p>
                </div>
              </div>
            </div>

            {/* Narrative Prose */}
            <div className="founder-prose">
              <p>
                Dr. Tina Zuoere is an esteemed scholar, administrator, and visionary philanthropist dedicated to grassroots socio-economic transformation. Holding a Ph.D. alongside prestigious executive certifications including Certified Project Manager (CPM) and Certified Human Resources Consultant (CHRC), her leadership combines strategic excellence with deep humanitarian compassion.
              </p>
              <p>
                Through the <strong>King Kendrick Idiseye Foundation</strong> and the <strong>Tina Like Minds Empowerment Initiative</strong>, Dr. Zuoere is building verified pathways for genuine community empowerment. Members who verify their identity in this registry are connected to legitimate empowerment interventions, skill development programs, and community initiatives designed to elevate families and foster lasting self-reliance.
              </p>
            </div>

            {/* Quote Citation */}
            <blockquote className="founder-quote">
              <p>
                “Service becomes legacy when compassion is sustained by action. When genuine minds unite, real empowerment follows.”
              </p>
              <cite>— Hon. Dr. Tina Zuoere</cite>
            </blockquote>

            <div className="founder-action">
              <a href="#register" className="gold-button">
                Register with Like Minds <span className="cta-arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  )
}
