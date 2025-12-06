// public/app.js

// 1) Load links into the table
async function loadLinks() {
  try {
    const res = await fetch("/api/links");
    const links = await res.json();

    const tbody = document.getElementById("links-body");
    tbody.innerHTML = ""; // clear "Loading..."

    if (links.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="p-4 text-gray-500">No links yet</td>
        </tr>
      `;
      return;
    }

    for (const link of links) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="p-2 font-mono">${link.code}</td>
        <td class="p-2 truncate max-w-xs">${link.target_url}</td>
        <td class="p-2">${link.clicks}</td>
        <td class="p-2">${link.last_clicked ? new Date(link.last_clicked).toLocaleString() : "-"}</td>
        <td class="p-2">
          <div class="flex gap-2">
            <button
              class="copy-btn px-2 py-1 text-xs bg-gray-200 rounded"
              data-code="${link.code}"
            >
              Copy
            </button>
            <button
              class="delete-btn px-2 py-1 text-xs bg-red-600 text-white rounded"
              data-code="${link.code}"
            >
              Delete
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      // ✅ Copy button handler
      const copyBtn = tr.querySelector(".copy-btn");
      copyBtn.addEventListener("click", async () => {
        const code = copyBtn.getAttribute("data-code");
        const shortUrl = `${window.location.origin}/${code}`;

        try {
          await navigator.clipboard.writeText(shortUrl);
          const oldText = copyBtn.textContent;
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("bg-green-500", "text-white");
          setTimeout(() => {
            copyBtn.textContent = oldText;
            copyBtn.classList.remove("bg-green-500", "text-white");
          }, 1500);
        } catch (err) {
          console.error("Copy failed", err);
          alert("Could not copy automatically. You can copy this: " + shortUrl);
        }
      });

      // ✅ Delete button handler
      const deleteBtn = tr.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", async () => {
        const code = deleteBtn.getAttribute("data-code");
        const sure = confirm(`Delete link "${code}"?`);
        if (!sure) return;

        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting...";

        try {
          const res = await fetch(`/api/links/${code}`, {
            method: "DELETE",
          });

          if (res.ok) {
            await loadLinks(); // refresh table
          } else {
            alert("Failed to delete link.");
            deleteBtn.disabled = false;
            deleteBtn.textContent = "Delete";
          }
        } catch (err) {
          console.error("Delete error", err);
          alert("Network error while deleting.");
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Delete";
        }
      });
    }
  } catch (err) {
    console.error("Failed to load links", err);
  }
}

// 2) Handle the Create form submit
const form = document.getElementById("create-form");
const targetInput = document.getElementById("target_url");
const codeInput = document.getElementById("custom_code");
const msg = document.getElementById("form-msg");
const createBtn = document.getElementById("create-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // stop page reload

  const targetUrl = targetInput.value.trim();
  const customCode = codeInput.value.trim();

  msg.textContent = "";

  if (!targetUrl) {
    msg.textContent = "Please enter a target URL.";
    msg.className = "text-sm text-red-600 mt-2";
    return;
  }

  // disable button to prevent double-click
  createBtn.disabled = true;
  createBtn.textContent = "Creating...";

  try {
    const body = { target_url: targetUrl };
    if (customCode) {
      body.code = customCode;
    }

    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.status === 201) {
      // success
      msg.innerHTML = `✅ Created: <a class="text-blue-600 underline" href="${data.short_url}" target="_blank">${data.short_url}</a>`;
      msg.className = "text-sm text-green-600 mt-2";

      // clear inputs
      targetInput.value = "";
      codeInput.value = "";

      // reload table
      await loadLinks();
    } else {
      // API returned error (400, 409, etc.)
      msg.textContent = data.error || "Something went wrong.";
      msg.className = "text-sm text-red-600 mt-2";
    }
  } catch (err) {
    console.error("Create error", err);
    msg.textContent = "Network error. Please try again.";
    msg.className = "text-sm text-red-600 mt-2";
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create";
  }
});

// 3) Load links when page opens
loadLinks();
