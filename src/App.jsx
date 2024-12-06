import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getDateRange, generateDatePeriod, convertRelativeDateToAbsolute } from '/src/utils/dateUtils';

// Couleurs pour les graphiques
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Nouvelle fonction de détection de langue avec linguist.js
const detectMainLanguage = (text) => {
  try {
    // franc retourne directement le code de la langue
    const detectedLanguage = window.franc(text);
    
    const languageToCountry = {
      'fra': 'France',
      'spa': 'Espagne',
      'ita': 'Italie',
      'eng': 'International',
      'nld': 'Pays-Bas',
      'deu': 'Allemagne',
      'und': 'International' // 'und' est retourné quand franc ne peut pas détecter la langue
    };

    return languageToCountry[detectedLanguage] || 'International';
  } catch (error) {
    console.error('Erreur de détection de langue:', error);
    return 'International';
  }
};

const App = () => {
  const [inputText, setInputText] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [secondProfileText, setSecondProfileText] = useState('');
  const [secondProfileData, setSecondProfileData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  // Calcul du score de performance (0-100)
  const calculatePerformanceScore = (data) => {
    if (!data) return 0;
    
    // Facteurs de pondération
    const weights = {
      rating: 0.3,        // 30% pour la note
      sales: 0.3,         // 30% pour les ventes
      engagement: 0.2,    // 20% pour l'engagement
      consistency: 0.2    // 20% pour la régularité des ventes
    };

    // Score de la note (5/5 = 100%)
    const ratingScore = (data.note / 5) * 100;

    // Score des ventes (basé sur une échelle logarithmique)
    const salesScore = Math.min(100, (Math.log10(data.ventesEstimees) / Math.log10(1000)) * 100);

    // Score d'engagement (ratio ventes/abonnés, max 100%)
    const engagementScore = data.abonnes ? Math.min(100, (data.ventesEstimees / data.abonnes) * 100) : 50;

    // Score de régularité (basé sur l'écart-type des ventes mensuelles)
    let consistencyScore = 50; // Valeur par défaut
    if (data.salesTimeline && data.salesTimeline.length > 0) {
      const salesValues = data.salesTimeline.map(item => item.ventes);
      const mean = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
      const stdDev = Math.sqrt(salesValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / salesValues.length);
      const cv = stdDev / mean; // Coefficient de variation
      consistencyScore = Math.max(0, 100 - (cv * 100));
    }

    // Score final pondéré
    const finalScore = Math.round(
      ratingScore * weights.rating +
      salesScore * weights.sales +
      engagementScore * weights.engagement +
      consistencyScore * weights.consistency
    );

    return {
      total: finalScore,
      details: {
        rating: Math.round(ratingScore),
        sales: Math.round(salesScore),
        engagement: Math.round(engagementScore),
        consistency: Math.round(consistencyScore)
      }
    };
  };

  // Calcul des statistiques de performance
  const calculatePerformanceStats = (data) => {
    if (!data || !data.salesTimeline) return null;

    const sales = data.salesTimeline.map(item => item.ventes);
    const totalSales = sales.reduce((a, b) => a + b, 0);
    const avgSalesPerMonth = totalSales / sales.length;
    const bestMonth = [...data.salesTimeline].sort((a, b) => b.ventes - a.ventes)[0];
    
    // Calcul de la tendance
    const trend = sales.reduce((acc, curr, idx) => {
      if (idx === 0) return 0;
      return acc + (curr - sales[idx - 1]);
    }, 0) / (sales.length - 1);

    // Prévision pour le mois prochain (basée sur la tendance)
    const lastMonthSales = sales[sales.length - 1];
    const prediction = Math.max(0, Math.round(lastMonthSales + trend));

    return {
      avgSalesPerMonth: Math.round(avgSalesPerMonth),
      bestMonth: bestMonth,
      trend: trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'stable',
      prediction: prediction
    };
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

      // Extraction du nombre d'abonnements
      const abonnementsPattern = /(\d+)\s*\nAbonnement/;
      const abonnementsMatch = text.match(abonnementsPattern);
      data.abonnements = abonnementsMatch ? parseInt(abonnementsMatch[1]) : 0;

      // Extraction du lieu
      const lieuPattern = /À propos :\s*([^\n]+)/;
      const lieuMatch = text.match(lieuPattern);
      if (lieuMatch) {
        const lieu = lieuMatch[1].trim();
        const pays = ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Pays-Bas', 'Espagne', 'Italie', 'Allemagne'];
        const paysDetecte = pays.find(p => lieu.includes(p));
        data.lieu = paysDetecte || lieu;
      }

      // Extraction de la note et du nombre d'évaluations
      const notePattern = /(\d+\.?\d*)\s*\n\s*\((\d+)\)/;
      const noteMatch = text.match(notePattern);
      if (noteMatch) {
        data.note = parseFloat(noteMatch[1]);
        data.nombreEvaluations = parseInt(noteMatch[2]);
        data.ventesEstimees = data.nombreEvaluations;
        data.ventesMinEstimees = Math.floor(data.nombreEvaluations * 0.9);
      }

      // Analyse temporelle et linguistique des ventes
      const salesByMonth = {};
      const salesByCountry = {
        'France': 0,
        'Espagne': 0,
        'Italie': 0,
        'International': 0,
        'Pays-Bas': 0,
        'Allemagne': 0
      };

      const commentDates = [];
      const lines = text.split('\n');
      
      // Collecte des dates et analyse des langues
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1]?.trim() || '';
        
        if (line.includes('il y a') && !line.includes('Vinted')) {
          const timeMatch = line.match(/il y a ([^*\n]+)/i);
          if (timeMatch && !nextLine.startsWith('**')) {
            // Analyse de la date
            const absoluteDate = convertRelativeDateToAbsolute(timeMatch[1]);
            if (absoluteDate) {
              commentDates.push(absoluteDate);

              // Détection de la langue et comptage des ventes par pays
              const country = detectMainLanguage(nextLine);
              salesByCountry[country]++;
            }
          }
        }
      }

      // Définir la période basée sur les dates trouvées
      if (commentDates.length > 0) {
        const { start, end } = getDateRange(commentDates);
        Object.assign(salesByMonth, generateDatePeriod(start, end));

        // Compter les ventes par mois
        commentDates.forEach(date => {
          const monthKey = date.toISOString().slice(0, 7);
          if (salesByMonth.hasOwnProperty(monthKey)) {
            salesByMonth[monthKey]++;
          }
        });
      }

      // Convertir en format pour le graphique timeline
      data.salesTimeline = Object.entries(salesByMonth)
        .map(([date, count]) => ({
          date: date,
          ventes: count,
          mois: new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Convertir les ventes par pays en format pour le graphique
      data.salesByCountry = Object.entries(salesByCountry)
        .filter(([_, count]) => count > 0)
        .map(([country, count]) => ({
          name: country,
          value: count,
          percentage: ((count / commentDates.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.value - a.value);

      // Calcul du taux d'engagement
      data.engagementRate = data.abonnes ? (data.ventesEstimees / data.abonnes * 100).toFixed(1) : 0;
      
      // Calcul du score de performance
      data.performanceScore = calculatePerformanceScore(data);
      
      // Calcul des statistiques de performance
      data.performanceStats = calculatePerformanceStats(data);

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
    setSecondProfileText('');
    setSecondProfileData(null);
    setShowComparison(false);
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
      ['Note', `${profileData.note}/5 (${profileData.nombreEvaluations} évaluations)`],
      ['Taux d\'engagement', `${profileData.engagementRate}%`],
      ['Score de performance', `${profileData.performanceScore.total}/100`]
    ];
    
    doc.autoTable({
      startY: 45,
      head: [['Métrique', 'Valeur']],
      body: info
    });

    // Répartition géographique
    if (profileData.salesByCountry && profileData.salesByCountry.length > 0) {
      doc.setFontSize(16);
      doc.text('Répartition géographique des ventes', 20, doc.lastAutoTable.finalY + 20);

      const salesData = profileData.salesByCountry.map(item => [
        item.name,
        `${item.value} ventes (${item.percentage}%)`
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Pays', 'Ventes (pourcentage)']],
        body: salesData
      });
    }

    // Évolution des ventes
    if (profileData.salesTimeline?.length > 0) {
      doc.setFontSize(16);
      doc.text('Évolution des ventes', 20, doc.lastAutoTable.finalY + 20);

      const salesData = profileData.salesTimeline.map(item => [
        item.mois,
        item.ventes.toString()
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Période', 'Ventes']],
        body: salesData
      });
    }
    
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

  const handleCompareProfile = () => {
    try {
      if (!secondProfileText.trim()) {
        setError('Veuillez coller le contenu du second profil Vinted');
        return;
      }

      const data = parseVintedProfile(secondProfileText);
      setSecondProfileData(data);
      setShowComparison(true);
      setError('');
    } catch (err) {
      setError(err.message);
      setSecondProfileData(null);
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
                  <li><span className="font-medium">Taux d'engagement:</span> {profileData.engagementRate}%</li>
                  {profileData.lieu && <li><span className="font-medium">Lieu:</span> {profileData.lieu}</li>}
                  {profileData.note && (
                    <li>
                      <span className="font-medium">Note:</span> {profileData.note}/5 
                      {profileData.nombreEvaluations && ` (${profileData.nombreEvaluations} évaluations)`}
                    </li>
                  )}
                </ul>
              </div>

              {/* Nouvelle section pour la répartition géographique */}
              {profileData.salesByCountry && profileData.salesByCountry.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">Répartition géographique des ventes</h3>
                  <div className="space-y-2">
                    {profileData.salesByCountry.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <span className="font-medium">
                          {item.value} ventes ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Statistiques</h3>
                <div className="overflow-x-auto">
                  {/* Graphique des statistiques générales */}
                  <div className="mb-8">
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

                  {/* Graphique de répartition géographique */}
                  {profileData.salesByCountry && profileData.salesByCountry.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-medium mb-4">Répartition des ventes par pays</h4>
                      <PieChart width={600} height={300}>
                        <Pie
                          data={profileData.salesByCountry}
                          cx={300}
                          cy={150}
                          labelLine={false}
                          label={({ name, percentage }) => `${name} (${percentage}%)`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {profileData.salesByCountry.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                  )}

                  {/* Graphique d'évolution des ventes */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">Évolution des ventes</h4>
                    <LineChart
                      width={800}
                      height={300}
                      data={profileData.salesTimeline}
                      margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="mois" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="ventes" 
                        stroke="#3B82F6" 
                        name="Ventes"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </div>
                </div>
              </div>
            </div>

            {/* Section de comparaison */}
            {!showComparison ? (
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Comparer avec un autre profil</h3>
                <textarea
                  className="w-full h-48 p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Collez ici le contenu du second profil Vinted..."
                  value={secondProfileText}
                  onChange={(e) => setSecondProfileText(e.target.value)}
                />
                <button
                  className="w-full bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors"
                  onClick={handleCompareProfile}
                >
                  Comparer les profils
                </button>
              </div>
            ) : (
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Comparaison des profils</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">{profileData.boutique}</h4>
                    <ul className="space-y-2">
                      <li>Ventes: {profileData.ventesEstimees}</li>
                      <li>Taux d'engagement: {profileData.engagementRate}%</li>
                      <li>Score de performance: {profileData.performanceScore.total}/100</li>
                      <li>Note: {profileData.note}/5</li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">{secondProfileData.boutique}</h4>
                    <ul className="space-y-2">
                      <li>Ventes: {secondProfileData.ventesEstimees}</li>
                      <li>Taux d'engagement: {secondProfileData.engagementRate}%</li>
                      <li>Score de performance: {secondProfileData.performanceScore.total}/100</li>
                      <li>Note: {secondProfileData.note}/5</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-bold mb-4">Comparaison des ventes</h4>
                  <LineChart
                    width={800}
                    height={300}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="mois" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey={profileData.boutique}
                      data={profileData.salesTimeline}
                      stroke="#3B82F6" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={secondProfileData.boutique}
                      data={secondProfileData.salesTimeline}
                      stroke="#10B981" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </div>
              </div>
            )}

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
