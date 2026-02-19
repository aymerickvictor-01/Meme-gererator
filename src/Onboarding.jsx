import React, { useState } from 'react';
import { auth } from './firebase';
import { User, Check, Sparkles, Loader2 } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    
    setLoading(true);
    try {
      // Appel de la fonction parente (completeSetup dans App.jsx)
      await onComplete({ displayName: displayName.trim(), bio: bio.trim() });
    } catch (err) {
      console.error("Erreur soumission onboarding:", err);
      alert("Erreur lors de la création du profil. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' 
    }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '3rem', position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
          <Sparkles size={120} color="var(--primary)" />
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ width: '90px', height: '90px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '4px solid white', boxShadow: 'var(--shadow)' }}>
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <User size={40} color="var(--primary)" />
            )}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Bienvenue sur MemeGen !</h2>
          <p style={{ color: 'var(--text-muted)' }}>Personnalisez votre profil pour rejoindre la communauté des créateurs.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Votre nom d'artiste</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: MemeLord99"
              required
              disabled={loading}
              style={{ padding: '0.875rem' }}
            />
          </div>

          <div className="input-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>Une petite bio (optionnel)</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Dites-nous quel genre de mèmes vous aimez..."
              disabled={loading}
              style={{ padding: '0.875rem', minHeight: '100px', resize: 'none' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !displayName.trim()} style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            {loading ? <Loader2 className="spinner" size={20} /> : <><Check size={20} /> Commencer l'aventure</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
