// Variable to store the loaded users array
let users = [];

// Grab DOM elements
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusMsg = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Step 3 & 4: Render function to draw users or show empty state
function renderUsers(list) {
  // Clear any existing list items first
  usersList.textContent = "";

  // Step 4 requirement: show fallback text if array is empty
  if (list.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "No users match your filter.";
    usersList.appendChild(emptyItem);
    return;
  }

  list.forEach((user) => {
    const li = document.createElement("li");

    const nameP = document.createElement("p");
    nameP.textContent = `Name: ${user.name}`;

    const emailP = document.createElement("p");
    emailP.textContent = `Email: ${user.email}`;

    const cityP = document.createElement("p");
    cityP.textContent = `City: ${user.address ? user.address.city : "N/A"}`;

    const companyP = document.createElement("p");
    companyP.textContent = `Company: ${user.company ? user.company.name : "N/A"}`;

    li.appendChild(nameP);
    li.appendChild(emailP);
    li.appendChild(cityP);
    li.appendChild(companyP);

    usersList.appendChild(li);
  });
}

// Step 2: Fetch users function
async function loadUsers() {
  loadBtn.disabled = true;
  statusMsg.textContent = "Loading users...";
  usersList.textContent = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    users = await response.json();
    statusMsg.textContent = "Users loaded successfully!";
    renderUsers(users);
  } catch (error) {
    statusMsg.textContent = `Error loading users: ${error.message}`;
  } finally {
    loadBtn.disabled = false;
  }
}

// Attach event listeners
loadBtn.addEventListener("click", loadUsers);

// Step 4: Real-time case-insensitive filter
filterInput.addEventListener("input", (event) => {
  const searchTerm = event.target.value.toLowerCase().trim();
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );
  renderUsers(filteredUsers);
});