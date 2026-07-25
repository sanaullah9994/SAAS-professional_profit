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
import { Hero } from './hero';
import { ProblemSection } from './problem-section';
import { FeatureGrid } from './feature-grid';
import { MultiAccountSection } from './multi-account-section';
import { ProfitCalcSection } from './profit-calc-section';
import { AdAnalyticsSection } from './ad-analytics-section';
import { AiComingSoon } from './ai-coming-soon';
import { TestimonialSection } from './testimonial-section';

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
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
      <Hero />
      <LogoCloud />
      <ProblemSection />
      <FeatureGrid />
      <MultiAccountSection />
      <ProfitCalcSection />
      <AdAnalyticsSection />
      <SecuritySection />
      <AiComingSoon />
      <TestimonialSection />
      <CTASection
        heading={
          <>
            The operating system for <span className="text-[#5fd08a] underline decoration-[#5fd08a]/40 underline-offset-[6px]">Amazon agencies</span>.
          </>
        }
        description="Manage every client, know true profit, and prove your value — all from one workspace."
        primaryHref="/login?mode=up"
        primaryLabel="Start Free"
        secondaryHref="#cta"
        secondaryLabel="Book a Demo"
        note="14-day free trial · No credit card required"
      />
      <Footer />
    </div>
  );
}
