//--------------Get all songs-------------------
export async function fetchSongs() {
    try {
        const res = await fetch('http://localhost:1337/api/musiques?populate=*');
        const data = await res.json();

        const songs = Array.from(data.data); // force la conversion en vrai tableau
        console.log(songs)
        console.log(songs.length)
        const container = document.getElementById('song-grid');
        container.innerHTML = "";
        
        for (var i = 0; i < songs.length; i++) {
        console.log(songs[i])
        const title = songs[i].Title || "Titre inconnu";
        const artist = songs[i].Artist || "Artiste inconnu";

        const coverObj = songs[i].Cover;
        const coverUrl = coverObj?.formats?.thumbnail?.url || coverObj?.url;
        const fullCoverUrl = coverUrl ? `http://localhost:1337${coverUrl}` : "fallback.png";

        const card = document.createElement('div');
        card.className = "song-card";
        card.innerHTML = `
            <img src="${fullCoverUrl}" alt="${title}" width="157px" height="157px" />
            <p><strong>${title}</strong><br><em>${artist}</em></p>
        `;

        container.appendChild(card);
        //return songs
        };
    } catch (err) {
        console.error("Erreur lors de la récupération :", err);
        alert("Erreur de récupération des musiques.");
        //return []
    }
}

//---------------Create a new song----------------------
export function addSong() {
    // Empêche d'ajouter plusieurs fois le formulaire
    if (document.getElementById("song-form")) return;

    const modal = document.getElementById("songModal");
    const container = document.getElementById("modalFormContainer");

    const form = document.createElement("form");
    form.id = "song-form";
    form.enctype = "multipart/form-data";

    form.innerHTML = `
    <h2 style="text-align: center;">Ajouter une chanson</h2>
    <label>Titre : <input type="text" name="Title" required /></label>
    <label>Artiste : <input type="text" name="Artist" required /></label>
    <label>Image de couverture : <input type="file" name="Cover" accept="image/*"/></label>
    <label>Fichier audio : <input type="file" name="MusicFile" accept="audio/*" /></label>
    <div class="actions">
        <button type="submit">Ajouter</button>
        <button type="button" id="cancelBtn">Annuler</button>
    </div>
    `;

    form.addEventListener("submit", handleSongSubmit);
    container.innerHTML = ""; // Réinitialiser
    container.appendChild(form);
    modal.classList.remove("hidden");
    form.querySelector('#cancelBtn').addEventListener('click', cancelAdd);
}

export function cancelAdd() {
    const modal = document.getElementById("songModal");
    modal.classList.add("hidden");
    const form = document.getElementById("song-form");
    if (form) form.remove();
}

export async function handleSongSubmit(e) {
    e.preventDefault();
    const form = e.target;

    try {
    // 🔥 APPROCHE 2 : Upload direct avec création d'entrée
    const formData = new FormData();
    
    // Ajouter les fichiers
    if (form.Cover.files[0]) {
        formData.append('files', form.Cover.files[0]);
    }
    
    if (form.MusicFile.files[0]) {
        formData.append('files', form.MusicFile.files[0]);
    }

    // Ajouter les métadonnées pour créer l'entrée directement
    formData.append('path', 'api::musique.musique');
    formData.append('name', form.Title.value);
    
    // Données additionnelles
    formData.append('data', JSON.stringify({
        Title: form.Title.value,
        Artist: form.Artist.value
    }));

    const response = await fetch("http://localhost:1337/api/upload", {
        method: "POST",
        headers: {
        "Authorization": `Bearer 00fabc626ac81314e86ba358b3b742cdd819de4b71aed51c02e219c17715d4a39f808816a5bb6ff640d13bf040aeed7eba5c6c6010f3d86a28095181e7967452399e55eb8c50defcff5a740f05407ed1d7e5881eb76133a04006e44dff952a0e4a7a33f8a4832445d4b181a5feda876d3f50a7e85503a57f9e97a16f40042228`
        },
        body: formData
    });

    const result = await response.json();
    console.log("Réponse:", result);

    if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${JSON.stringify(result)}`);
    }

    // Ensuite, créer l'entrée avec les IDs des fichiers uploadés
    const fileIds = result.map(file => file.id);
    
    const entryData = {
        data: {
        Title: form.Title.value,
        Artist: form.Artist.value,
        Cover: fileIds[0], // Premier fichier
        MusicFile: fileIds[1] // Deuxième fichier
        }
    };

    const entryResponse = await fetch("http://localhost:1337/api/musiques", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer 00fabc626ac81314e86ba358b3b742cdd819de4b71aed51c02e219c17715d4a39f808816a5bb6ff640d13bf040aeed7eba5c6c6010f3d86a28095181e7967452399e55eb8c50defcff5a740f05407ed1d7e5881eb76133a04006e44dff952a0e4a7a33f8a4832445d4b181a5feda876d3f50a7e85503a57f9e97a16f40042228`
        },
        body: JSON.stringify(entryData)
    });

    const entryResult = await entryResponse.json();
    
    if (!entryResponse.ok) {
        throw new Error(`Erreur entrée ${entryResponse.status}: ${JSON.stringify(entryResult)}`);
    }

    alert("Musique ajoutée avec succès!");
    form.remove();
    const modal = document.getElementById("songModal");
    modal.classList.add("hidden");
    fetchPlaylist();

    } catch (err) {
    console.error("Erreur de soumission :", err);
    alert("Erreur lors de l'ajout : " + err.message);
    }
}

// Fonction utilitaire pour déboguer les FormData
export function logFormData(formData, name) {
    console.log(`--- ${name} ---`);
    for (let pair of formData.entries()) {
    console.log(pair[0], pair[1] instanceof File ? `File: ${pair[1].name} (${pair[1].size} bytes)` : pair[1]);
    }
}

//------------CRUD for playlists----------------


//fonction fetchPlaylist pour stocker les musiques
export async function fetchPlaylist() {
try {
    const res = await fetch('http://localhost:1337/api/musiques?populate=*');
    const data = await res.json();

    songs = data.data; // 🔥 Stocker les musiques dans la variable globale

    // 🔀 Mélanger les musiques (shuffle)
    songs = songs.sort(() => Math.random() - 0.5);

    // 📦 Conteneur de la playlist
    const container = document.getElementById("playlist-container");
    container.innerHTML = "";

    // 🔢 Nombre de musiques à afficher (optionnel car scrollable)
    const limit = songs.length;
    for (let i = 0; i < limit; i++) {
    const song = songs[i];
    const title = song.Title || "Titre inconnu";
    const artist = song.Artist || "Artiste inconnu";

    const coverObj = song.Cover;
    const coverUrl = coverObj?.formats?.thumbnail?.url || coverObj?.url;
    const fullCoverUrl = coverUrl ? `http://localhost:1337${coverUrl}` : "../../Design/Ellipse.png";

    const li = document.createElement("li");
    li.innerHTML = `
        <img src="${fullCoverUrl}" alt="cover" class="play-cover" />
        <span>${(i + 1).toString().padStart(2, '0')}</span>
        <div>
        <p>${title}</p>
        <small>${artist}</small>
        <div class="progress-bar"><div class="progress"></div></div>
        </div>
        <button class="play-btn" onclick="playSong(${i})">
        <img src="../../Design/icons/play-btn.png" alt="play" width="30px" height="30px"/>
        </button>
    `;
    container.appendChild(li);
    //return songs
    }
} catch (err) {
    console.error("Erreur lors de la récupération :", err);
    //return []
}
}

// Appeler la fonction au chargement
document.addEventListener("DOMContentLoaded", fetchPlaylist);