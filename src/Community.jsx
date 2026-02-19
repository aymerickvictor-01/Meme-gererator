import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, getDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { UserPlus, UserCheck, MessageCircle, ArrowLeft, Send, X, Download, Plus, AlertCircle, Loader2 } from 'lucide-react';

const Community = () => {
  const [users, setUsers] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMemes, setUserMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour la messagerie
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatError, setChatError] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadCommunityData = async () => {
      try {
        const currentUid = auth.currentUser?.uid;
        if (currentUid) {
          const userDoc = await getDoc(doc(db, 'users', currentUid));
          if (userDoc.exists()) setCurrentUserData(userDoc.data());
        }
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setUsers(usersSnapshot.docs.map(doc => doc.data()).filter(u => u.uid !== currentUid));
        setLoading(false);
      } catch (err) {
        setError("Erreur de chargement.");
        setLoading(false);
      }
    };
    loadCommunityData();
  }, []);

  // Écoute des messages en temps réel quand le chat est ouvert
  useEffect(() => {
    if (showChat && selectedUser && auth.currentUser) {
      const chatId = [auth.currentUser.uid, selectedUser.uid].sort().join('_');
      setChatError(null);
      
      const q = query(
        collection(db, 'messages'), 
        where('chatId', '==', chatId), 
        orderBy('createdAt', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }, (err) => {
        console.warn("Erreur index chat, fallback manuel...", err);
        const qSimple = query(collection(db, 'messages'), where('chatId', '==', chatId));
        onSnapshot(qSimple, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
          setMessages(msgs);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
      });
      
      return () => unsubscribe();
    }
  }, [showChat, selectedUser]);

  const handleFollow = async (targetUid) => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    try {
      const isFollowing = currentUserData?.friends?.includes(targetUid);
      const userRef = doc(db, 'users', currentUid);
      if (isFollowing) {
        await updateDoc(userRef, { friends: arrayRemove(targetUid) });
        setCurrentUserData(prev => ({ ...prev, friends: prev.friends.filter(id => id !== targetUid) }));
      } else {
        await updateDoc(userRef, { friends: arrayUnion(targetUid) });
        setCurrentUserData(prev => ({ ...prev, friends: [...(prev.friends || []), targetUid] }));
      }
    } catch (err) { console.error(err); }
  };

  const viewUserProfile = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const q = query(collection(db, 'memes'), where('userId', '==', user.uid), where('published', '==', true));
      const querySnapshot = await getDocs(q);
      const memes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserMemes(memes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) { console.warn(e); }
    setLoading(false);
  };

  const sendMessage = async (memeToShare = null) => {
    if (!newMessage.trim() && !memeToShare) return;
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || !selectedUser) return;

    const chatId = [currentUid, selectedUser.uid].sort().join('_');
    const messageData = {
      chatId,
      senderId: currentUid,
      receiverId: selectedUser.uid,
      text: memeToShare ? "Mème partagé" : newMessage,
      memeData: memeToShare ? memeToShare.imageData : null,
      createdAt: serverTimestamp(),
      read: false
    };

    try {
      setNewMessage('');
      await addDoc(collection(db, 'messages'), messageData);
      if (memeToShare) alert("Mème partagé avec succès !");
    } catch (err) { console.error("Erreur envoi:", err); }
  };

  const downloadMeme = (data) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = `shared-meme-${Date.now()}.jpg`;
    link.click();
  };

  const saveToGallery = async (data) => {
    try {
      await addDoc(collection(db, 'memes'), {
        imageData: data,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Utilisateur',
        createdAt: serverTimestamp(),
        published: false
      });
      alert("Mème ajouté à votre galerie !");
    } catch (err) { alert("Erreur lors de la sauvegarde."); }
  };

  if (loading && !selectedUser) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <Loader2 className="spinner" size={40} />
    </div>
  );

  return (
    <div className="container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {selectedUser && !showChat ? (
        <div className="profile-view">
          <button className="btn btn-outline" onClick={() => setSelectedUser(null)} style={{ marginBottom: '2rem', borderRadius: '100px' }}>
            <ArrowLeft size={18} /> Retour à la liste
          </button>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', padding: '3rem', marginBottom: '3rem', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', background: 'var(--primary)' }}></div>
            <img 
              src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}&background=random`} 
              alt="" 
              style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--primary-light)', objectFit: 'cover' }} 
            />
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{selectedUser.displayName}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>{selectedUser.bio || "Ce créateur n'a pas encore de bio."}</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => handleFollow(selectedUser.uid)} style={{ padding: '0.75rem 2rem' }}>
                  {currentUserData?.friends?.includes(selectedUser.uid) ? <><UserCheck size={18} /> Ami</> : <><UserPlus size={18} /> Ajouter en ami</>}
                </button>
                <button className="btn btn-outline" onClick={() => setShowChat(true)} style={{ padding: '0.75rem 2rem' }}>
                  <MessageCircle size={18} /> Envoyer un message
                </button>
              </div>
            </div>
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem' }}>Mèmes publiés</h3>
          <div className="gallery-grid">
            {userMemes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Aucun mème publié.</p>
            ) : (
              userMemes.map(meme => (
                <div key={meme.id} className="meme-card" style={{ padding: 0 }}>
                  <img src={meme.imageData} alt="" />
                  <div style={{ padding: '1.25rem' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => sendMessage(meme)}>
                      Partager en message
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : showChat ? (
        <div className="chat-container card" style={{ maxWidth: '700px', margin: '0 auto', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}&background=random`} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontWeight: '800' }}>{selectedUser.displayName}</span>
            </div>
            <button className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => setShowChat(false)}><X size={20} /></button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-main)' }}>
            {chatError ? (
              <div style={{ textAlign: 'center', color: '#ef4444', padding: '2rem' }}><AlertCircle size={32} /><p>{chatError}</p></div>
            ) : messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Aucun message. Dites bonjour !</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.senderId === auth.currentUser.uid ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ 
                    background: msg.senderId === auth.currentUser.uid ? 'var(--primary)' : 'white', 
                    color: msg.senderId === auth.currentUser.uid ? 'white' : 'var(--text-main)',
                    padding: '12px 16px', borderRadius: '16px', border: msg.senderId === auth.currentUser.uid ? 'none' : '1px solid var(--border)', 
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {msg.text && <p style={{ marginBottom: msg.memeData ? '10px' : 0, fontSize: '0.95rem' }}>{msg.text}</p>}
                    {msg.memeData && (
                      <div style={{ position: 'relative' }}>
                        <img src={msg.memeData} alt="" style={{ width: '100%', borderRadius: '8px', display: 'block' }} />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)' }} onClick={() => downloadMeme(msg.memeData)}><Download size={14} /> Télécharger</button>
                          <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)' }} onClick={() => saveToGallery(msg.memeData)}><Plus size={14} /> Enregistrer</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: msg.senderId === auth.currentUser.uid ? 'right' : 'left' }}>
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                  </span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', background: 'var(--bg-card)' }}>
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="Votre message..." 
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, padding: '0.75rem 1.25rem', borderRadius: '100px', border: '2px solid var(--border)', outline: 'none' }}
            />
            <button className="btn btn-primary" onClick={() => sendMessage()} disabled={!newMessage.trim()} style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0 }}>
              <Send size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div className="community-list">
          <div style={{ marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Communauté</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Découvrez d'autres créateurs et partagez votre humour.</p>
          </div>
          
          <div className="gallery-grid">
            {users.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1/-1', padding: '4rem', color: 'var(--text-muted)' }}>Aucun autre utilisateur pour le moment.</p>
            ) : (
              users.map(u => (
                <div key={u.uid} className="card user-card" style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{u.displayName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', height: '2.5rem', overflow: 'hidden' }}>{u.bio || "Pas de bio."}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <button className="btn btn-outline" style={{ flex: 1, padding: '0.6rem' }} onClick={() => viewUserProfile(u)}>Voir Profil</button>
                    <button className="btn btn-primary" style={{ padding: '0.6rem' }} onClick={() => { setSelectedUser(u); setShowChat(true); }}><MessageCircle size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
