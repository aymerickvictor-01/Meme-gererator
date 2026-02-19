import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Send, MousePointer2, Move, Type } from 'lucide-react';

const MemeEditor = () => {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [topText, setTopText] = useState({ text: 'TEXTE DU HAUT', x: 50, y: 15 });
  const [bottomText, setBottomText] = useState({ text: 'TEXTE DU BAS', x: 50, y: 85 });
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(null); // 'top' or 'bottom'
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const drawMeme = () => {
    if (!backgroundImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = backgroundImage;

    img.onload = () => {
      // Ajuster la taille du canvas à l'image
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const fontSize = Math.floor(canvas.width / 12);
      ctx.font = `bold ${fontSize}px Impact`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = fontSize / 15;
      ctx.textAlign = 'center';

      // Dessiner le texte du haut
      ctx.textBaseline = 'middle';
      const topX = (topText.x / 100) * canvas.width;
      const topY = (topText.y / 100) * canvas.height;
      ctx.fillText(topText.text.toUpperCase(), topX, topY);
      ctx.strokeText(topText.text.toUpperCase(), topX, topY);

      // Dessiner le texte du bas
      const botX = (bottomText.x / 100) * canvas.width;
      const botY = (bottomText.y / 100) * canvas.height;
      ctx.fillText(bottomText.text.toUpperCase(), botX, botY);
      ctx.strokeText(bottomText.text.toUpperCase(), botX, botY);
    };
  };

  useEffect(() => {
    drawMeme();
  }, [backgroundImage, topText, bottomText]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBackgroundImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX / canvas.width) * 100,
      y: ((e.clientY - rect.top) * scaleY / canvas.height) * 100
    };
  };

  const handleMouseDown = (e) => {
    if (!backgroundImage) return;
    const pos = getMousePos(e);

    // Détection de proximité (zone de 15% autour du texte)
    const topDist = Math.sqrt(Math.pow(pos.x - topText.x, 2) + Math.pow(pos.y - topText.y, 2));
    const bottomDist = Math.sqrt(Math.pow(pos.x - bottomText.x, 2) + Math.pow(pos.y - bottomText.y, 2));

    if (topDist < 15) setIsDragging('top');
    else if (bottomDist < 15) setIsDragging('bottom');
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !backgroundImage) return;
    const pos = getMousePos(e);

    if (isDragging === 'top') {
      setTopText(prev => ({ ...prev, x: pos.x, y: pos.y }));
    } else if (isDragging === 'bottom') {
      setBottomText(prev => ({ ...prev, x: pos.x, y: pos.y }));
    }
  };

  const handleMouseUp = () => setIsDragging(null);

  const handleSave = async (publish = false) => {
    if (!backgroundImage) return;
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Vous devez être connecté pour enregistrer un mème.");
      return;
    }

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/jpeg', 0.8); 
      
      const newMeme = {
        imageData,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Utilisateur',
        createdAt: serverTimestamp(),
        published: publish
      };

      // Sauvegarde dans Firestore
      await addDoc(collection(db, 'memes'), newMeme);
      
      // Petit délai pour laisser le temps à Firestore de synchroniser avant redirection
      setTimeout(() => {
        navigate('/gallery');
      }, 500);
    } catch (error) {
      console.error("Erreur sauvegarde Firestore:", error);
      alert("Erreur lors de la sauvegarde du mème sur le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Créer un Mème</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Importez une image et placez votre texte librement.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => fileInputRef.current.click()}>
            <Upload size={18} /> {backgroundImage ? "Changer" : "Importer"}
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={!backgroundImage || loading}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px' }}></div> : <><Send size={18} /> Publier</>}
          </button>
        </div>
      </div>

      <div className="editor-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        <div className="editor-sidebar card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', fontWeight: '700' }}><Type size={18} color="var(--primary)" /> Texte du haut</label>
            <input 
              type="text" 
              value={topText.text}
              onChange={(e) => setTopText(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Entrez le texte..."
            />
          </div>
          <div className="input-group">
            <label><Type size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Texte du bas</label>
            <input 
              type="text" 
              value={bottomText.text}
              onChange={(e) => setBottomText(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Entrez le texte..."
            />
          </div>
          
          <div style={{ background: 'var(--primary-light)', padding: '1.25rem', borderRadius: '12px', color: 'var(--primary-dark)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontWeight: '700' }}>
              <Move size={18} /> Astuce Interactive
            </div>
            Cliquez sur le texte directement sur l'image pour le déplacer avec votre souris !
          </div>

          <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => handleSave(false)} disabled={!backgroundImage || loading}>
            <Download size={18} /> Enregistrer en brouillon
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
        </div>

        <div className="canvas-container card" style={{ background: 'var(--bg-main)', border: '2px dashed var(--border)', minHeight: '400px', height: '100%', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {backgroundImage ? (
            <canvas 
              ref={canvasRef} 
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          ) : (
            <div onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '80px', height: '80px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: 'var(--shadow)' }}>
                <Upload size={32} color="var(--primary)" />
              </div>
              <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Aucune image sélectionnée</h3>
              <p>Cliquez ici pour importer votre base de mème</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemeEditor;
