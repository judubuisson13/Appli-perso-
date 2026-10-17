import cyberRaw from '../../../../content/it/cyber.json';
import { itModule } from '../../../content/schemas';

export const TRACK = 'it';
export const cyber = itModule.parse(cyberRaw);
export const itCardById = new Map(cyber.cards.map((c) => [c.id, c]));

/** Étapes du module, dans l'ordre conseillé ; chacune est une « leçon » dans lessonProgress. */
export const CYBER_STEPS = [
  { id: 'cyber-sheet', title: 'Lire la fiche', minutes: 5, path: '/learn/it/cyber/sheet' },
  { id: 'cyber-phishing', title: 'Repère le phishing', minutes: 5, path: '/learn/it/cyber/phishing' },
  { id: 'cyber-quiz', title: 'Quiz', minutes: 5, path: '/learn/it/cyber/quiz' },
] as const;

/** Modules DSI prévus (seule la cyber est prête). */
export const IT_MODULES = [
  { id: 'cyber', title: 'Cybersécurité', ready: true, pitch: 'Menaces, phishing, IAM, MFA, Zero Trust, incident, ISO 27001, NIS2, SOC.' },
  { id: 'network', title: 'Réseau', ready: false, pitch: 'OSI, IP, sous-réseaux, DNS, HTTP, VPN, avec calculateur de sous-réseau.' },
  { id: 'cloud', title: 'Cloud', ready: false, pitch: 'IaaS, PaaS, SaaS, grands services, coûts, sécurité.' },
  { id: 'systems', title: 'Systèmes et serveurs', ready: false, pitch: 'OS, virtualisation, conteneurs.' },
  { id: 'si', title: 'SI et architecture', ready: false, pitch: 'Applications, intégration, urbanisation.' },
  { id: 'data', title: 'Data', ready: false, pitch: 'Bases de données, data warehouse, gouvernance, RGPD.' },
  { id: 'ai', title: 'IA', ready: false, pitch: 'ML, LLM, cas d’usage, limites, risques.' },
];
