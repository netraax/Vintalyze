import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');

  const parseVintedProfile = (text) => {
    try {
      const data = {};
      
      // Extraction du nom de la boutique
      const boutiquePattern = /Boutique:\s*(\S+)|^([^\s\n]+)\s*À propos/m;
      const boutiqueMatch = text.match(boutiquePattern);
      if (boutiqueMatch) {
        data.boutique = boutiqueMatch[1] || boutiqueMatch[2];
      }

      // Extraction du nombre d'abonnés
      const abonnesPattern = /(\d+)\s*\nAbonnés/;
      const abonnesMatch = text.match(abonnesPattern);
      if (abonnesMatch) {
        data.abonnes = parseInt(abonnesMatch[1]);
      }

      // Extraction du nombre d'abonnements
      const abonnementsPattern = /(\d+)\s*\nAbonnement/;
      const abonnementsMatch = text.match(abonnementsPattern);
      if (abonnementsMatch) {
        data.abonnements = parseInt(abonnementsMatch[1]);
      }

      // Extraction du lieu
      const lieuPattern = /À propos :\s*([^\n]+)/;
      const lieuMatch = text.match(lieuPattern);
      if (lieuMatch) {
        data.lieu = lieuMatch[1].trim();
      }

      // Extraction de la note et du nombre total d'évaluations
      const notePattern = /(\d+\.?\d*)\s*\n\s*\((\d+)\)/;
      const noteMatch = text.match(notePattern);
      if (noteMatch) {
        data.note = parseFloat(noteMatch[1]);
        data.nombreEvaluations = parseInt(noteMatch[2]);
        // Calcul des ventes estimées avec marge d'erreur de 10%
        data.ventesMin = Math.floor(data.nombreEvaluations * 0.9);
        data.ventesMax = Math.ceil(data.nombreEvaluations * 1.1);
      }

      // Extraction des commentaires en évitant les commentaires du vendeur
      const comments = [];
      const lines = text.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        
        const commentPattern = /^([^\s]+)\s+il y a\s+([^\n]+)$/;
        const currentMatch = currentLine.match(commentPattern);
        
        if (currentMatch && 
            currentMatch[1] !== 'Vinted' && 
            !lines[i-1]?.includes(data.boutique)) {
          comments.push({
            user: currentMatch[1],
            time: currentMatch[2],
            text: !nextLine.match(commentPattern) ? nextLine : ''
          });
        }
      }
      
      data.comments = comments;

      return data;
    } catch (err) {
      console.error('Erreur de parsing:', err);
      throw new Error('Erreur lors de l\'analyse du profil. Assurez-vous d\'avoir copié tout le contenu de la page du profil Vinted.');
    }
  };

  const handleReset = () => {
    setInputText('');
    setProfileData(null);
    setError('');
  };

  const generatePDF = () => {
    if (!profileData) return;

    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Rapport d\'analyse Vintalyze', 20, 20);
    
    // Informations générales
    doc.setFontSize(16);
    doc.text('Informations générales', 20, 40);
    
    const info = [
      ['Boutique', profileData.boutique],
      ['Ventes estimées', `${profileData.ventesMin} - ${profileData.ventesMax} (±10%)`],
      ['Abonnés', profileData.abonnes?.toString() || 'N/A'],
      ['Abonnements', profileData.abonnements?.toString() || 'N/A'],
      ['Lieu', profileData.lieu || 'N/A'],
      ['Note', `${profileData.note}/5 (${profileData.nombreEvaluations} évaluations)`]
    ];
    
    doc.autoTable({
      startY: 45,
      head: [['Métrique', 'Valeur']],
      body: info
    });
    
    // Commentaires
    if (profileData.comments && profileData.comments.length > 0) {
      doc.setFontSize(16);
      doc.text('Derniers commentaires', 20, doc.lastAutoTable.finalY + 20);
      
      const comments = profileData.comments.map(c => [
        c.user,
        c.time,
        c.text
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Utilisateur', 'Date', 'Commentaire']],
        body: comments
      });
    }
    
    // Sauvegarde du PDF
    doc.save(`vintalyze-${profileData.boutique}.pdf`);
  };

  const handleAnalyze = () => {
    try {
      if (!inputText.trim()) {
        setError('Veuillez coller le contenu de la page du profil Vinted');
        return;
      }

      const data = parseVintedProfile(inputText);
      setProfileData(data);
      setError('');
    } catch (err) {
      setError(err.message);
      setProfileData(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vintalyze
          </h1>
          <p className="text-lg text-gray-600">
            Analysez vos profils Vinted en quelques secondes
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="mb-4 text-sm text-gray-600">
            <p>Comment utiliser Vintalyze :</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Allez sur le profil Vinted que vous souhaitez analyser</li>
              <li>Sélectionnez tout le contenu de la page (Ctrl+A)</li>
              <li>Copiez le contenu (Ctrl+C)</li>
              <li>Collez-le ci-dessous (Ctrl+V)</li>
            </ol>
          </div>
          
          <textarea
            className="w-full h-48 p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Collez ici le contenu copié depuis la page du profil Vinted..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          
          {error && (
            <div className="text-red-500 mb-4">
              {error}
            </div>
          )}

          <button
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleAnalyze}
          >
            Analyser
          </button>
        </div>

        {profileData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Résultats de l'analyse</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Informations générales</h3>
                <ul className="space-y-2">
                  <li><span className="font-medium">Boutique:</span> {profileData.boutique}</li>
                  <li><span className="font-medium">Ventes estimées:</span> {profileData.ventesMin} - {profileData.ventesMax} (±10%)</li>
                  {profileData.abonnes && <li><span className="font-medium">Abonnés:</span> {profileData.abonnes}</li>}
                  {profileData.abonnements && <li><span className="font-medium">Abonnements:</span> {profileData.abonnements}</li>}
                  {profileData.lieu && <li><span className="font-medium">Lieu:</span> {profileData.lieu}</li>}
                  {profileData.note && (
                    <li>
                      <span className="font-medium">Note:</span> {profileData.note}/5 
                      {profileData.nombreEvaluations && ` (${profileData.nombreEvaluations} évaluations)`}
                    </li>
                  )}
                </ul>
              </div>

              {profileData.comments && profileData.comments.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Derniers commentaires</h3>
                  <div className="max-h-96 overflow-y-auto">
                    <ul className="space-y-2">
                      {profileData.comments.map((comment, index) => (
                        <li key={index} className="border-b border-gray-200 pb-2">
                          <span className="font-medium">{comment.user}</span>
                          {' - '}
                          <span className="text-gray-600">{comment.time}</span>
                          {comment.text && (
                            <p className="text-gray-800 mt-1">{comment.text}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Statistiques</h3>
                <div className="overflow-x-auto">
                  <BarChart
                    width={600}
                    height={300}
                    data={[{
                      name: 'Engagement',
                      'Ventes estimées': Math.floor((profileData.ventesMin + profileData.ventesMax) / 2),
                      Abonnés: profileData.abonnes || 0,
                      Abonnements: profileData.abonnements || 0
                    }]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Ventes estimées" fill="#3B82F6" />
                    <Bar dataKey="Abonnés" fill="#10B981" />
                    <Bar dataKey="Abonnements" fill="#6366F1" />
                  </BarChart>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                onClick={handleReset}
              >
                Nouvelle analyse
              </button>
              <button
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                onClick={generatePDF}
              >
                Exporter en PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
