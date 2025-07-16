# KEYVOLUTION

<p>
  <img align="center" height=120 src="https://github.com/josoavj/keyvolution/blob/main/assets/Logo%20Keyvolution.png" alt="KEYVOLUTION's logo"/>
</p>

## About

- **Description:** A piano learning software, intended for those who are beginners in this field and also those who want to improve their skills.
- **Language:** JavaScript (ElectronJs framework)
- **Techno:** Strapi, basic-pitch-ts by Spotify
- **Database:** Strapi Headless CMS

### 📂 Structuration du projet

```
keyvolution/                # Dossier principal
├── Design                  # Design et prototype de l'application
├── backend/                # Depôt du backend de l'application (Strapi)
├── src/                    # Dépôt des codes
    ├── index.html          # Page principale de l'UI
    ├── style.css           # Feuille de style pour l'interface
├── src/api/
    ├── songs.js                 # Gestion des API liés aux musiques(Create and Read)
    ├── users.js                 # Gestion des API liés aux utilisateurs(Create and Read)
    └── musicProcessor.js        # Gestion des transcriptions en partitions
├── main.js             # Point d'entrée principal de l'application
├── ipcHandlers.js      # Gestion des communications entre le Main Process et le Renderer Process
└── config.js           # Configuration génerale de l'application 
└── README.md               # Documentation
```
## How ?

By scalling the music and transform them into simple partitions, easy to learn for anyone. Besides, it can be connected to a real piano or any virtual piano device and track the user's tales in realtime, see if they make mistakes, their paces, and so on
The AI model is strongly inspired by Google Magenta
  

### 📃 Licence

Ce projet est libre de droits et peut être utilisé pour des projets personnels et commerciaux.
