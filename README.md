# Mobiconnect - Assistant d'onboarding SureMDM

## 1. Structure du projet

```
mobiconnect-onboarding/
  playwright-agent/        <- petit serveur qui pilote un navigateur (Modules C, D, E)
    server.js
    lib/
      browser.js            login SureMDM Hub
      createClient.js        creation du client (Module C)
      applyTemplates.js      creation des groupes/jobs (Module E)
    templates/
      groups/*.json           arborescences de groupes par secteur (Module B)
      jobs/*.json              listes de jobs par secteur (Module B)
    .env.example
    package.json
  n8n-workflows/            <- l'orchestration (Modules A, B, D, F)
    01-intake-form-and-tracker.json
    02-orchestrator-create-client.json
    03-human-checkpoint.json
    04-apply-templates-and-report.json
```

## 2. Installation (une seule fois)

```bash
# a) verifier Node.js (18+)
node -v

# b) installer n8n globalement
npm install -g n8n

# c) installer les dependances de l'agent Playwright
cd playwright-agent
npm install
npx playwright install chromium

# d) creer votre fichier de config reel
cp .env.example .env
# puis ouvrez .env et remplissez SUREMDM_HUB_URL, SUREMDM_USERNAME, SUREMDM_PASSWORD
```

## 3. Adapter les selecteurs (etape obligatoire, une fois)

Le code contient des selecteurs "placeholder" (`#username`, `[name="companyName"]`, etc.)
parce que je n'ai pas acces a l'interface reelle de SureMDM Hub. Pour les remplacer :

1. Mettez `HEADLESS=false` dans `.env`
2. Lancez `npm start` dans `playwright-agent/`
3. Testez avec `curl` (exemple plus bas) pour voir le vrai navigateur s'ouvrir
4. Faites clic droit -> Inspecter sur chaque champ reel du formulaire SureMDM,
   copiez son attribut `id` ou `name`, et remplacez dans `lib/browser.js`,
   `lib/createClient.js` et `lib/applyTemplates.js`
5. Remettez `HEADLESS=true` une fois que ca fonctionne

## 4. Lancer le projet

Ouvrez 2 terminaux dans VS Code.

**Terminal 1 - l'agent Playwright :**
```bash
cd playwright-agent
npm start
# -> "Onboarding agent listening on http://localhost:4000"
```

Testez qu'il repond :
```bash
curl http://localhost:4000/health
# -> {"ok":true}
```

**Terminal 2 - n8n :**
```bash
n8n start
# -> ouvre http://localhost:5678 dans votre navigateur
```

## 5. Importer les workflows dans n8n

Dans l'interface n8n (http://localhost:5678) :

1. Workflows -> Import from File -> choisissez `01-intake-form-and-tracker.json`
2. Repetez pour les fichiers 02, 03 et 04
3. Dans chaque workflow importe, ouvrez les noeuds **Airtable** et **Gmail** et
   remplacez les identifiants (credentials) par les votres :
   - Airtable : creez un Personal Access Token sur airtable.com, collez-le dans
     la credential "Airtable account"
   - Gmail : connectez votre compte via OAuth2 (bouton "Sign in with Google")
4. Remplacez `REPLACE_WITH_YOUR_BASE_ID` par l'ID de votre base Airtable
   (visible dans l'URL de votre base, commence par `app...`)
5. Activez (toggle "Active") les workflows 02, 03 et 04. Le workflow 01
   (formulaire) peut rester actif en permanence aussi.

## 6. Tester le flux complet

1. Ouvrez l'URL du formulaire du workflow 01 (bouton "Test Workflow" ou "Production URL")
2. Remplissez-le avec un client de test
3. Verifiez que la ligne apparait dans Airtable avec `status = nouveau`
4. Attendez (ou declenchez manuellement) le workflow 02 -> le statut doit
   passer a `serveur_cree`, `bloque_captcha` ou `erreur`
5. Si `bloque_captcha`, resolvez manuellement le captcha dans le navigateur,
   puis appelez `http://localhost:5678/webhook/resume-onboarding` pour reprendre
6. Le workflow 04 applique ensuite les templates et vous envoie un rapport par email

## 7. Notes

- Les mots de passe generes dans les workflows (`workEmail + "-Init1!"`) sont un
  exemple simple -- remplacez par votre propre politique de mots de passe.
- Ajoutez d'autres secteurs en creant simplement un nouveau fichier dans
  `templates/groups/` et `templates/jobs/` avec le meme nom (ex: `industrie.json`).
