import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, getDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { MessageCircle, Send, Download, Plus, Search, Loader2, ArrowLeft } from 'lucide-react';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // 1. Charger la liste des conversations
  useEffect(() => {
    if (!auth.currentUser) return;

    const currentUid = auth.currentUser.uid;
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const chatsMap = {};
      const userCache = {};
      
      for (const msg of allMessages) {
        if (!msg.chatId || !msg.chatId.includes(currentUid)) continue;
        
        if (!chatsMap[msg.chatId]) {
          const otherUserId = msg.chatId.split('_').find(id => id !== currentUid);
          if (!otherUserId) continue;

          let userData = userCache[otherUserId];
          if (!userData) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            userData = userDoc.exists() ? userDoc.data() : { displayName: 'Utilisateur inconnu' };
            userCache[otherUserId] = userData;
          }

          chatsMap[msg.chatId] = {
            chatId: msg.chatId,
            lastMessage: msg,
            otherUser: { uid: otherUserId, ...userData },
            unreadCount: 0
          };
        }
        if (msg.receiverId === currentUid && !msg.read) {
          chatsMap[msg.chatId].unreadCount++;
        }
      }

      setConversations(Object.values(chatsMap).sort((a, b) => 
        (b.lastMessage.createdAt?.seconds || 0) - (a.lastMessage.createdAt?.seconds || 0)
      ));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Écouter les messages de la conversation sélectionnée
  useEffect(() => {
    if (!selectedChat || !auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedChat.chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      msgs.forEach(async (msg) => {
        if (msg.receiverId === auth.currentUser.uid && !msg.read) {
          try {
            await updateDoc(doc(db, 'messages', msg.id), { read: true });
          } catch (e) {}
        }
      });
    }, (err) => {
      const qSimple = query(collection(db, 'messages'), where('chatId', '==', selectedChat.chatId));
      onSnapshot(qSimple, (snap) => {
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        setMessages(msgs);
      });
    });

    return () => unsubscribe();
  }, [selectedChat]);

  // 3. Gérer le scroll automatique vers le bas
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !auth.currentUser) return;
    const messageData = {
      chatId: selectedChat.chatId,
      senderId: auth.currentUser.uid,
      receiverId: selectedChat.otherUser.uid,
      text: newMessage,
      createdAt: serverTimestamp(),
      read: false
    };
    try {
      setNewMessage('');
      await addDoc(collection(db, 'messages'), messageData);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Loader2 className="spinner" size={40} />
    </div>
  );

  return (
    <div className="container" style={{ height: 'calc(100vh - 140px)', padding: 0, overflow: 'hidden' }}>
      <div className="card" style={{ 
        display: 'grid', 
        gridTemplateColumns: selectedChat ? '300px 1fr' : '1fr', 
        height: '100%', 
        padding: 0, 
        overflow: 'hidden',
        border: '1px solid var(--border)',
        position: 'relative'
      }}>
        
        {/* Liste des conversations - Cachée sur mobile si un chat est sélectionné */}
        <div style={{ 
          borderRight: '1px solid var(--border)', 
          display: selectedChat && window.innerWidth < 768 ? 'none' : 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-card)',
          height: '100%',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '800' }}>Messages</h2>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  style={{ paddingLeft: '36px', borderRadius: '100px', fontSize: '0.9rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {filteredConversations.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune conversation.</p>
            ) : (
              filteredConversations.map(conv => (
                <div 
                  key={conv.chatId} 
                  onClick={() => setSelectedChat(conv)}
                  style={{ 
                    padding: '0.85rem 1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: 'pointer',
                    borderRadius: '12px',
                    marginBottom: '4px',
                    background: selectedChat?.chatId === conv.chatId ? 'var(--primary-light)' : 'transparent',
                    transition: 'var(--transition)'
                  }}
                >
                  <img src={conv.otherUser.photoURL || `https://ui-avatars.com/api/?name=${conv.otherUser.displayName}&background=random`} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{conv.otherUser.displayName}</span>
                      {conv.unreadCount > 0 && (
                        <span style={{ background: 'var(--accent)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: '800' }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.lastMessage.text || "Mème partagé"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zone de Chat */}
        <div style={{ 
          display: selectedChat ? 'flex' : (window.innerWidth < 768 ? 'none' : 'flex'), 
          flexDirection: 'column', 
          background: 'var(--bg-main)',
          height: '100%',
          overflow: 'hidden'
        }}>
          {selectedChat ? (
            <>
              {/* Header du chat */}
              <div style={{ 
                padding: '0.75rem 1.25rem', 
                background: 'var(--bg-card)', 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                zIndex: 10
              }}>
                <button 
                  onClick={() => setSelectedChat(null)} 
                  style={{ display: window.innerWidth < 768 ? 'block' : 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  <ArrowLeft size={20} />
                </button>
                <img src={selectedChat.otherUser.photoURL} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedChat.otherUser.displayName}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600' }}>En ligne</span>
                </div>
              </div>
              
              {/* Messages avec scroll optimisé */}
              <div 
                ref={scrollContainerRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '1.25rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  scrollBehavior: 'smooth'
                }}
              >
                {messages.map(msg => (
                  <div key={msg.id} style={{ alignSelf: msg.senderId === auth.currentUser.uid ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                    <div style={{ 
                      background: msg.senderId === auth.currentUser.uid ? 'var(--primary)' : 'var(--bg-card)', 
                      color: msg.senderId === auth.currentUser.uid ? 'white' : 'var(--text-main)',
                      padding: '0.6rem 1rem', 
                      borderRadius: msg.senderId === auth.currentUser.uid ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      boxShadow: 'var(--shadow-sm)',
                      border: msg.senderId === auth.currentUser.uid ? 'none' : '1px solid var(--border)',
                      fontSize: '0.9rem'
                    }}>
                      {msg.text && <p style={{ margin: 0 }}>{msg.text}</p>}
                      {msg.memeData && (
                        <img src={msg.memeData} alt="" style={{ width: '100%', borderRadius: '8px', marginTop: msg.text ? '8px' : '0', display: 'block' }} />
                      )}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: msg.senderId === auth.currentUser.uid ? 'right' : 'left' }}>
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input de message */}
              <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Écrivez..." 
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
                    style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '100px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.9rem' }} 
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={sendMessage} 
                    disabled={!newMessage.trim()}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <div style={{ width: '70px', height: '70px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <MessageCircle size={32} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Vos conversations</h3>
              <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>Sélectionnez un ami pour discuter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
