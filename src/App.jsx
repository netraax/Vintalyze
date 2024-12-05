import React, { useState } from 'react';
import { 
  BarChart, 
  LineChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');

  const parseVintedProfile = (text) => {
    try {
      const profileRegex = {
        boutique: /Nom de la boutique\s*:\s*([^\n]+)/i,
        ventes: /Vente\s*:\s*(\d+)/i,
        abonnes: /Abonn[ée]e?\s*:\s*(\d+)/i,
        abonnements: /Abonnement\s*:\s*(\d+)/i,
        lieu: /Lieu\s*:\s*([^\n]+)/i,
        note: /Note\s*:\s*([\d.]+)/i
      };

      const data = {};
      for (const [key, regex] of Object.entries(profileRegex)) {
        const match = text.match(regex);
        if (match) {
          data[key] = key === 'note' || key === 'ventes' || key === 'abonnes' || key === 'abonnements' 
            ? Number(match[1]) 
            : match[1].trim();
        }
      }

      // Extraire les commentaires
      const commentsRegex = /([^\n]+) il y a ([^\n]+)/g;
      const comments = [];
      let match;
      while ((match = commentsRegex.exec(text)) !== null) {
        comments.push({
          user: match[1],
          time: match[2]
        });
      }
      data.comments = comments;

      return data;
    } catch (err) {
      throw new Error('Erreur lors de l\'analyse du profil');
    }
  };

  const handleAnalyze = () => {
    try {
      if (!inputText.trim()) {
        setError('Veuillez coller le texte du profil Vinted');
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
          <textarea
            className="w-full h-32 p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Collez ici le contenu copié depuis le profil Vinted..."
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
                  <li>Boutique: {profileData.boutique}</li>
                  <li>Ventes: {profileData.ventes}</li>
                  <li>Abonnés: {profileData.abonnes}</li>
                  <li>Abonnements: {profileData.abonnements}</li>
                  <li>Lieu: {profileData.lieu}</li>
                  <li>Note: {profileData.note}/5</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Derniers commentaires</h3>
                <ul className="space-y-2">
                  {profileData.comments.map((comment, index) => (
                    <li key={index}>
                      <span className="font-medium">{comment.user}</span>
                      {' - '}
                      <span className="text-gray-600">{comment.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Statistiques</h3>
                <BarChart
                  width={600}
                  height={300}
                  data={[{
                    name: 'Engagement',
                    Ventes: profileData.ventes,
                    Abonnés: profileData.abonnes,
                    Abonnements: profileData.abonnements
                  }]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Ventes" fill="#3B82F6" />
                  <Bar dataKey="Abonnés" fill="#10B981" />
                  <Bar dataKey="Abonnements" fill="#6366F1" />
                </BarChart>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
