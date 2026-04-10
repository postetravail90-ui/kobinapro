import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Check, ArrowRight, Store, Shield, Zap, Users, Gift, BarChart3, CreditCard, Smartphone, Star, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import kobinaLogo from '@/assets/kobina-pro-logo.png';
import heroBg from '@/assets/landing-hero-bg.jpg';
import pricingVisual from '@/assets/landing-pricing-visual.jpg';
import { useRef } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

const features = [
  { icon: Store, title: 'Multi-commerces', desc: 'Gérez plusieurs points de vente depuis une seule interface' },
  { icon: Users, title: 'Gestion gérants', desc: 'Assignez et contrôlez vos gérants en temps réel' },
  { icon: BarChart3, title: 'Analytics', desc: 'Suivez vos ventes, sessions et crédits en détail' },
  { icon: CreditCard, title: 'Facturation & Crédit', desc: 'Générez factures et gérez les crédits clients' },
  { icon: Shield, title: 'Anti-fraude', desc: 'Détection automatique des activités suspectes' },
  { icon: Gift, title: 'Parrainage', desc: 'Gagnez des bonus en invitant d\'autres commerces' },
  { icon: Smartphone, title: 'Mobile-first & PWA', desc: 'Application installable, fonctionne même hors connexion' },
  { icon: Zap, title: 'Sessions clients', desc: 'Gérez les commandes par table avec total dynamique' },
];

const plans = [
  { name: 'Gratuit', price: '0 F', period: '/mois', subtitle: 'Pour démarrer simplement', features: ['1 commerce', '1 gérant', '20 produits maximum'], popular: false },
  { name: 'Formule 1', price: '2 000 F', period: '/mois', subtitle: 'Idéal pour un commerce en croissance', features: ['1 commerce', '2 gérants', '50 produits', 'Toutes les fonctionnalités'], popular: true },
  { name: 'Formule 2', price: '5 000 F', period: '/mois', subtitle: 'Pour gérer plusieurs commerces', features: ['3 commerces', '8 gérants', 'Produits illimités', 'Toutes les fonctionnalités'], popular: false },
  { name: 'Formule 3', price: '10 000 F', period: '/mois', subtitle: 'Réseaux en expansion', features: ['6 commerces', '16 gérants', 'Produits illimités', 'Toutes les fonctionnalités'], popular: false },
  { name: 'Formule 4', price: '18 000 F', period: '/mois', subtitle: 'Grandes structures', features: ['10 commerces', '24 gérants', 'Produits illimités', 'Toutes les fonctionnalités'], popular: false },
];

const testimonials = [
  { name: 'Aminata K.', role: 'Propriétaire restaurant', text: 'Kobina a transformé la gestion de mon restaurant. Je contrôle tout depuis mon téléphone.', rating: 5 },
  { name: 'Ibrahim D.', role: 'Multi-boutiques', text: 'Avec 3 boutiques, impossible de gérer sans Kobina. Les alertes fraude m\'ont sauvé.', rating: 5 },
  { name: 'Fatou B.', role: 'Superette', text: 'Simple, rapide, et ça marche même avec le réseau faible. Parfait pour nous.', rating: 4 },
];

function InstallButton({ variant = 'hero' }: { variant?: 'hero' | 'cta' }) {
  const { canInstall, isStandalone, isIOS, installed, install } = usePWAInstall();

  if (isStandalone || installed) return null;

  const handleClick = async () => {
    if (canInstall) {
      const result = await install();
      if (result === 'accepted') {
        toast.success('Application installée avec succès ! 🎉');
      } else if (result === 'dismissed') {
        toast.info('Vous pourrez installer plus tard depuis le menu');
      }
    } else if (isIOS) {
      toast(
        <div className="flex items-start gap-2">
          <Share size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Installation sur iOS</p>
            <p className="text-xs text-muted-foreground mt-1">
              Appuyez sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong>
            </p>
          </div>
        </div>,
        { duration: 6000 }
      );
    } else {
      toast.info('Installation non disponible sur ce navigateur pour le moment');
    }
  };

  const baseClasses = variant === 'hero'
    ? 'h-14 px-8 text-base bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm'
    : 'h-14 px-8 text-base font-semibold gap-2';

  return (
    <Button size="lg" onClick={handleClick} variant="outline" className={baseClasses}>
      <Download size={18} className={variant === 'hero' ? 'mr-2' : ''} />
      {isIOS ? "Installer l'app (iOS)" : "Installer l'app"}
    </Button>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={kobinaLogo} alt="Kobina Pro" className="h-9 rounded-xl object-contain" />
            <span className="font-bold text-lg text-foreground">Kobina Pro</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth/login"><Button variant="ghost" size="sm">Connexion</Button></Link>
            <Link to="/auth/register"><Button size="sm">S'inscrire <ArrowRight size={14} className="ml-1" /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[85vh] flex items-center justify-center">
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover object-center" loading="eager" />
        </motion.div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative z-10 max-w-3xl mx-auto text-center px-4 py-20 lg:py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold rounded-full px-4 py-1.5 mb-6 border border-white/20">
              <Zap size={12} /> Plateforme #1 de gestion commerce en Afrique
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 drop-shadow-lg">
              Boostez votre commerce <br className="hidden sm:block" />
              <span className="text-green-300">avec KOBINA PRO !</span>
            </h1>
            <p className="text-lg text-white/85 mb-8 max-w-xl mx-auto drop-shadow">
              14 jours gratuits pour essayer, des formules adaptées à vos besoins.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="h-14 px-8 text-base font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30">
                  Commencez dès maintenant ! <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
                  Découvrir
                </Button>
              </a>
              <InstallButton variant="hero" />
            </div>
            <p className="text-xs text-white/60 mt-4">Aucune carte requise · Annulation à tout moment</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Gestion complète, simple et sécurisée</h2>
            <p className="text-muted-foreground mt-2">Des outils puissants conçus pour les commerces africains</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="p-5 rounded-xl border border-border bg-background hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon size={22} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex justify-center mb-8">
            <img src={pricingVisual} alt="Formules KOBINA PRO" className="w-[200px] sm:w-[320px] lg:w-[420px] rounded-2xl shadow-2xl shadow-primary/10 object-contain" loading="lazy" />
          </motion.div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Choisissez la formule adaptée à votre commerce</h2>
            <p className="text-muted-foreground mt-2">Développez votre activité avec KOBINA PRO. Profitez de 14 jours gratuits sur la Formule 1.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} whileHover={{ y: -4 }}
                className={`rounded-xl p-5 border-2 transition-all ${plan.popular ? 'border-primary bg-card shadow-lg relative' : 'border-border bg-card'}`}
              >
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">RECOMMANDÉ</span>}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-[11px] text-muted-foreground">{plan.subtitle}</p>
                <p className="text-2xl font-bold text-primary mt-2">{plan.price}<span className="text-xs text-muted-foreground font-normal"> {plan.period}</span></p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground"><Check size={14} className="text-primary shrink-0" />{f}</li>
                  ))}
                </ul>
                <Link to="/auth/register"><Button className="w-full mt-5" variant={plan.popular ? 'default' : 'outline'}>{plan.popular ? "S'abonner" : plan.price === '0 F' ? "Utiliser l'offre gratuite" : "S'abonner"}</Button></Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Ils nous font confiance</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <motion.div key={t.name} whileHover={{ y: -2 }} className="p-6 rounded-xl border border-border bg-background">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-secondary fill-secondary" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Gift size={40} className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">Programme de parrainage</h2>
          <p className="text-muted-foreground mb-6">Invitez d'autres commerçants et gagnez des bonus sur chaque inscription. Partagez votre lien unique et suivez vos gains en temps réel.</p>
          <Link to="/auth/register"><Button size="lg" className="h-12 px-8">Commencer à parrainer</Button></Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Compatible, rapide et accessible partout</h2>
          <p className="text-muted-foreground mb-8">Rejoignez des milliers de commerçants africains qui utilisent Kobina Pro</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth/register"><Button size="lg" className="h-14 px-10 text-base font-semibold">Commencer gratuitement <ArrowRight size={18} className="ml-2" /></Button></Link>
            <InstallButton variant="cta" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={kobinaLogo} alt="Kobina Pro" className="h-8 rounded-lg object-contain" />
              <span className="font-bold text-foreground">Kobina Pro</span>
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground">Fonctionnalités</a>
              <a href="#pricing" className="hover:text-foreground">Tarifs</a>
              <a href="#testimonials" className="hover:text-foreground">Témoignages</a>
            </div>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Kobina Pro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
