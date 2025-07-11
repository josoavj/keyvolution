export async function fetchUsers() {
  try {
    const res = await fetch('http://localhost:1337/api/utilisateurs?populate=*');
    const data = await res.json();

    const users = Array.from(data.data);
    console.log(users);
    const container = document.getElementById('profile');

    container.innerHTML = "";  // On vide l'ancien contenu

    for (let i = 0; i < users.length; i++) {
      const user = users[i] || {};  // Selon Strapi, les données sont souvent sous "attributes"
      const username = user.Username || "No username";
      const email = user.Email || "No email";
      console.log(username)
      const avatarObj = user.Avatar || {};
      const avatarUrl = avatarObj.formats?.thumbnail?.url || avatarObj.url;
      const fullAvatarUrl = avatarUrl ? `http://localhost:1337${avatarUrl}` : "../Design/Avatar.png";
      console.log(fullAvatarUrl)
      const img = document.createElement("img");
      img.src = fullAvatarUrl;
      img.alt = username;
      img.width = 157;
      img.height = 157;
      img.className = "rounded-full";  // Exemple avec Tailwind pour un effet rond (optionnel)

      container.appendChild(img);
    }
  } catch (err) {
    console.error("Erreur lors de la récupération :", err);
    alert("Erreur de récupération des utilisateurs.");
  }
}

export async function fetchUsers2() {
  try {
    const res = await fetch('http://localhost:1337/api/utilisateurs?populate=*');
    const data = await res.json();

    const users = Array.from(data.data);
    const container = document.getElementById('user-container');
    container.innerHTML = "";  // Vide le conteneur avant ajout

    for (let i = 0; i < users.length; i++) {
      const user = users[i] || {};
      const username = user.Username || "Inconnu";
      const email = user.Email || "No email";

      const avatarObj = user.Avatar || {};
      const avatarUrl = avatarObj.formats?.thumbnail?.url || avatarObj.url;
      const fullAvatarUrl = avatarUrl ? `http://localhost:1337${avatarUrl}` : "../Design/Avatar.png";

      // Création de la carte utilisateur
      const li = document.createElement("li");
      li.className = "flex items-center space-x-3 mb-4";

      li.innerHTML = `
        <div class=" text-white shadow-2xl max-w-sm">
        <!-- En-tête avec nom principal -->
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-white mb-1">${username}</h2>
            <p class="text-sm text-gray-400 mt-1">${email}</p>
        </div>

        <!-- Section du bas avec avatar et barre de progression -->
        <div class="flex items-center justify-between">
            <div class="flex flex-col">
            <span class="text-sm text-gray-300 mb-2">Progrès global</span>
            <div class="w-48 h-2 bg-gray-600 rounded-full overflow-hidden">
                <div class="h-full bg-blue-400 rounded-full transition-all duration-300" style="width: 85%;"></div>
            </div>
            </div>
            <div class="flex-shrink-0 ml-4">
            <img src="${fullAvatarUrl}" alt="${username}" class="rounded-full w-16 h-16 object-cover border-3 border-gray-400 shadow-lg">
            </div>
        </div>
        </div>
      `;

      container.appendChild(li);
    }
  } catch (err) {
    console.error("Erreur lors de la récupération :", err);
  }
}
