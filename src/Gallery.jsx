import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Download, Share2, Grid, Trash2, Eye, AlertCircle, Users, X, Send } from 'lucide-react';

const Gallery = () => {
  const [memesList, setMemesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [friends, setFriends] = useState([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const loadMemes = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'memes'), where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const memes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMemesList(memes);
      } catch (err) { setError("Impossible de charger vos mèmes."); }
      finally { setLoading(false); }
    };
    loadMemes();
  }, []);

  const loadFriends = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friendsIds = userData.friends || [];
        
        if (friendsIds.length > 0) {
          // Firebase limite "in" à 10 éléments, mais pour un début c'est ok
          // Sinon il faut faire plusieurs requêtes ou une par une
          const q = query(collection(db, 'users'), where('uid', 'in', friendsIds));
          const friendsSnapshot = await getDocs(q);
          setFriends(friendsSnapshot.docs.map(doc => doc.data()));
        } else {
          setFriends([]);
        }
      }
    } catch (e) { 
      console.error("Erreur lors du chargement des amis:", e); 
    }
  };

  const handleShareClick = (meme) => {
    setSelectedMeme(meme);
    setShowShareModal(true);
    loadFriends();
  };

  const shareWithFriend = async (friend) => {
    setSharing(true);
    const chatId = [auth.currentUser.uid, friend.uid].sort().join('_');
    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: auth.currentUser.uid,
        receiverId: friend.uid,
        text: "Regarde ce mème que j'ai créé !",
        memeData: selectedMeme.imageData,
        createdAt: serverTimestamp(),
        read: false
      });
      alert(`Mème partagé avec ${friend.displayName} !`);
      setShowShareModal(false);
    } catch (err) { console.error(err); }
    finally { setSharing(false); }
  };

  const handleDownload = (imageData, id) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `meme-${id}.jpg`;
    link.click();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce mème ?')) {
      try {
        await deleteDoc(doc(db, 'memes', id));
        setMemesList(memesList.filter(m => m.id !== id));
      } catch (error) { console.error(error); }
    }
  };

  const togglePublish = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'memes', id), { published: !currentStatus });
      setMemesList(memesList.map(m => m.id === id ? { ...m, published: !currentStatus } : m));
    } catch (error) { console.error(error); }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.5s ease-out' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Ma Galerie</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gérez vos créations, téléchargez-les ou publiez-les pour la communauté.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}><AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} /><p>{error}</p></div>
      ) : memesList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', borderStyle: 'dashed', borderWidth: '2px' }}>
          <Grid size={40} color="var(--primary)" style={{ opacity: 0.5, margin: '0 auto 1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Aucun mème trouvé</h3>
          <a href="/create" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem' }}>Créer mon premier mème</a>
        </div>
      ) : (
        <div className="gallery-grid">
          {memesList.map((meme) => (
            <div key={meme.id} className="meme-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ position: 'relative' }}>
                <img src={meme.imageData} alt="Meme" />
                {meme.published && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>PUBLIÉ</div>
                )}
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>{meme.createdAt?.toDate ? meme.createdAt.toDate().toLocaleDateString() : 'Récemment'}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" style={{ padding: '0.6rem', color: meme.published ? 'var(--primary)' : 'inherit' }} onClick={() => togglePublish(meme.id, meme.published)} title="Publier"><Eye size={18} /></button>
                    <button className="btn btn-outline" style={{ padding: '0.6rem' }} onClick={() => handleDownload(meme.imageData, meme.id)} title="Télécharger"><Download size={18} /></button>
                    <button className="btn btn-outline" style={{ padding: '0.6rem', color: 'var(--accent)' }} onClick={() => handleDelete(meme.id)} title="Supprimer"><Trash2 size={18} /></button>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleShareClick(meme)}><Share2 size={18} /> Partager à un ami</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showShareModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Partager à un ami</h3>
              <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowShareModal(false)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {friends.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Vous n'avez pas encore d'amis. Ajoutez-en dans la communauté !</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {friends.map(friend => (
                    <button key={friend.uid} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start', padding: '0.75rem' }} onClick={() => shareWithFriend(friend)} disabled={sharing}>
                      <img src={friend.photoURL} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{friend.displayName}</span>
                      <Send size={16} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
