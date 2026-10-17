import { HashRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { BarChart3, Brain, Dumbbell, GraduationCap, Settings as Gear, Sun, UtensilsCrossed } from 'lucide-react';
import { Today } from './screens/Today';
import { Review } from './screens/Review';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { LearnHome } from './spaces/learn/LearnHome';
import { ChineseHome } from './spaces/learn/chinese/ChineseHome';
import { VocabLesson } from './spaces/learn/chinese/VocabLesson';
import { ToneDrill } from './spaces/learn/chinese/ToneDrill';
import { TracePage } from './spaces/learn/chinese/TracePage';
import { ContentImport } from './screens/ContentImport';
import { LingalaHome } from './spaces/learn/lingala/LingalaHome';
import { LingalaLesson } from './spaces/learn/lingala/LingalaLesson';
import { DialoguePage } from './spaces/learn/lingala/Dialogue';
import { DialogueEditor, ItemEditor, Lexicon } from './spaces/learn/lingala/Lexicon';
import { CodeHome } from './spaces/learn/code/CodeHome';
import { Mission } from './spaces/learn/code/Mission';
import { CyberHome, CyberQuiz, CyberSheet, ItHome } from './spaces/learn/it/ItPages';
import { PhishingGame } from './spaces/learn/it/Phishing';
import { BrainHome, MathGame, MemoryGame } from './spaces/brain/BrainPages';
import { ExerciseSheet, SportHome } from './spaces/sport/SportHome';
import { WorkoutRunner } from './spaces/sport/Workout';
import { TimerPage } from './spaces/sport/TimerPage';
import { Journal } from './spaces/sport/Journal';
import { KitchenHome, KitchenTips, Pantry, RecipeDetail, RecipeEditor, RecipeList, Shopping } from './spaces/kitchen/KitchenPages';

function ExerciseRoute() {
  return <ExerciseSheet chainId={useParams().chain ?? ''} />;
}

const NAV = [
  { to: '/', label: 'Aujourd’hui', icon: Sun, end: true },
  { to: '/learn', label: 'Apprendre', icon: GraduationCap },
  { to: '/sport', label: 'Sport', icon: Dumbbell },
  { to: '/kitchen', label: 'Cuisine', icon: UtensilsCrossed },
  { to: '/brain', label: 'Cerveau', icon: Brain },
];

function Shell() {
  const { pathname } = useLocation();
  // Pendant un exercice, on masque la navigation pour rester concentré.
  const focus = /^\/(review|learn\/(zh|ln)\/(lesson|tones)|learn\/it\/cyber\/(quiz|phishing)|sport\/session)/.test(pathname);
  return (
    <div className="shell" style={focus ? { paddingBottom: 24, paddingLeft: 0 } : undefined}>
      {!focus && (
        <header className="topbar">
          <Link to="/" className="brand">
            <img src="icons/icon.svg" alt="" /> Mon espace
          </Link>
          <NavLink to="/progress" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`} aria-label="Progression">
            <BarChart3 size={20} />
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`} aria-label="Réglages">
            <Gear size={20} />
          </NavLink>
        </header>
      )}
      <main className="page">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/review" element={<Review />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/learn" element={<LearnHome />} />
          <Route path="/learn/zh" element={<ChineseHome />} />
          <Route path="/learn/zh/lesson/:lessonId" element={<VocabLesson />} />
          <Route path="/learn/zh/tones" element={<ToneDrill />} />
          <Route path="/learn/zh/trace" element={<TracePage />} />
          <Route path="/learn/zh/trace/:char" element={<TracePage />} />
          <Route path="/learn/ln" element={<LingalaHome />} />
          <Route path="/learn/ln/lesson/:lessonId" element={<LingalaLesson />} />
          <Route path="/learn/ln/dialogue/:dialogueId" element={<DialoguePage />} />
          <Route path="/learn/ln/dialogue/:dialogueId/edit" element={<DialogueEditor />} />
          <Route path="/learn/ln/lexicon" element={<Lexicon />} />
          <Route path="/learn/ln/item/:itemId" element={<ItemEditor />} />
          <Route path="/learn/code" element={<CodeHome />} />
          <Route path="/learn/code/:missionId" element={<Mission />} />
          <Route path="/content" element={<ContentImport />} />
          <Route path="/sport" element={<SportHome />} />
          <Route path="/sport/exercise/:chain" element={<ExerciseRoute />} />
          <Route path="/sport/session/:sessionId" element={<WorkoutRunner />} />
          <Route path="/sport/timer" element={<TimerPage />} />
          <Route path="/sport/journal" element={<Journal />} />
          <Route path="/kitchen" element={<KitchenHome />} />
          <Route path="/kitchen/recipes" element={<RecipeList />} />
          <Route path="/kitchen/recipe/:recipeId" element={<RecipeDetail />} />
          <Route path="/kitchen/recipe/:recipeId/edit" element={<RecipeEditor />} />
          <Route path="/kitchen/pantry" element={<Pantry />} />
          <Route path="/kitchen/shopping" element={<Shopping />} />
          <Route path="/kitchen/tips" element={<KitchenTips />} />
          <Route path="/learn/it" element={<ItHome />} />
          <Route path="/learn/it/cyber" element={<CyberHome />} />
          <Route path="/learn/it/cyber/sheet" element={<CyberSheet />} />
          <Route path="/learn/it/cyber/quiz" element={<CyberQuiz />} />
          <Route path="/learn/it/cyber/phishing" element={<PhishingGame />} />
          <Route path="/brain" element={<BrainHome />} />
          <Route path="/brain/memory" element={<MemoryGame />} />
          <Route path="/brain/math" element={<MathGame />} />
          <Route path="*" element={<p>Page introuvable.</p>} />
        </Routes>
      </main>
      {!focus && (
        <nav className="bottomnav" aria-label="Espaces">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
