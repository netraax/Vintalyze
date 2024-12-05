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
      const data = {};
      
      // Recherche du nom de la boutique
      // On cherche dans plusieurs formats possibles
      const boutiquePatterns = [
        /membre depuis[^@]+@([^"\s]+)/i,
        /profil de ([^"\s]+)/i,
        /boutique de ([^"\s]+)/i
      ];
      
      for (const pattern of boutiquePatterns) {
        const match = text.match(pattern);
        if (match) {
          data.boutique = match[1].trim();
          break;
        }
      }

      // Recherche du nombre de ventes
      // Cherche les chiffres près des mots associés aux ventes
      const ventesPatterns = [
        /(\d+)\s*articles?\s*vendus?/i,
        /(\d+)\s*ventes?/i,
        /vendu\s*:\s*(\d+)/i
      ];
      
      for (const pattern of ventesPatterns) {
        const match = text.match(pattern);
        if (match) {
          data.ventes = parseInt(match[1]);
          break;
        }
      }

      // Recherche des abonnés
      const abonnesPatterns = [
        /(\d+)\s*abonn[ée]s?/i,
        /followers?[^\d]*(\d+)/i
      ];
      
      for (const pattern of abonnesPatterns) {
        const match = text.match(pattern);
        if (match) {
          data.abonnes = parseInt(match[1]);
          break;
        }
      }

      // Recherche des abonnements
      const abonnementsPatterns = [
        /(\d+)\s*abonnements?/i,
        /following[^\d]*(\d+)/i
      ];
      
      for (const pattern of abonnementsPatterns) {
        const match = text.match(pattern);
        if (match) {
          data.abonnements = parseInt(match[1]);
          break;
        }
      }

      // Recherche de la localisation
      const lieuPatterns = [
        /localis[ée] à ([^,\n]+)/i,
        /lieu\s*:\s*([^,\n]+)/i,
        /ville\s*:\s*([^,\n]+)/i
      ];
      
      for (const pattern of lieuPatterns) {
        const match = text.match(pattern);
        if (match) {
          data.lieu = match[1].trim();
          break;
        }
      }

      // Recherche de la note
      const notePatterns = [
        /(\d[.,]\d+)\s*\/\s*5/i,
        /note\s*:\s*(\d[.,]\d+)/i,
        /évaluation[^\d]*(\d[.,]\d+)/i
      ];
      
      for (const pattern of notePatterns) {
        const match = text.match(pattern);
        if (match) {
          data.note = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // Extraction des commentaires
      const comments = [];
      const commentLines = text.split('\n');
      
      commentLines.forEach(line => {
        // Cherche les patterns de commentaires typiques
        const commentPatterns = [
          /([^\s]+)\s+il y a ([^\n:]+)[:\s]+(.+)/i,
          /([^\s]+)\s+([^:]+)\s*:\s*(.+)/i
        ];

        for (const pattern of commentPatterns) {
          const match = line.match(pattern);
          if (match) {
            comments.push({
              user: match[1],
              time: match[2],
              text: match[3]?.trim() || ''
            });
            break;
          }
        }
      });

      data.comments = comments;

      // Vérification des données minimales requises
      if (!data.boutique || !data.ventes) {
        throw new Error('Impossible de trouver les informations essentielles du profil');
      }

      return data;
    } catch (err) {
      throw new Error('Erreur lors de l\'analyse du profil. Assurez-vous d\'avoir copié tout le contenu de la page du profil Vinted.');
    }
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
            className="w-full h-32 p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <li><span className="font-medium">Ventes:</span> {profileData.ventes}</li>
                  {profileData.abonnes && <li><span className="font-medium">Abonnés:</span> {profileData.abonnes}</li>}
                  {profileData.abonnements && <li><span className="font-medium">Abonnements:</span> {profileData.abonnements}</li>}
                  {profileData.lieu && <li><span className="font-medium">Lieu:</span> {profileData.lieu}</li>}
                  {profileData.note && <li><span className="font-medium">Note:</span> {profileData.note}/5</li>}
                </ul>
              </div>

              {profileData.comments && profileData.comments.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Derniers commentaires</h3>
                  <ul className="space-y-2">
                    {profileData.comments.map((comment, index) => (
                      <li key={index}>
                        <span className="font-medium">{comment.user}</span>
                        {' - '}
                        <span className="text-gray-600">{comment.time}</span>
                        {comment.text && (
                          <>
                            {' : '}
                            <span className="text-gray-800">{comment.text}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
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
                      Ventes: profileData.ventes,
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
                    <Bar dataKey="Ventes" fill="#3B82F6" />
                    <Bar dataKey="Abonnés" fill="#10B981" />
                    <Bar dataKey="Abonnements" fill="#6366F1" />
                  </BarChart>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
