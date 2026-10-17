import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
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
import { ComingSoon } from './spaces/ComingSoon';

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
  const focus = /^\/(review|learn\/zh\/(lesson|tones))/.test(pathname);
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
          <Route path="/sport" element={<ComingSoon space="sport" />} />
          <Route path="/kitchen" element={<ComingSoon space="kitchen" />} />
          <Route path="/brain" element={<ComingSoon space="brain" />} />
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
