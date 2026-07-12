const els = {
  locations: document.getElementById("locations"),
  dryRunBadge: document.getElementById("dry-run-badge"),
  statTotal: document.getElementById("stat-total"),
  statReady: document.getElementById("stat-ready"),
  statEmailed: document.getElementById("stat-emailed"),
  statNoEmail: document.getElementById("stat-no-email"),
  unsentCount: document.getElementById("unsent-count"),
  jobBanner: document.getElementById("job-banner"),
  jobMessage: document.getElementById("job-message"),
  jobError: document.getElementById("job-error"),
  emailSubject: document.getElementById("email-subject"),
  emailBody: document.getElementById("email-body"),
  previewBox: document.getElementById("preview-box"),
  previewTo: document.getElementById("preview-to"),
  previewSubject: document.getElementById("preview-subject"),
  previewBody: document.getElementById("preview-body"),
  leadsBody: document.getElementById("leads-body"),
  leadFilter: document.getElementById("lead-filter"),
  btnScan: document.getElementById("btn-scan"),
  btnFindEmails: document.getElementById("btn-find-emails"),
  btnSend: document.getElementById("btn-send"),
  btnSaveTemplate: document.getElementById("btn-save-template"),
  btnPreview: document.getElementById("btn-preview"),
};

let pollTimer = null;

function setButtonsDisabled(disabled) {
  [els.btnScan, els.btnFindEmails, els.btnSend, els.btnSaveTemplate, els.btnPreview].forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function renderStats(stats, settings) {
  els.statTotal.textContent = stats.total;
  els.statReady.textContent = stats.ready;
  els.statEmailed.textContent = stats.emailed;
  els.statNoEmail.textContent = stats.no_email;
  els.unsentCount.textContent = stats.unsent;
  els.locations.textContent = `Scanning: ${settings.locations.join(" · ")}`;

  if (settings.dry_run) {
    els.dryRunBadge.textContent = "Dry run — emails won't be sent";
    els.dryRunBadge.classList.remove("live");
  } else {
    els.dryRunBadge.textContent = "Live mode — emails will be sent";
    els.dryRunBadge.classList.add("live");
  }
}

function renderJob(job) {
  if (job.running) {
    els.jobBanner.classList.remove("hidden");
    els.jobMessage.textContent = job.message || `Running ${job.task}...`;
    setButtonsDisabled(true);
  } else {
    els.jobBanner.classList.add("hidden");
    setButtonsDisabled(false);
  }

  if (job.error) {
    els.jobError.textContent = job.error;
    els.jobError.classList.remove("hidden");
  } else {
    els.jobError.classList.add("hidden");
  }
}

function statusClass(status) {
  return `status status-${status}`;
}

async function loadLeads() {
  const status = els.leadFilter.value;
  const leads = await fetchJSON(`/api/leads?status=${encodeURIComponent(status)}`);

  if (!leads.length) {
    els.leadsBody.innerHTML = '<tr><td colspan="5" class="empty">No leads in this view.</td></tr>';
    return;
  }

  els.leadsBody.innerHTML = leads
    .map(
      (lead) => `
      <tr>
        <td>
          <strong>${escapeHtml(lead.name)}</strong><br>
          <span class="muted">${escapeHtml(lead.address || "")}</span>
        </td>
        <td>${lead.email ? escapeHtml(lead.email) : "—"}</td>
        <td>${lead.phone ? escapeHtml(lead.phone) : "—"}</td>
        <td>${lead.website ? `<a href="${escapeAttr(lead.website)}" target="_blank" rel="noopener">Visit</a>` : "—"}</td>
        <td><span class="${statusClass(lead.status)}">${formatStatus(lead.status)}</span></td>
      </tr>`
    )
    .join("");
}

async function refreshDashboard() {
  const data = await fetchJSON("/api/status");
  renderStats(data.stats, data.settings);
  renderJob(data.job);

  if (!els.emailSubject.dataset.loaded) {
    els.emailSubject.value = data.email_template.subject;
    els.emailBody.value = data.email_template.body;
    els.emailSubject.dataset.loaded = "true";
  }

  await loadLeads();

  if (data.job.running && !pollTimer) {
    pollTimer = setInterval(async () => {
      const status = await fetchJSON("/api/status");
      renderJob(status.job);
      renderStats(status.stats, status.settings);
      await loadLeads();
      if (!status.job.running) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 2000);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

async function startJob(url) {
  await fetchJSON(url, { method: "POST", body: "{}" });
  await refreshDashboard();
}

els.btnScan.addEventListener("click", () => startJob("/api/scan"));
els.btnFindEmails.addEventListener("click", () => startJob("/api/find-emails"));
els.btnSend.addEventListener("click", async () => {
  const unsent = Number(els.unsentCount.textContent || "0");
  if (!unsent) {
    alert("No unsent leads ready to email.");
    return;
  }
  const mode = els.dryRunBadge.classList.contains("live") ? "send" : "simulate";
  const confirmed = confirm(
    mode === "send"
      ? `Send emails to ${unsent} businesses that have not been contacted yet?`
      : `Dry run is ON. This will simulate sending to ${unsent} businesses without actually emailing them.`
  );
  if (confirmed) {
    await startJob("/api/send");
  }
});

els.btnSaveTemplate.addEventListener("click", async () => {
  await fetchJSON("/api/email-template", {
    method: "PUT",
    body: JSON.stringify({
      subject: els.emailSubject.value,
      body: els.emailBody.value,
    }),
  });
  alert("Email template saved.");
});

els.btnPreview.addEventListener("click", async () => {
  const preview = await fetchJSON("/api/preview", {
    method: "POST",
    body: JSON.stringify({
      subject: els.emailSubject.value,
      body: els.emailBody.value,
    }),
  });
  els.previewTo.textContent = `${preview.name} <${preview.to}>`;
  els.previewSubject.textContent = preview.subject;
  els.previewBody.textContent = preview.body;
  els.previewBox.classList.remove("hidden");
});

els.leadFilter.addEventListener("change", loadLeads);

refreshDashboard().catch((error) => {
  els.jobError.textContent = error.message;
  els.jobError.classList.remove("hidden");
});
