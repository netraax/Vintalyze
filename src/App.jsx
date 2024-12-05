import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Définition des mots-clés par langue
const languagePatterns = {
  fr: {
    name: 'France',
    keywords: ['merci', 'parfait', 'super', 'très', 'reçu', 'conforme', 'colis', 'bien', 'envoi', 'rapide', 'bonne', 'vraiment']
  },
  es: {
    name: 'Espagne',
    keywords: ['gracias', 'perfecto', 'muy', 'bien', 'genial', 'todo', 'muchas', 'excelente', 'bueno', 'vendedor']
  },
  it: {
    name: 'Italie',
    keywords: ['grazie', 'perfetto', 'tutto', 'molto', 'bene', 'ottimo', 'bellissimo', 'venditore', 'spedizione']
  },
  en: {
    name: 'International',
    keywords: ['thank', 'perfect', 'good', 'great', 'nice', 'very', 'received', 'seller', 'shipping', 'thanks']
  },
  nl: {
    name: 'Pays-Bas',
    keywords: ['bedankt', 'perfect', 'goed', 'heel', 'verkoper', 'dank', 'zeer', 'snelle', 'prima', 'mooi']
  },
  de: {
    name: 'Allemagne',
    keywords: ['danke', 'perfekt', 'sehr', 'gut', 'verkäufer', 'schnell', 'alles', 'super', 'vielen']
  }
};

// Couleurs pour le graphique en camembert
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const App = () => {
  const [inputText, setInputText] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');

  // Fonction pour détecter la langue d'un texte
  const detectLanguage = (text) => {
    text = text.toLowerCase();
    let maxScore = 0;
    let detectedLanguage = 'fr'; // Par défaut français

    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const score = pattern.keywords.reduce((count, keyword) => {
        return count + (text.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    }

    return detectedLanguage;
  };

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

      // Extraction du nombre d'abonnements et définition à 0 si non trouvé
      const abonnementsPattern = /(\d+)\s*\nAbonnement/;
      const abonnementsMatch = text.match(abonnementsPattern);
      data.abonnements = abonnementsMatch ? parseInt(abonnementsMatch[1]) : 0;

      // Extraction du lieu et simplification pour ne garder que le pays
      const lieuPattern = /À propos :\s*([^\n]+)/;
      const lieuMatch = text.match(lieuPattern);
      if (lieuMatch) {
        const lieu = lieuMatch[1].trim();
        const pays = ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Pays-Bas', 'Espagne', 'Italie', 'Allemagne'];
        const paysDetecte = pays.find(p => lieu.includes(p));
        data.lieu = paysDetecte || lieu;
      }

      // Extraction de la note et du nombre total d'évaluations
      const notePattern = /(\d+\.?\d*)\s*\n\s*\((\d+)\)/;
      const noteMatch = text.match(notePattern);
      if (noteMatch) {
        data.note = parseFloat(noteMatch[1]);
        data.nombreEvaluations = parseInt(noteMatch[2]);
        data.ventesEstimees = data.nombreEvaluations;
        data.ventesMinEstimees = Math.floor(data.nombreEvaluations * 0.9);
      }

      // Analyse des commentaires pour la répartition géographique
      const comments = [];
      const salesByCountry = {};
      let totalAnalyzedComments = 0;
      
      // Initialiser les compteurs pour chaque pays
      Object.keys(languagePatterns).forEach(lang => {
        salesByCountry[languagePatterns[lang].name] = 0;
      });

      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1]?.trim() || '';
        
        if (line.startsWith('**') && line.includes('il y a')) {
          const userMatch = line.match(/^\*\*([^*]+)\*\*/);
          const timeMatch = line.match(/il y a ([^*]+)$/i);
          
          if (userMatch && timeMatch && userMatch[1] !== 'Vinted') {
            const commentText = !nextLine.startsWith('**') ? nextLine : '';
            if (commentText) {
              const lang = detectLanguage(commentText);
              const country = languagePatterns[lang].name;
              
              salesByCountry[country]++;
              totalAnalyzedComments++;
            
              comments.push({
                user: userMatch[1].trim(),
                time: timeMatch[1].trim(),
                text: commentText,
                country: country
              });
            }
          }
        }
      }

      // Calculer les pourcentages et créer les données pour le graphique
      const salesDistribution = Object.entries(salesByCountry)
        .filter(([_, count]) => count > 0)
        .map(([country, count]) => ({
          name: country,
          value: count,
          percentage: ((count / totalAnalyzedComments) * 100).toFixed(1)
        }));

      data.comments = comments;
      data.salesDistribution = salesDistribution;
      data.totalAnalyzedComments = totalAnalyzedComments;

      if (!data.boutique) {
        throw new Error('Impossible de trouver le nom de la boutique');
      }

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
      ['Ventes estimées', `${profileData.ventesMinEstimees} - ${profileData.ventesEstimees} (-10%)`],
      ['Abonnés', profileData.abonnes?.toString() || 'N/A'],
      ['Abonnements', profileData.abonnements.toString()],
      ['Lieu', profileData.lieu || 'N/A'],
      ['Note', `${profileData.note}/5 (${profileData.nombreEvaluations} évaluations)`]
    ];
    
    doc.autoTable({
      startY: 45,
      head: [['Métrique', 'Valeur']],
      body: info
    });

    // Répartition géographique
    if (profileData.salesDistribution && profileData.salesDistribution.length > 0) {
      doc.setFontSize(16);
      doc.text('Répartition géographique des ventes', 20, doc.lastAutoTable.finalY + 20);

      const salesData = profileData.salesDistribution.map(item => [
        item.name,
        `${item.value} (${item.percentage}%)`
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Pays', 'Ventes (pourcentage)']],
        body: salesData
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
                  <li>
                    <span className="font-medium">Ventes estimées:</span>{' '}
                    {profileData.ventesMinEstimees} - {profileData.ventesEstimees}{' '}
                    <span className="text-gray-500 text-sm">(marge d'erreur -10%)</span>
                  </li>
                  {profileData.abonnes !== undefined && (
                    <li><span className="font-medium">Abonnés:</span> {profileData.abonnes}</li>
                  )}
                  <li><span className="font-medium">Abonnements:</span> {profileData.abonnements}</li>
                  {profileData.lieu && <li><span className="font-medium">Lieu:</span> {profileData.lieu}</li>}
                  {profileData.note && (
                    <li>
                      <span className="font-medium">Note:</span> {profileData.note}/5 
                      {profileData.nombreEvaluations && ` (${profileData.nombreEvaluations} évaluations)`}
                    </li>
                  )}
                </ul>
              </div>

              {profileData.salesDistribution && profileData.salesDistribution.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Répartition géographique des ventes</h3>
                  <div className="space-y-2">
                    {profileData.salesDistribution.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <span className="font-medium">
                          {item.value} ventes ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-bold">
                        <span>Total analysé</span>
                        <span>{profileData.totalAnalyz
                        <span>Total analysé</span>
                        <span>{profileData.totalAnalyzedComments} ventes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Statistiques générales</h3>
                <div className="overflow-x-auto">
                  <BarChart
                    width={600}
                    height={300}
                    data={[{
                      name: 'Engagement',
                      'Ventes estimées': profileData.ventesEstimees,
                      'Ventes min.': profileData.ventesMinEstimees,
                      Abonnés: profileData.abonnes || 0,
                      Abonnements: profileData.abonnements
                    }]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Ventes estimées" fill="#3B82F6" />
                    <Bar dataKey="Ventes min." fill="#93C5FD" />
                    <Bar dataKey="Abonnés" fill="#10B981" />
                    <Bar dataKey="Abonnements" fill="#6366F1" />
                  </BarChart>
                </div>
              </div>

              {profileData.salesDistribution && profileData.salesDistribution.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Répartition des ventes par pays</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <PieChart width={600} height={400}>
                      <Pie
                        data={profileData.salesDistribution}
                        cx={300}
                        cy={200}
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage}%)`}
                        outerRadius={160}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {profileData.salesDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </div>
                </div>
              )}
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
