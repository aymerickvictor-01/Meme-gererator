import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import MemeEditor from './MemeEditor';
import Gallery from './Gallery';
import Login from './Login';
import Onboarding from './Onboarding';
import Community from './Community';
import Messages from './Messages';
import { Image as ImageIcon, LayoutGrid, LogOut, Users, Home, PlusCircle, Settings, Menu, X as XIcon, Sun, Moon, MessageSquare, Loader2 } from 'lucide-react';
import './index.css';

const ProtectedRoute = ({ children, user, loading }) => {
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Loader2 className="spinner" size={40} />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [totalUnread, setTotalUnread] = useState(0);

  // Écouter les messages non lus globalement
  useEffect(() => {
    if (!user) {
      setTotalUnread(0);
      return;
    }
    const q = query(collection(db, 'messages'), where('receiverId', '==', user.uid), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalUnread(snapshot.size);
    }, (err) => console.warn("Erreur messages non lus:", err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            setIsSetup(true);
          } else {
            setIsSetup(false);
          }
        } catch (err) {
          console.error("Erreur lecture Firestore users:", err);
          setIsSetup(false);
        }
        setUser(currentUser);
      } else {
        setUser(null);
        setUserData(null);
        setIsSetup(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  const completeSetup = async (data) => {
    if (!user) return;
    try {
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: data.displayName || user.displayName || 'Utilisateur',
        bio: data.bio || '',
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${data.displayName || 'U'}&background=random`,
        friends: userData?.friends || [],
        updatedAt: serverTimestamp(),
        createdAt: userData?.createdAt || serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser, { merge: true });
      setUserData(newUser);
      setIsSetup(true);
    } catch (err) {
      console.error("Erreur sauvegarde profil:", err);
      alert("Erreur lors de la sauvegarde du profil. Vérifiez vos règles Firestore.");
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Loader2 className="spinner" size={40} />
    </div>
  );

  return (
    <Router>
      <div className="app-layout">
        {!isSetup && user && <Onboarding onComplete={completeSetup} />}
        
        {user && isSetup && (
          <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <ImageIcon size={24} color="white" />
              </div>
              <span>MemeGen</span>
            </div>
            <nav className="sidebar-nav">
              <NavLink to="/" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Home size={20} /> Accueil
              </NavLink>
              <NavLink to="/create" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <PlusCircle size={20} /> Créer un Mème
              </NavLink>
              <NavLink to="/gallery" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutGrid size={20} /> Ma Galerie
              </NavLink>
              <NavLink to="/community" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={20} /> Communauté
              </NavLink>
              <NavLink to="/messages" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', position: 'relative' }}>
                  <MessageSquare size={20} /> Messages
                  {totalUnread > 0 && (
                    <span style={{ 
                      position: 'absolute', right: 0, background: 'var(--accent)', color: 'white', 
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' 
                    }}>
                      {totalUnread}
                    </span>
                  )}
                </div>
              </NavLink>
              {/* <NavLink to="/settings" onClick={() => setIsSidebarOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={20} /> Paramètres
              </NavLink> */}
            </nav>
            <div className="sidebar-footer">
              <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <LogOut size={20} /> Déconnexion
              </button>
            </div>
          </aside>
        )}

        <main className="main-content" style={{ marginLeft: user && isSetup ? 'var(--sidebar-width)' : '0' }}>
          {user && isSetup && (
            <header>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                  {isSidebarOpen ? <XIcon size={24} /> : <Menu size={24} />}
                </button>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>Tableau de bord</h2>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button className="theme-toggle" onClick={toggleTheme} title="Changer le thème">
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <Link to="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="user-profile-badge">
                    <img src={userData?.photoURL || `https://ui-avatars.com/api/?name=${userData?.displayName || 'U'}&background=random`} alt="Profil" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span className="user-name-desktop" style={{ fontWeight: '600', fontSize: '0.85rem' }}>{userData?.displayName}</span>
                  </div>
                </Link>
              </div>
            </header>
          )}

          <div className="content-area">
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              <Route path="/" element={
                <ProtectedRoute user={user} loading={loading}>
                  <div className="container" style={{ maxWidth: '800px' }}>
                    <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--primary-light)', borderRadius: '50%', zIndex: 0 }}></div>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '120px', height: '120px', background: 'var(--primary-light)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', transform: 'rotate(10deg)' }}>
                          <ImageIcon size={60} color="var(--primary)" />
                        </div>
                        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-0.05em' }}>Hello, {userData?.displayName} !</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
                          Prêt à créer le prochain mème viral ? Exprimez votre humour et partagez-le avec le monde.
                        </p>
                        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Link to="/create" className="btn btn-primary" style={{ padding: '1.25rem 3rem', textDecoration: 'none', fontSize: '1.1rem' }}>
                            <PlusCircle size={24} /> Créer un mème
                          </Link>
                          <Link to="/gallery" className="btn btn-outline" style={{ padding: '1.25rem 3rem', textDecoration: 'none', fontSize: '1.1rem' }}>
                            <LayoutGrid size={24} /> Ma galerie
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/create" element={<ProtectedRoute user={user} loading={loading}><MemeEditor /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute user={user} loading={loading}><Gallery /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute user={user} loading={loading}><Community /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute user={user} loading={loading}><Messages /></ProtectedRoute>} />
              {/* <Route path="/settings" element={<ProtectedRoute user={user} loading={loading}><div className="container"><h1>Paramètres</h1><p>Bientôt disponible...</p></div></ProtectedRoute>} /> */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
