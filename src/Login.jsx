import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Sparkles, LogIn, Loader2 } from 'lucide-react';

const Login = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      console.error("Erreur de connexion Google:", err);
      setError("Impossible de se connecter avec Google. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      padding: '1rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '450px', 
        width: '100%', 
        padding: '3.5rem 2.5rem', 
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: 'none',
        background: 'white'
      }}>
        <div style={{ 
          width: '80px', height: '80px', background: 'var(--primary-light)', 
          borderRadius: '24px', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto 2.5rem', transform: 'rotate(10deg)' 
        }}>
          <ImageIcon size={45} color="var(--primary)" />
        </div>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.05em', color: '#1f2937' }}>
          Meme<span style={{ color: 'var(--primary)' }}>Gen</span>
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '3rem', fontSize: '1.1rem' }}>
          La plateforme ultime pour créer et partager vos meilleurs mèmes.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleSignIn} 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'white', 
            color: '#1f2937', 
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '1.05rem',
            fontWeight: '700',
            borderRadius: '12px',
            transition: 'all 0.2s ease',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? <Loader2 className="spinner" size={24} style={{ borderTopColor: 'var(--primary)' }} /> : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
              Se connecter avec Google
            </>
          )}
        </button>

        <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#9ca3af', fontSize: '0.9rem' }}>
          <Sparkles size={16} color="var(--primary)" />
          <span>Rejoignez la communauté des créateurs</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
