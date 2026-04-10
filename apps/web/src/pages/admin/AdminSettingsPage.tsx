import { useState } from 'react';
import { Settings, Globe, Image, Bell, Shield, Server } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground">Paramètres Système</h1>
        <p className="text-sm text-muted-foreground">Configuration globale de la plateforme</p>
      </div>

      {/* Application Info */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">Application</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nom de l'application</Label>
            <Input value="Kobina PRO" readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Version</Label>
            <Input value="2.0.0" readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Fuseau horaire</Label>
            <Input value="Africa/Abidjan (UTC+0)" readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label>Langue par défaut</Label>
            <Input value="Français" readOnly className="bg-muted" />
          </div>
        </div>
      </motion.div>

      {/* Maintenance */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-warning" />
            <div>
              <h2 className="font-semibold text-foreground">Mode maintenance</h2>
              <p className="text-xs text-muted-foreground">Désactiver l'accès utilisateur temporairement</p>
            </div>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={v => { setMaintenanceMode(v); toast.info(v ? 'Mode maintenance activé' : 'Mode maintenance désactivé'); }} />
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-info" />
          <h2 className="font-semibold text-foreground">Sécurité</h2>
        </div>
        <div className="space-y-3">
          <SettingToggle label="Authentification email obligatoire" description="Les utilisateurs doivent confirmer leur email" defaultChecked />
          <SettingToggle label="Limitation de taux" description="Limiter les requêtes API par utilisateur" defaultChecked />
          <SettingToggle label="Détection d'intrusion" description="Détecter les tentatives de connexion suspectes" defaultChecked />
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl border border-border p-4 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">Notifications système</h2>
        </div>
        <div className="space-y-3">
          <SettingToggle label="Alertes de fraude" description="Recevoir des alertes en cas d'activité suspecte" defaultChecked />
          <SettingToggle label="Nouvelles inscriptions" description="Notification pour chaque nouveau utilisateur" />
          <SettingToggle label="Erreurs système" description="Alerter en cas d'erreur critique" defaultChecked />
        </div>
      </motion.div>

      {/* Infrastructure */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-muted rounded-xl p-4 space-y-3"
      >
        <h3 className="text-xs font-bold text-muted-foreground uppercase">Infrastructure</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <InfoCard label="Base de données" value="Supabase PostgreSQL" />
          <InfoCard label="Authentification" value="Supabase Auth" />
          <InfoCard label="Stockage" value="Supabase Storage" />
          <InfoCard label="Edge Functions" value="Supabase Functions" />
          <InfoCard label="Push Notifications" value="Firebase FCM" />
          <InfoCard label="Frontend" value="React + Vite" />
        </div>
      </motion.div>
    </div>
  );
}

function SettingToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg p-3 border border-border">
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}
