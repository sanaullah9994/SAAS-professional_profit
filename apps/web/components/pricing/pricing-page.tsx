'use client';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Header } from '@/components/marketing/header';
import { Footer } from '@/components/marketing/footer';
import { CTASection } from '@/components/marketing/cta-section';
import { SecuritySection } from '@/components/marketing/security-section';
import { LogoCloud } from '@/components/marketing/logo-cloud';
import { PricingPlans } from './pricing-plans';
import { TrustStats } from './trust-stats';
import { FaqSection } from './faq-section';

gsap.registerPlugin(ScrollTrigger);

export function PricingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    const sections = containerRef.current?.querySelectorAll<HTMLElement>('[data-animate]');
    if (sections) {
      sections.forEach((section, i) => {
        gsap.fromTo(
          section,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: i * 0.02,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 86%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <PricingPlans />
      <LogoCloud />
      <SecuritySection />
      <TrustStats />
      <FaqSection />
      <CTASection
        heading={
          <>
            Start free. Upgrade when your <span className="text-[#5fd08a] underline decoration-[#5fd08a]/40 underline-offset-[6px]">agency grows</span>.
          </>
        }
        description="14-day free trial on every plan. No credit card, no lock-in — cancel anytime."
        primaryHref="#tiers"
        primaryLabel="Start Free"
        secondaryHref="#cta"
        secondaryLabel="Book a Demo"
        note="14-day free trial · No credit card required"
      />
      <Footer />
    </div>
  );
}
