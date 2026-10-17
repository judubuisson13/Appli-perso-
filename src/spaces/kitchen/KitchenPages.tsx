import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Baby, Check, ChefHat, Clock, Lightbulb, Minus, Plus, ShoppingCart, Trash2, Warehouse } from 'lucide-react';
import { db, type PantryRow } from '../../core/db';
import { dayKey } from '../../core/dates';
import { logActivity } from '../../core/activity';
import { XP } from '../../core/gamification';
import { slugify } from '../../core/text';
import { Feedback, PageTitle } from '../../ui/kit';
import type { Recipe } from '../../content/schemas';
import { catalog, catalogById, tips } from './content';
import { aggregate, byAisle, daysUntil, parseLine, portionsFor, roundQty, scaleRecipe, subtractStock, suggest, USE_SOON_DAYS, type Household } from './logic';
import { addToPantry, addToSelection, allRecipes, consume, getChecked, getHousehold, getSelection, setChecked, setHousehold, setSelection } from './store';

const fmtQty = (qty: number, unit: string) => {
  const q = roundQty(qty, unit);
  const n = Number.isInteger(q) ? String(q) : q.toFixed(1).replace('.', ',');
  return unit === 'pièce' ? n : `${n} ${unit}`;
};

function Stepper({ value, onChange, min = 0, step = 1, label }: { value: number; onChange: (v: number) => void; min?: number; step?: number; label: string }) {
  return (
    <span className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
      <button className="icon-btn" aria-label={`${label} : moins`} onClick={() => onChange(Math.max(min, value - step))}>
        <Minus size={16} />
      </button>
      <b style={{ minWidth: 32, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{String(value).replace('.', ',')}</b>
      <button className="icon-btn" aria-label={`${label} : plus`} onClick={() => onChange(value + step)}>
        <Plus size={16} />
      </button>
    </span>
  );
}

/* ---------- Accueil ---------- */

export function KitchenHome() {
  const data = useLiveQuery(async () => {
    const [recipes, pantry, household, selection] = await Promise.all([allRecipes(), db.pantry.toArray(), getHousehold(), getSelection()]);
    return { recipes, pantry, household, selection };
  }, []);
  if (!data) return null;
  const today = dayKey();
  const suggestions = suggest(data.recipes, data.pantry, catalogById, today);
  const soon = data.pantry.filter((p) => p.expires && daysUntil(p.expires, today) <= USE_SOON_DAYS);
  const h = data.household;
  const setH = (patch: Partial<Household>) => void setHousehold({ ...h, ...patch });

  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title="Cuisine" sub="Des recettes vers les courses, et du placard vers les recettes." />
      {soon.length > 0 && (
        <div className="notice">
          <b>À utiliser vite :</b> {soon.map((p) => `${p.name} (${daysUntil(p.expires!, today) < 0 ? 'périmé' : daysUntil(p.expires!, today) === 0 ? 'aujourd’hui' : `${daysUntil(p.expires!, today)} j`})`).join(', ')}
        </div>
      )}

      <h2 className="section-title">Ce que je peux cuisiner</h2>
      {data.pantry.length === 0 ? (
        <Link to="/kitchen/pantry" className="card lesson-row">
          <Warehouse size={22} />
          <span>
            <b>Remplis ton placard</b>
            <br />
            <span className="muted small">Ajoute ce que tu as : l’appli te propose les plats faisables.</span>
          </span>
        </Link>
      ) : suggestions.length === 0 ? (
        <p className="muted small">Aucune recette faisable à 2 ingrédients près. Ajoute des produits au placard ou une recette à toi.</p>
      ) : (
        suggestions.slice(0, 5).map((s) => (
          <Link key={s.recipe.id} to={`/kitchen/recipe/${s.recipe.id}`} className="card lesson-row">
            <span className={`lesson-num ${s.missing.length === 0 ? 'done' : ''}`}>{s.missing.length === 0 ? <Check size={16} /> : `+${s.missing.length}`}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{s.recipe.title}</b>
              <br />
              <span className="muted small">
                {s.missing.length === 0 ? 'Faisable maintenant' : `Il manque : ${s.missing.join(', ')}`}
                {s.usesSoon.length ? ` · utilise ${s.usesSoon.join(', ')}` : ''}
              </span>
            </span>
          </Link>
        ))
      )}

      <div className="grid-2">
        <Link to="/kitchen/recipes" className="card lesson-row">
          <ChefHat size={22} />
          <span>
            <b>Recettes</b>
            <br />
            <span className="muted small">{data.recipes.length} recettes · portions ajustables</span>
          </span>
        </Link>
        <Link to="/kitchen/shopping" className="card lesson-row">
          <ShoppingCart size={22} />
          <span>
            <b>Liste de courses</b>
            <br />
            <span className="muted small">{data.selection.length ? `${data.selection.length} recette(s) choisie(s)` : 'Choisis des recettes pour la remplir'}</span>
          </span>
        </Link>
        <Link to="/kitchen/pantry" className="card lesson-row">
          <Warehouse size={22} />
          <span>
            <b>Placard et frigo</b>
            <br />
            <span className="muted small">{data.pantry.length} produit(s)</span>
          </span>
        </Link>
        <Link to="/kitchen/tips" className="card lesson-row">
          <Lightbulb size={22} />
          <span>
            <b>Conseils courses</b>
            <br />
            <span className="muted small">Basiques, saison, anti-gaspi</span>
          </span>
        </Link>
      </div>

      <h2 className="section-title">Mon foyer</h2>
      <div className="card stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Adultes</span>
          <Stepper value={h.adults} min={1} onChange={(v) => setH({ adults: v })} label="Adultes" />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="row" style={{ gap: 6 }}>
            <Baby size={18} /> Jeunes enfants
          </span>
          <Stepper value={h.children} onChange={(v) => setH({ children: v })} label="Enfants" />
        </div>
        {h.children > 0 && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small">Portion enfant (part d’une portion adulte)</span>
            <Stepper value={h.childFactor} min={0.25} step={0.25} onChange={(v) => setH({ childFactor: Math.min(1, v) })} label="Portion enfant" />
          </div>
        )}
        <span className="small muted">Soit {String(portionsFor(h)).replace('.', ',')} portions par repas. Les recettes s’ajustent automatiquement.</span>
      </div>
      <p className="small muted">Calculateur nutritionnel (table Ciqual) et agenda des repas de la semaine arrivent dans une phase suivante.</p>
    </div>
  );
}

/* ---------- Recettes ---------- */

export function RecipeList() {
  const recipes = useLiveQuery(allRecipes, []);
  const [kid, setKid] = useState(false);
  const [q, setQ] = useState('');
  if (!recipes) return null;
  const list = recipes.filter((r) => (!kid || r.kidFriendly) && (!q || r.title.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title="Recettes" back="/kitchen" />
      <div className="row">
        <input id="recipe-search" placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 0 }} aria-label="Rechercher une recette" />
        <button className="btn" aria-pressed={kid} onClick={() => setKid(!kid)}>
          <Baby size={18} /> Adaptées enfant
        </button>
      </div>
      <Link to="/kitchen/recipe/new/edit" className="btn">
        <Plus size={18} /> Ajouter ma recette
      </Link>
      {list.map((r) => (
        <Link key={r.id} to={`/kitchen/recipe/${r.id}`} className="card lesson-row">
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{r.title}</b>
            <br />
            <span className="muted small">
              {r.minutes} min · {r.tags.join(', ')}
              {r.mine ? ' · ma recette' : ''}
            </span>
          </span>
          {r.kidFriendly && <Baby size={18} aria-label="Adaptée aux enfants" />}
        </Link>
      ))}
    </div>
  );
}

export function RecipeDetail() {
  const { recipeId = '' } = useParams();
  const data = useLiveQuery(async () => ({ recipes: await allRecipes(), household: await getHousehold() }), []);
  const [portions, setPortions] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!data) return null;
  const r = data.recipes.find((x) => x.id === recipeId);
  if (!r) return <p>Recette introuvable.</p>;
  const p = portions ?? portionsFor(data.household);
  const scaled = scaleRecipe(r, p);
  const unitOf = (i: { ing: string; unit?: string }) => i.unit ?? catalogById.get(i.ing)?.unit ?? '';

  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title={r.title} sub={`${r.minutes} min${r.kidFriendly ? ' · adaptée aux enfants' : ''}`} back="/kitchen/recipes" />
      <div className="card row" style={{ justifyContent: 'space-between' }}>
        <span>Portions</span>
        <Stepper value={p} min={0.5} step={0.5} onChange={setPortions} label="Portions" />
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <b>Ingrédients</b>
        {scaled.map((i) => (
          <div key={i.ing} className="row small" style={{ justifyContent: 'space-between' }}>
            <span>{catalogById.get(i.ing)?.name ?? i.name ?? i.ing}</span>
            <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtQty(i.qty, unitOf(i))}
            </span>
          </div>
        ))}
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <b>Étapes</b>
        <ol style={{ margin: 0, paddingLeft: 20 }} className="stack">
          {r.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div className="row">
        <button
          className="btn primary"
          onClick={async () => {
            await addToSelection(r.id, p);
            setMsg('Ajoutée à ta liste de courses.');
          }}
        >
          <ShoppingCart size={18} /> Ajouter à ma liste
        </button>
        <button
          className="btn"
          onClick={async () => {
            await consume(scaled.map((i) => ({ ing: i.ing, qty: i.qty, unit: unitOf(i) })));
            await logActivity({ space: 'kitchen', type: 'cook', ref: 'kitchen:cook', xp: XP.manualCheck, minutes: 0, data: { recipe: r.id } });
            setMsg('Bon appétit ! Les ingrédients utilisés sont retirés du placard.');
          }}
        >
          <ChefHat size={18} /> J’ai cuisiné ce plat
        </button>
        {r.mine && (
          <Link to={`/kitchen/recipe/${r.id}/edit`} className="btn ghost">
            Modifier
          </Link>
        )}
      </div>
      {msg && <Feedback ok>{msg}</Feedback>}
    </div>
  );
}

export function RecipeEditor() {
  const { recipeId = 'new' } = useParams();
  const navigate = useNavigate();
  const existing = useLiveQuery(async () => (recipeId === 'new' ? null : ((await db.userRecipes.get(recipeId)) ?? null)), [recipeId]);
  const [form, setForm] = useState<{ title: string; servings: number; minutes: number; kid: boolean; ingredients: string; steps: string } | null>(null);
  if (existing === undefined) return null;
  const f =
    form ??
    (existing
      ? {
          title: existing.recipe.title,
          servings: existing.recipe.servings,
          minutes: existing.recipe.minutes,
          kid: existing.recipe.kidFriendly,
          ingredients: existing.recipe.ingredients.map((i) => `${i.qty} ${i.unit ?? catalogById.get(i.ing)?.unit ?? ''} ${catalogById.get(i.ing)?.name ?? i.name ?? i.ing}`.replace(/ pièce /, ' ')).join('\n'),
          steps: existing.recipe.steps.join('\n'),
        }
      : { title: '', servings: 4, minutes: 30, kid: true, ingredients: '', steps: '' });
  const parsed = f.ingredients.split('\n').map((l) => parseLine(l, catalog)).filter((x): x is NonNullable<typeof x> => !!x);
  const unknown = parsed.filter((p) => p.ing.startsWith('free:'));
  const valid = f.title.trim() && parsed.length > 0 && f.steps.trim();

  const save = async () => {
    const id = existing?.id ?? `mine-${slugify(f.title)}-${Date.now().toString(36)}`;
    const recipe: Recipe = {
      id,
      title: f.title.trim(),
      servings: f.servings,
      minutes: f.minutes,
      kidFriendly: f.kid,
      tags: ['ma recette'],
      ingredients: parsed.map((p) => ({ ing: p.ing, qty: p.qty, unit: p.unit, name: p.name })),
      steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    await db.userRecipes.put({ id, recipe, updatedAt: Date.now() });
    navigate(`/kitchen/recipe/${id}`, { replace: true });
  };

  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title={existing ? 'Modifier ma recette' : 'Ma recette'} back="/kitchen/recipes" />
      <div className="card stack">
        <label className="field" htmlFor="r-title">
          Nom
          <input id="r-title" value={f.title} onChange={(e) => setForm({ ...f, title: e.target.value })} />
        </label>
        <div className="row">
          <label className="field" htmlFor="r-servings" style={{ flex: 1 }}>
            Portions
            <input id="r-servings" type="number" min={1} value={f.servings} onChange={(e) => setForm({ ...f, servings: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label className="field" htmlFor="r-minutes" style={{ flex: 1 }}>
            Minutes
            <input id="r-minutes" type="number" min={1} value={f.minutes} onChange={(e) => setForm({ ...f, minutes: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        </div>
        <label className="switch">
          <span>Adaptée aux enfants</span>
          <input id="r-kid" type="checkbox" checked={f.kid} onChange={(e) => setForm({ ...f, kid: e.target.checked })} />
        </label>
        <label className="field" htmlFor="r-ings">
          Ingrédients, un par ligne
          <textarea id="r-ings" rows={6} value={f.ingredients} placeholder={'200 g de riz\n3 œufs\n1 oignon'} onChange={(e) => setForm({ ...f, ingredients: e.target.value })} />
        </label>
        {parsed.length > 0 && (
          <span className="small muted">
            Compris : {parsed.map((p) => `${fmtQty(p.qty, p.unit)} ${p.name}`).join(' · ')}
            {unknown.length > 0 && ` (hors catalogue, rangé dans « Autre » : ${unknown.map((u) => u.name).join(', ')})`}
          </span>
        )}
        <label className="field" htmlFor="r-steps">
          Étapes, une par ligne
          <textarea id="r-steps" rows={5} value={f.steps} onChange={(e) => setForm({ ...f, steps: e.target.value })} />
        </label>
        <button className="btn primary" disabled={!valid} onClick={() => void save()}>
          Enregistrer
        </button>
        {existing && (
          <button
            className="btn danger"
            onClick={async () => {
              await db.userRecipes.delete(existing.id);
              navigate('/kitchen/recipes', { replace: true });
            }}
          >
            Supprimer cette recette
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Placard ---------- */

export function Pantry() {
  const items = useLiveQuery(() => db.pantry.toArray(), []);
  const [line, setLine] = useState('');
  const [expires, setExpires] = useState('');
  if (!items) return null;
  const today = dayKey();
  const preview = parseLine(line, catalog);
  const sorted = [...items].sort((a, b) => (a.expires ?? '9999').localeCompare(b.expires ?? '9999') || a.name.localeCompare(b.name, 'fr'));

  const add = async () => {
    if (!preview) return;
    await addToPantry({ ing: preview.ing, name: preview.name, qty: preview.qty, unit: preview.unit, expires: expires || undefined });
    setLine('');
    setExpires('');
  };

  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title="Placard et frigo" sub="Ajout rapide : « 500 g pâtes », « 6 œufs », « 1 l lait »." back="/kitchen" />
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input id="pantry-line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Ex. 3 courgettes" aria-label="Produit à ajouter" autoComplete="off" />
        <div className="row">
          <label className="field small" htmlFor="pantry-expires" style={{ flex: 1 }}>
            À consommer avant (facultatif)
            <input id="pantry-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
        </div>
        {preview && <span className="small muted">→ {fmtQty(preview.qty, preview.unit)} {preview.name}{preview.ing.startsWith('free:') ? ' (hors catalogue)' : ''}</span>}
        <button className="btn primary" type="submit" disabled={!preview}>
          <Plus size={18} /> Ajouter
        </button>
      </form>
      {sorted.length === 0 && <p className="muted empty">Placard vide.</p>}
      {sorted.map((p) => (
        <PantryLine key={p.id} p={p} today={today} />
      ))}
    </div>
  );
}

function PantryLine({ p, today }: { p: PantryRow; today: string }) {
  const d = p.expires ? daysUntil(p.expires, today) : null;
  const step = p.unit === 'g' || p.unit === 'ml' ? 50 : 1;
  return (
    <div className="card row" style={{ justifyContent: 'space-between', ...(d !== null && d <= USE_SOON_DAYS ? { borderColor: 'var(--warn)' } : {}) }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b>{p.name}</b>
        <br />
        <span className="small muted">
          {fmtQty(p.qty, p.unit)}
          {d !== null && (d < 0 ? ' · périmé' : d === 0 ? ' · à manger aujourd’hui' : ` · ${d} j restant${d > 1 ? 's' : ''}`)}
        </span>
      </span>
      {d !== null && d <= USE_SOON_DAYS && <span className="chip warn">à utiliser vite</span>}
      <Stepper value={roundQty(p.qty, p.unit)} min={0} step={step} onChange={(v) => void (v <= 0 ? db.pantry.delete(p.id!) : db.pantry.update(p.id!, { qty: v }))} label={p.name} />
      <button className="icon-btn" aria-label={`Retirer ${p.name}`} onClick={() => void db.pantry.delete(p.id!)}>
        <Trash2 size={18} />
      </button>
    </div>
  );
}

/* ---------- Courses ---------- */

export function Shopping() {
  const data = useLiveQuery(async () => {
    const [recipes, selection, pantry, checked] = await Promise.all([allRecipes(), getSelection(), db.pantry.toArray(), getChecked()]);
    return { recipes, selection, pantry, checked: new Set(checked) };
  }, []);
  const [msg, setMsg] = useState<string | null>(null);
  if (!data) return null;
  const byId = new Map(data.recipes.map((r) => [r.id, r]));
  const sel = data.selection.filter((s) => byId.has(s.recipeId));
  const needs = subtractStock(aggregate(sel.map((s) => ({ recipe: byId.get(s.recipeId)!, portions: s.portions })), catalogById), data.pantry);
  const groups = byAisle(needs);
  const keyOf = (n: { ing: string; unit: string }) => `${n.ing}|${n.unit}`;
  const toggle = (k: string) => {
    const c = new Set(data.checked);
    if (c.has(k)) c.delete(k);
    else c.add(k);
    void setChecked([...c]);
  };

  const bought = async () => {
    const done = needs.filter((n) => data.checked.has(keyOf(n)));
    for (const n of done) await addToPantry({ ing: n.ing, name: n.name, qty: roundQty(n.qty, n.unit), unit: n.unit });
    await setChecked([]);
    await logActivity({ space: 'kitchen', type: 'shopping', ref: 'kitchen:shopping', xp: XP.manualCheck, minutes: 0, data: { items: done.length } });
    setMsg(`${done.length} article(s) rangé(s) dans le placard.`);
  };

  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title="Liste de courses" sub="Générée depuis tes recettes, moins ce que tu as déjà. Triée par rayon." back="/kitchen" />
      {sel.length === 0 ? (
        <Link to="/kitchen/recipes" className="card lesson-row">
          <ChefHat size={22} />
          <span>
            <b>Choisis des recettes</b>
            <br />
            <span className="muted small">« Ajouter à ma liste » sur une recette remplit la liste.</span>
          </span>
        </Link>
      ) : (
        <div className="card stack" style={{ gap: 6 }}>
          <b>Recettes choisies</b>
          {sel.map((s) => (
            <div key={s.recipeId} className="row" style={{ justifyContent: 'space-between' }}>
              <Link to={`/kitchen/recipe/${s.recipeId}`} style={{ flex: 1, minWidth: 0 }}>
                {byId.get(s.recipeId)!.title}
              </Link>
              <Stepper value={s.portions} min={0.5} step={0.5} label="Portions" onChange={(v) => void setSelection(data.selection.map((x) => (x.recipeId === s.recipeId ? { ...x, portions: v } : x)))} />
              <button className="icon-btn" aria-label="Retirer la recette" onClick={() => void setSelection(data.selection.filter((x) => x.recipeId !== s.recipeId))}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      {sel.length > 0 && needs.length === 0 && <Feedback ok>Tu as déjà tout ce qu’il faut.</Feedback>}
      {groups.map(([aisle, list]) => (
        <section key={aisle} className="stack" style={{ gap: 6 }}>
          <h2 className="section-title" style={{ margin: '8px 0 0' }}>
            {aisle}
          </h2>
          {list.map((n) => {
            const k = keyOf(n);
            const on = data.checked.has(k);
            return (
              <div key={k} className={`today-item ${on ? 'done' : ''}`} data-space="kitchen" style={{ gridTemplateColumns: 'auto 1fr' }}>
                <button className={`check ${on ? 'on' : ''}`} onClick={() => toggle(k)} aria-pressed={on} aria-label={`${on ? 'Décocher' : 'Cocher'} ${n.name}`}>
                  {on && <Check size={18} />}
                </button>
                <div>
                  <div className="title">
                    {n.name} · {fmtQty(n.qty, n.unit)}
                  </div>
                  <div className="small muted">{n.from.join(', ')}</div>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {data.checked.size > 0 && needs.length > 0 && (
        <button className="btn primary block" onClick={() => void bought()}>
          Courses faites : ranger les articles cochés dans le placard
        </button>
      )}
      {msg && <Feedback ok>{msg}</Feedback>}
    </div>
  );
}

export function KitchenTips() {
  const month = String(new Date().getMonth() + 1);
  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  return (
    <div className="stack" data-space="kitchen">
      <PageTitle title="Conseils courses" back="/kitchen" />
      <div className="card stack" style={{ gap: 6 }}>
        <b>De saison en {monthName}</b>
        <span>{tips.season[month]?.join(', ')}</span>
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <b>La liste de base</b>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {tips.basics.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <b>Anti-gaspi</b>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {tips.antiWaste.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <p className="small muted row" style={{ gap: 6 }}>
        <Clock size={14} /> Objectif : manger bien et varié, sans compter obsessionnellement.
      </p>
    </div>
  );
}
