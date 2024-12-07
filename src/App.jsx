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
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

    const ratingScore = (data.note / 5) * 100;
    const salesScore = Math.min(100, (Math.log10(data.ventesEstimees) / Math.log10(1000)) * 100);
    const engagementScore = data.abonnes ? Math.min(100, (data.ventesEstimees / data.abonnes) * 100) : 50;

    let consistencyScore = 50;
    if (data.salesTimeline && data.salesTimeline.length > 0) {
      const salesValues = data.salesTimeline.map(item => item.ventes);
      const mean = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
      const stdDev = Math.sqrt(salesValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / salesValues.length);
      const cv = stdDev / mean;
      consistencyScore = Math.max(0, 100 - (cv * 100));
    }

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
    
    const trend = sales.reduce((acc, curr, idx) => {
      if (idx === 0) return 0;
      return acc + (curr - sales[idx - 1]);
    }, 0) / (sales.length - 1);

    const lastMonthSales = sales[sales.length - 1];
    const prediction = Math.max(0, Math.round(lastMonthSales + trend));

    return {
      avgSalesPerMonth: Math.round(avgSalesPerMonth),
      bestMonth: bestMonth,
      trend: trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'stable',
      prediction: prediction
    };
  };

  const convertRelativeDateToAbsolute = (relativeDate) => {
    const now = new Date();
    const parts = relativeDate.toLowerCase().match(/(\d+)\s+(minute|heure|jour|semaine|mois|an|années|ans)/);
    
    if (!parts) return null;
    
    const amount = parseInt(parts[1]);
    const unit = parts[2];
    
    let date = new Date(now);
    
    switch (unit) {
      case 'minute': date.setMinutes(date.getMinutes() - amount); break;
      case 'heure': date.setHours(date.getHours() - amount); break;
      case 'jour': date.setDate(date.getDate() - amount); break;
      case 'semaine': date.setDate(date.getDate() - (amount * 7)); break;
      case 'mois': date.setMonth(date.getMonth() - amount); break;
      case 'an':
      case 'ans':
      case 'années': date.setFullYear(date.getFullYear() - amount); break;
    }
    
    return date;
  };
  const parseVintedProfile = (text) => {
    try {
      const data = {};

      // Analyse des articles et prix
      const prices = [];
      const articles = [];
      const brands = new Set();

      // Extraction du nom de la boutique
      const boutiquePattern = /Boutique:\s*(\S+)|^([^\s\n]+)\s*À propos/m;
      const boutiqueMatch = text.match(boutiquePattern);
      if (boutiqueMatch) {
        data.boutique = boutiqueMatch[1] || boutiqueMatch[2];
      }

      // Extraction du nombre d'articles total
      const articlesPattern = /(\d+)\s*articles/;
      const articlesMatch = text.match(articlesPattern);
      if (articlesMatch) {
        data.totalArticles = parseInt(articlesMatch[1]);
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

      // Parcourir les lignes pour extraire les prix et marques
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extraction des prix
        const priceMatch = line.match(/prix : (\d+,?\d*) €/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'));
          prices.push(price);
        }

        // Extraction des marques
        const brandMatch = line.match(/marque : ([^,]+),/);
        if (brandMatch) {
          brands.add(brandMatch[1].trim());
        }
      }

      // Ajouter les statistiques des articles
      data.articleStats = {
        numberOfArticles: prices.length,
        averagePrice: prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 0,
        totalRevenue: prices.reduce((a, b) => a + b, 0).toFixed(2),
        uniqueBrands: Array.from(brands),
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices)
        }
      };

      // Analyse temporelle des ventes
      const salesByMonth = {};
      const timePeriod = 12;
      
      for (let i = 0; i < timePeriod; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        salesByMonth[monthKey] = 0;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('il y a')) {
          const timeMatch = line.match(/il y a ([^*\n]+)/i);
          if (timeMatch && !line.includes('Vinted')) {
            const absoluteDate = convertRelativeDateToAbsolute(timeMatch[1]);
            if (absoluteDate) {
              const monthKey = absoluteDate.toISOString().slice(0, 7);
              if (salesByMonth.hasOwnProperty(monthKey)) {
                salesByMonth[monthKey]++;
              }
            }
          }
        }
      }

      data.salesTimeline = Object.entries(salesByMonth)
        .map(([date, count]) => ({
          date: date,
          ventes: count,
          mois: new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

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
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* ... Code existant jusqu'à profileData ... */}

      {profileData && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Résultats de l'analyse</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Section informations générales existante */}
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

            {/* Nouvelle section statistiques des articles */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2">Statistiques des articles</h3>
              <ul className="space-y-2">
                <li>
                  <span className="font-medium">Nombre d'articles:</span>{' '}
                  {profileData.articleStats.numberOfArticles} articles
                </li>
                <li>
                  <span className="font-medium">Prix moyen:</span>{' '}
                  {profileData.articleStats.averagePrice}€
                </li>
                <li>
                  <span className="font-medium">Chiffre d'affaires potentiel:</span>{' '}
                  {profileData.articleStats.totalRevenue}€
                </li>
                <li>
                  <span className="font-medium">Gamme de prix:</span>{' '}
                  {profileData.articleStats.priceRange.min}€ - {profileData.articleStats.priceRange.max}€
                </li>
                <li>
                  <span className="font-medium">Marques vendues:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profileData.articleStats.uniqueBrands.map((brand, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {brand}
                      </span>
                    ))}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ... Reste du code existant (Score de performance, etc.) ... */}

          {/* Modifier la section de génération PDF pour inclure les nouvelles stats */}
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

      {/* ... Reste du JSX (Comparaison, etc.) ... */}
    </div>
  );
};

export default App;
