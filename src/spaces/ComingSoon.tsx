import { PageTitle } from '../ui/kit';

const PLANS: Record<string, { title: string; when: string; items: string[] }> = {
  sport: {
    title: 'Sport',
    when: 'tranche 4',
    items: [
      'Minuteur de séance : séries, repos, circuits, tabata, avec sons et vibration',
      'Journal des séances : reps, durée, ressenti',
      'Programme poids du corps débutant avec progressions (tractions, pompes, dips, squats, gainage)',
      'Planning hebdo visible dans « Aujourd’hui »',
    ],
  },
  kitchen: {
    title: 'Cuisine & Nutrition',
    when: 'tranche 4',
    items: [
      'Recettes avec portions ajustables (foyer : 2 adultes + 1 enfant)',
      'Inventaire placard / frigo avec alerte « à utiliser vite »',
      'Liste de courses générée depuis les recettes, moins ce que tu as déjà',
      'Plats faisables avec ton stock, ou avec 1 ou 2 ingrédients en plus',
    ],
  },
  brain: {
    title: 'Cerveau',
    when: 'tranche 3',
    items: ['Jeu de mémoire (séquences)', 'Calcul mental', 'Difficulté adaptative et courbe de scores'],
  },
};

export function ComingSoon({ space }: { space: keyof typeof PLANS }) {
  const p = PLANS[space];
  return (
    <div className="stack" data-space={space}>
      <PageTitle title={p.title} sub={`Cet espace arrive en ${p.when}. Au programme :`} />
      <ul className="card stack" style={{ margin: 0, paddingLeft: 32 }}>
        {p.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="muted small">
        En attendant, tu peux déjà cocher une séance faite hors de l’appli depuis « Aujourd’hui » : elle compte dans ta série.
      </p>
    </div>
  );
}
