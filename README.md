# Mobiconnect - Assistant d'onboarding SureMDM

Ce projet automatise la création des nouveaux clients sur SureMDM Cloud : un formulaire recueille les infos, tout est suivi dans une base Airtable, et un petit robot (Playwright) va cliquer à notre place dans SureMDM Hub. n8n fait le lien entre tout ça.

## 1. Comment le projet est organisé

```
mobiconnect-onboarding/
  playwright-agent/        <- le robot qui pilote le navigateur (Modules C, D, E)
    server.js
    lib/
      browser.js            connexion à SureMDM Hub
      createClient.js        création du client (Module C)
      applyTemplates.js      création des groupes/jobs (Module E)
    templates/
      groups/*.json           arborescences de groupes par secteur (Module B)
      jobs/*.json              listes de jobs par secteur (Module B)
    .env.example
    package.json
  n8n-workflows/            <- le chef d'orchestre (Modules A, B, D, F)
    01-intake-form-and-tracker.json
    02-orchestrator-create-client.json
    03-human-checkpoint.json
    04-apply-templates-and-report.json
```

## 2. Installation (à faire une seule fois)

D'abord, on vérifie que Node.js est bien installé :
```bash
node -v
```

Ensuite on installe n8n globalement sur la machine :
```bash
npm install -g n8n
```

Puis les dépendances du robot Playwright :
```bash
cd playwright-agent
npm install
npx playwright install chromium
```

Et enfin, on crée le vrai fichier de configuration (celui avec les vrais identifiants, jamais partagé sur GitHub) :
```bash
cp .env.example .env
```
Ouvre `.env` et remplis `SUREMDM_HUB_URL`, `SUREMDM_USERNAME` et `SUREMDM_PASSWORD` avec tes vraies infos.

## 3. Adapter les sélecteurs (étape obligatoire, une seule fois)

Le code contient des sélecteurs "provisoires" (`#username`, `[name="companyName"]`, etc.) parce que je n'avais pas accès à l'interface réelle de SureMDM Hub en l'écrivant. Il faut les remplacer par les vrais avant que ça marche :

1. Mets `HEADLESS=false` dans `.env` — comme ça tu vas voir le navigateur s'ouvrir en vrai, pas juste tourner en arrière-plan
2. Lance `npm start` dans `playwright-agent/`
3. Teste avec `curl` pour déclencher une action et regarder ce que fait le navigateur
4. Sur chaque champ réel du formulaire SureMDM, fais clic droit -> Inspecter, récupère son `id` ou `name`, et remplace-le dans `lib/browser.js`, `lib/createClient.js` et `lib/applyTemplates.js`
5. Une fois que tout marche, remets `HEADLESS=true`

## 4. Lancer le projet

Ouvre 2 terminaux dans VS Code.

**Terminal 1 — le robot Playwright :**
```bash
cd playwright-agent
npm start
```
Tu devrais voir : `Onboarding agent listening on http://localhost:4000`

Pour vérifier qu'il répond bien :
```bash
curl http://localhost:4000/health
```
Ça doit renvoyer `{"ok":true}`.

**Terminal 2 — n8n :**
```bash
n8n start
```
Ça ouvre l'interface sur `http://localhost:5678`.

## 5. Importer les workflows dans n8n

Une fois dans l'interface n8n :

1. Workflows -> Import from File -> choisis `01-intake-form-and-tracker.json`
2. Fais pareil pour les fichiers 02, 03 et 04
3. Dans chaque workflow, ouvre les nœuds **Airtable** et **Gmail** et connecte tes propres identifiants :
   - Airtable : crée un Personal Access Token sur airtable.com, colle-le dans la credential
   - Gmail : connecte ton compte via le bouton "Sign in with Google"
4. Remplace `REPLACE_WITH_YOUR_BASE_ID` par l'ID de ta base Airtable (tu le trouves dans l'URL de ta base, ça commence par `app...`)
5. Active les workflows 02, 03 et 04 (le petit interrupteur "Active"). Le 01 (le formulaire) peut rester actif en permanence aussi.

## 6. Tester le flux complet

1. Ouvre l'URL du formulaire du workflow 01
2. Remplis-le avec un client fictif, pour voir
3. Vérifie que la ligne apparaît bien dans Airtable avec le statut `nouveau`
4. Le workflow 02 va se déclencher (automatiquement ou en manuel) et faire passer le statut à `serveur_cree`, `bloque_captcha` ou `erreur`
5. Si ça tombe sur `bloque_captcha`, résous le CAPTCHA à la main dans le navigateur, puis appelle `http://localhost:5678/webhook/resume-onboarding` pour relancer la suite
6. Le workflow 04 applique ensuite les templates et envoie un petit rapport par email

## 7. Petites notes en passant

- Les mots de passe générés automatiquement (`workEmail + "-Init1!"`) sont juste un exemple simple pour que ça tourne — à remplacer par ta propre politique de mots de passe le moment venu
- Pour ajouter un nouveau secteur, il suffit de créer un nouveau fichier dans `templates/groups/` et `templates/jobs/` avec le même nom (par exemple `industrie.json`)
- Le fichier `.env` ne doit jamais être partagé ni pushé sur GitHub — c'est là que vivent les vrais mots de passe
