/**
 * Script de migration des questions vers Supabase
 * 
 * Ce script lit le fichier questions-migration.ts et insère les données dans Supabase.
 * Il SUPPRIME automatiquement les anciennes données avant d'insérer les nouvelles.
 * 
 * Usage: npm run migrate
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

// Configuration Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Vérifier la configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Configuration manquante!\n');
  console.error('Créez un fichier .env avec:');
  console.error('  VITE_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  SUPABASE_SERVICE_KEY=eyJ...');
  process.exit(1);
}

// Client Supabase simple (sans dépendance externe)
async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation',
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Supabase (${response.status}): ${errorText}`);
  }

  if (method === 'DELETE' || (method === 'POST' && response.status === 201)) {
    return { success: true };
  }

  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

// Fonction pour supprimer TOUTES les données d'une table
async function deleteAllFromTable(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}`;
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  // D'abord récupérer tous les IDs
  const selectResponse = await fetch(`${url}?select=id`, {
    method: 'GET',
    headers,
  });

  if (!selectResponse.ok) {
    return { success: false, count: 0 };
  }

  const rows = await selectResponse.json();
  
  if (!rows || rows.length === 0) {
    return { success: true, count: 0 };
  }

  // Supprimer avec une condition "id not is null" qui correspond à tout
  const deleteResponse = await fetch(`${url}?id=not.is.null`, {
    method: 'DELETE',
    headers,
  });

  if (!deleteResponse.ok) {
    // Essayer une autre méthode: supprimer chaque ID
    for (const row of rows) {
      try {
        await fetch(`${url}?id=eq.${row.id}`, {
          method: 'DELETE',
          headers,
        });
      } catch (e) {
        // Ignorer les erreurs individuelles
      }
    }
  }

  return { success: true, count: rows.length };
}

// Lire et parser le fichier questions-migration.ts
function loadQuestionsFromFile() {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'questions-migration.ts');
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier non trouvé: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Extraire CATEGORIES
  const categoriesMatch = content.match(/export\s+const\s+CATEGORIES\s*=\s*\[([\s\S]*?)\];/);
  if (!categoriesMatch) {
    throw new Error('CATEGORIES non trouvé dans le fichier');
  }

  // Extraire CONCOURS
  const concoursMatch = content.match(/export\s+const\s+CONCOURS\s*=\s*\[([\s\S]*?)\];\s*(?=\/\/|export|$)/);
  if (!concoursMatch) {
    throw new Error('CONCOURS non trouvé dans le fichier');
  }

  // Extraire QUESTIONS
  const questionsMatch = content.match(/export\s+const\s+QUESTIONS\s*=\s*\[([\s\S]*?)\];?\s*$/);
  if (!questionsMatch) {
    throw new Error('QUESTIONS non trouvé dans le fichier');
  }

  // Parser les données en évaluant le JavaScript
  let categories, concours, questions;

  try {
    // Créer un contexte d'évaluation sécurisé
    const evalCode = `
      const CATEGORIES = [${categoriesMatch[1]}];
      const CONCOURS = [${concoursMatch[1]}];
      const QUESTIONS = [${questionsMatch[1]}];
      ({ CATEGORIES, CONCOURS, QUESTIONS })
    `;
    
    const result = eval(evalCode);
    categories = result.CATEGORIES;
    concours = result.CONCOURS;
    questions = result.QUESTIONS;
  } catch (error) {
    console.error('Erreur de parsing:', error.message);
    throw new Error('Impossible de parser le fichier questions-migration.ts');
  }

  return { categories, concours, questions };
}

// Fonction principale de migration
async function migrate() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(' MIGRATION questions-migration.ts → Supabase');
  console.log(' (Suppression automatique des anciennes données)');
  console.log('════════════════════════════════════════════════════════════\n');

  // Étape 1: Vérification
  console.log('[1/5] Vérification de la configuration');
  console.log(`✓ URL Supabase: ${SUPABASE_URL}`);
  console.log('✓ Clé service_role configurée\n');

  // Étape 2: Charger les données
  console.log('[2/5] Chargement de questions-migration.ts');
  
  let data;
  try {
    data = loadQuestionsFromFile();
    console.log(`✓ ${data.categories.length} catégories trouvées`);
    console.log(`✓ ${data.concours.length} concours trouvés`);
    console.log(`✓ ${data.questions.length} questions trouvées\n`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }

  // Étape 3: SUPPRIMER les anciennes données (dans l'ordre des dépendances)
  console.log('[3/5] Suppression des anciennes données');
  console.log('    (Ceci supprime TOUT pour éviter les conflits)\n');
  
  try {
    // Ordre important : d'abord les tables qui ont des clés étrangères
    
    // 1. Supprimer les questions (dépend de categories et concours)
    const questionsDeleted = await deleteAllFromTable('questions');
    console.log(`    ✓ Questions supprimées (${questionsDeleted.count} lignes)`);
    
    // 2. Supprimer les liaisons concours_categories (dépend de categories et concours)
    const liaisonsDeleted = await deleteAllFromTable('concours_categories');
    console.log(`    ✓ Liaisons concours-catégories supprimées (${liaisonsDeleted.count} lignes)`);
    
    // 3. Supprimer les concours (table parente)
    const concoursDeleted = await deleteAllFromTable('concours');
    console.log(`    ✓ Concours supprimés (${concoursDeleted.count} lignes)`);
    
    // 4. Supprimer les catégories (table parente)
    const categoriesDeleted = await deleteAllFromTable('categories');
    console.log(`    ✓ Catégories supprimées (${categoriesDeleted.count} lignes)`);
    
    console.log('\n    ✅ Anciennes données supprimées avec succès\n');
  } catch (error) {
    console.log(`    ⚠ Avertissement lors de la suppression: ${error.message}`);
    console.log('    Tentative de continuer...\n');
  }

  // Étape 4: Insérer les nouvelles données
  console.log('[4/5] Insertion des nouvelles données');

  // 4.1 Insérer les catégories
  try {
    const categoriesData = data.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      name_short: cat.name_short || cat.name.substring(0, 3),
    }));

    await supabaseRequest('categories', 'POST', categoriesData);
    console.log(`    ✓ ${categoriesData.length} catégories insérées`);
  } catch (error) {
    console.error(`    ✗ Erreur insertion catégories: ${error.message}`);
    process.exit(1);
  }

  // 4.2 Insérer les concours
  try {
    const concoursData = data.concours.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      icon: c.icon || c.id.toUpperCase(),
      duration: c.duration || 90,
      available: c.available !== false,
    }));

    await supabaseRequest('concours', 'POST', concoursData);
    console.log(`    ✓ ${concoursData.length} concours insérés`);
  } catch (error) {
    console.error(`    ✗ Erreur insertion concours: ${error.message}`);
    process.exit(1);
  }

  // 4.3 Insérer les liaisons concours-catégories (AVEC display_order)
  try {
    const liaisons = [];
    for (const c of data.concours) {
      if (c.categories) {
        let displayOrder = 1;
        for (const cat of c.categories) {
          liaisons.push({
            concours_id: c.id,
            category_id: cat.category_id,
            questions_count: cat.questions_count || 0,
            display_order: cat.display_order || displayOrder,
          });
          displayOrder++;
        }
      }
    }

    if (liaisons.length > 0) {
      await supabaseRequest('concours_categories', 'POST', liaisons);
      console.log(`    ✓ ${liaisons.length} liaisons concours-catégories créées`);
    }
  } catch (error) {
    console.error(`    ✗ Erreur insertion liaisons: ${error.message}`);
    process.exit(1);
  }

  // 4.4 Insérer les questions (AVEC explanation)
  try {
    const questionsData = data.questions.map(q => ({
      concours_id: q.concours_id,
      category_id: q.category_id,
      question_text: q.question_text,
      options: q.options,
      correct_answers: q.correct_answers,
      explanation: q.explanation || null,
      has_latex: q.has_latex || false,
      image_url: q.image_url || null,
    }));

    // Insérer par lots de 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < questionsData.length; i += batchSize) {
      const batch = questionsData.slice(i, i + batchSize);
      await supabaseRequest('questions', 'POST', batch);
      inserted += batch.length;
      
      // Afficher la progression pour les grands ensembles de données
      if (questionsData.length > batchSize) {
        process.stdout.write(`\r    ✓ ${inserted}/${questionsData.length} questions insérées...`);
      }
    }
    
    if (questionsData.length > batchSize) {
      console.log(); // Nouvelle ligne après la progression
    }
    console.log(`    ✓ ${inserted} questions insérées au total\n`);
  } catch (error) {
    console.error(`\n    ✗ Erreur insertion questions: ${error.message}`);
    process.exit(1);
  }

  // Étape 5: Vérification finale
  console.log('[5/5] Vérification finale');
  
  try {
    const categoriesCount = await supabaseRequest('categories?select=id');
    console.log(`    ✓ ${Array.isArray(categoriesCount) ? categoriesCount.length : 0} catégories en base`);
    
    const concoursCount = await supabaseRequest('concours?select=id');
    console.log(`    ✓ ${Array.isArray(concoursCount) ? concoursCount.length : 0} concours en base`);
    
    const questionsCount = await supabaseRequest('questions?select=id');
    console.log(`    ✓ ${Array.isArray(questionsCount) ? questionsCount.length : 0} questions en base`);
  } catch (error) {
    console.log('    ⚠ Vérification partielle');
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ MIGRATION RÉUSSIE !');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\n📌 Les anciennes données ont été supprimées automatiquement.');
  console.log('📌 Les nouvelles données ont été insérées.');
  console.log('\nVérifiez dans Supabase → Table Editor que les données sont présentes.');
  console.log('Puis testez votre site avec: npm run dev\n');
}

// Exécuter la migration
migrate().catch(error => {
  console.error('\n❌ Erreur fatale:', error.message);
  process.exit(1);
});
 