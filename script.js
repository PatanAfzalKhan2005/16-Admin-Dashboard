const THEME_KEY = "nova_admin_theme";
const USERS_KEY = "nova_admin_users";
const PAGE_SIZE = 6;

const seedUsers = [
	{
		id: "USR-1001",
		name: "Ava Harper",
		email: "ava.harper@novacore.io",
		role: "Admin",
		status: "Active"
	},
	{
		id: "USR-1002",
		name: "Liam Price",
		email: "liam.price@novacore.io",
		role: "Editor",
		status: "Active"
	},
	{
		id: "USR-1003",
		name: "Nora Kim",
		email: "nora.kim@novacore.io",
		role: "Analyst",
		status: "Inactive"
	},
	{
		id: "USR-1004",
		name: "Ethan Brooks",
		email: "ethan.brooks@novacore.io",
		role: "Viewer",
		status: "Active"
	},
	{
		id: "USR-1005",
		name: "Maya Castillo",
		email: "maya.castillo@novacore.io",
		role: "Editor",
		status: "Active"
	},
	{
		id: "USR-1006",
		name: "Leo Wagner",
		email: "leo.wagner@novacore.io",
		role: "Analyst",
		status: "Inactive"
	},
	{
		id: "USR-1007",
		name: "Sofia Patel",
		email: "sofia.patel@novacore.io",
		role: "Viewer",
		status: "Active"
	}
];

class ThemeManager {
	constructor(toggle) {
		this.toggle = toggle;
	}

	init() {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const stored = localStorage.getItem(THEME_KEY) || (prefersDark ? "dark" : "light");
		this.setTheme(stored);
		if (this.toggle) {
			this.toggle.addEventListener("click", () => {
				const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
				this.setTheme(next);
				localStorage.setItem(THEME_KEY, next);
			});
		}
	}

	setTheme(mode) {
		document.documentElement.dataset.theme = mode;
		const label = this.toggle?.querySelector("span");
		if (label) {
			label.textContent = mode === "dark" ? "Dark" : "Light";
		}
	}
}

class ModalManager {
	constructor(modal) {
		this.modal = modal;
		this.form = modal?.querySelector("[data-modal-form]");
		this.title = modal?.querySelector("[data-modal-title]");
		this.activeId = null;
		this.onSave = null;
	}

	init({ onSave }) {
		this.onSave = onSave;
		this.modal?.querySelectorAll("[data-close-modal]").forEach((button) => {
			button.addEventListener("click", () => this.close());
		});
		this.modal?.addEventListener("click", (event) => {
			if (event.target === this.modal) {
				this.close();
			}
		});
		this.form?.addEventListener("submit", (event) => {
			event.preventDefault();
			const data = new FormData(this.form);
			const payload = {
				id: this.activeId || `USR-${Date.now()}`,
				name: String(data.get("name")),
				email: String(data.get("email")),
				role: String(data.get("role")),
				status: String(data.get("status"))
			};
			if (this.onSave) {
				this.onSave(payload, Boolean(this.activeId));
			}
			this.close();
		});
	}

	open(data) {
		this.activeId = data?.id || null;
		if (this.title) {
			this.title.textContent = data ? "Edit user" : "Add user";
		}
		if (this.form) {
			this.form.reset();
			if (data) {
				this.form.name.value = data.name;
				this.form.email.value = data.email;
				this.form.role.value = data.role;
				this.form.status.value = data.status;
			}
		}
		this.modal?.classList.add("open");
	}

	close() {
		this.modal?.classList.remove("open");
		this.activeId = null;
	}
}

class TableManager {
	constructor({ body, pagination, search, filter, count, modal }) {
		this.body = body;
		this.pagination = pagination;
		this.search = search;
		this.filter = filter;
		this.count = count;
		this.modal = modal;
		this.users = [];
		this.filtered = [];
		this.page = 1;
		this.sortKey = "id";
		this.sortDir = "asc";
	}

	init() {
		this.users = this.loadUsers();
		this.filtered = [...this.users];
		this.search?.addEventListener("input", (event) => {
			this.page = 1;
			this.applyFilters(event.target.value, this.filter?.value || "all");
		});
		this.filter?.addEventListener("change", (event) => {
			this.page = 1;
			this.applyFilters(this.search?.value || "", event.target.value);
		});
		document.querySelectorAll("th[data-sort]").forEach((header) => {
			header.addEventListener("click", () => {
				const key = header.dataset.sort;
				this.sortDir = this.sortKey === key && this.sortDir === "asc" ? "desc" : "asc";
				this.sortKey = key;
				this.render();
			});
		});
		this.pagination?.addEventListener("click", (event) => {
			const button = event.target.closest("button");
			if (!button?.dataset.page) {
				return;
			}
			this.page = Number(button.dataset.page);
			this.render();
		});
		this.body?.addEventListener("click", (event) => {
			const action = event.target.closest("button")?.dataset.action;
			const id = event.target.closest("tr")?.dataset.id;
			if (!action || !id) {
				return;
			}
			if (action === "edit") {
				const user = this.users.find((item) => item.id === id);
				this.modal?.open(user);
			}
			if (action === "delete") {
				if (confirm("Delete this user?")) {
					this.users = this.users.filter((item) => item.id !== id);
					this.saveUsers();
					this.applyFilters(this.search?.value || "", this.filter?.value || "all");
				}
			}
		});
		this.render();
	}

	applyFilters(searchValue, status) {
		const query = searchValue.trim().toLowerCase();
		this.filtered = this.users.filter((user) => {
			const matchesSearch =
				!query ||
				user.name.toLowerCase().includes(query) ||
				user.email.toLowerCase().includes(query) ||
				user.role.toLowerCase().includes(query);
			const matchesStatus = status === "all" || user.status === status;
			return matchesSearch && matchesStatus;
		});
		this.render();
	}

	render() {
		if (!this.body) {
			return;
		}
		const sorted = [...this.filtered].sort((a, b) => {
			const aValue = String(a[this.sortKey]).toLowerCase();
			const bValue = String(b[this.sortKey]).toLowerCase();
			if (aValue < bValue) return this.sortDir === "asc" ? -1 : 1;
			if (aValue > bValue) return this.sortDir === "asc" ? 1 : -1;
			return 0;
		});

		const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
		if (this.page > totalPages) {
			this.page = 1;
		}

		const start = (this.page - 1) * PAGE_SIZE;
		const pageItems = sorted.slice(start, start + PAGE_SIZE);

		this.body.innerHTML = "";
		pageItems.forEach((user) => {
			const row = document.createElement("tr");
			row.dataset.id = user.id;
			row.innerHTML = `
				<td>${user.id}</td>
				<td>${user.name}</td>
				<td>${user.email}</td>
				<td>${user.role}</td>
				<td><span class="status ${user.status.toLowerCase()}">${user.status}</span></td>
				<td>
					<button class="btn ghost" data-action="edit">Edit</button>
					<button class="btn ghost" data-action="delete">Delete</button>
				</td>
			`;
			this.body.appendChild(row);
		});

		if (this.count) {
			this.count.textContent = `${this.filtered.length} members`;
		}
		this.renderPagination(totalPages);
	}

	renderPagination(totalPages) {
		if (!this.pagination) {
			return;
		}
		this.pagination.innerHTML = "";
		Array.from({ length: totalPages }, (_, index) => index + 1).forEach((page) => {
			const button = document.createElement("button");
			button.dataset.page = page;
			button.textContent = page;
			if (page === this.page) {
				button.classList.add("active");
			}
			this.pagination.appendChild(button);
		});
	}

	addOrUpdate(user, isEdit) {
		if (isEdit) {
			this.users = this.users.map((item) => (item.id === user.id ? user : item));
		} else {
			this.users = [user, ...this.users];
		}
		this.saveUsers();
		this.applyFilters(this.search?.value || "", this.filter?.value || "all");
	}

	loadUsers() {
		const stored = localStorage.getItem(USERS_KEY);
		if (!stored) {
			localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
			return [...seedUsers];
		}
		try {
			const parsed = JSON.parse(stored);
			return Array.isArray(parsed) ? parsed : [...seedUsers];
		} catch (error) {
			return [...seedUsers];
		}
	}

	saveUsers() {
		localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
	}
}

class ChartManager {
	init() {
		const salesCtx = document.getElementById("salesChart");
		const revenueCtx = document.getElementById("revenueChart");
		const userCtx = document.getElementById("userChart");

		if (salesCtx) {
			new Chart(salesCtx, {
				type: "line",
				data: {
					labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
					datasets: [
						{
							label: "Sales",
							data: [120, 190, 170, 220, 280, 310, 305, 360, 390, 420, 460, 520],
							borderColor: "#e66b3c",
							backgroundColor: "rgba(230, 107, 60, 0.15)",
							tension: 0.4,
							fill: true
						}
					]
				},
				options: {
					responsive: true,
					plugins: {
						legend: { display: false }
					}
				}
			});
		}

		if (revenueCtx) {
			new Chart(revenueCtx, {
				type: "bar",
				data: {
					labels: ["SaaS", "Retail", "Partners", "Enterprise"],
					datasets: [
						{
							label: "Revenue",
							data: [320, 280, 210, 370],
							backgroundColor: ["#e66b3c", "#f2a45d", "#2f8f5b", "#7d6a5b"]
						}
					]
				},
				options: {
					responsive: true,
					plugins: {
						legend: { display: false }
					}
				}
			});
		}

		if (userCtx) {
			new Chart(userCtx, {
				type: "pie",
				data: {
					labels: ["Starter", "Growth", "Scale"],
					datasets: [
						{
							data: [45, 35, 20],
							backgroundColor: ["#e66b3c", "#f2a45d", "#2f8f5b"]
						}
					]
				},
				options: {
					responsive: true
				}
			});
		}
	}
}

class Dashboard {
	init() {
		this.setupCounters();
		this.setupDropdowns();
		this.setupSidebar();
		this.setupGlobalSearch();
		this.seedPanels();
	}

	setupCounters() {
		document.querySelectorAll("[data-counter]").forEach((counter) => {
			const target = Number(counter.dataset.counter || 0);
			const hasPercent = counter.textContent.includes("%") || counter.dataset.counter === "38";
			let current = 0;
			const step = Math.max(1, Math.round(target / 40));
			const interval = setInterval(() => {
				current += step;
				if (current >= target) {
					current = target;
					clearInterval(interval);
				}
				counter.textContent = hasPercent ? `${current}%` : current.toLocaleString();
			}, 30);
		});
	}

	setupDropdowns() {
		document.querySelectorAll("[data-dropdown-toggle]").forEach((toggle) => {
			toggle.addEventListener("click", (event) => {
				event.stopPropagation();
				const dropdown = toggle.closest("[data-dropdown]");
				document.querySelectorAll("[data-dropdown]").forEach((item) => {
					if (item !== dropdown) item.classList.remove("open");
				});
				dropdown?.classList.toggle("open");
			});
		});
		document.addEventListener("click", () => {
			document.querySelectorAll("[data-dropdown]").forEach((item) => item.classList.remove("open"));
		});
	}

	setupSidebar() {
		const collapse = document.querySelector("[data-collapse-toggle]");
		const mobileToggle = document.querySelector("[data-mobile-toggle]");
		collapse?.addEventListener("click", () => document.body.classList.toggle("sidebar-collapsed"));
		mobileToggle?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
	}

	setupGlobalSearch() {
		const global = document.querySelector("[data-global-search]");
		global?.addEventListener("input", (event) => {
			const value = event.target.value.trim();
			if (!value) {
				global?.classList.remove("active");
			} else {
				global?.classList.add("active");
			}
		});
	}

	seedPanels() {
		const activity = document.querySelector("[data-activity-list]");
		const transactions = document.querySelector("[data-transaction-list]");
		const activityItems = [
			{ title: "New order approved", meta: "Order #4921 • 12m ago" },
			{ title: "Mia updated pricing", meta: "Product Ops • 1h ago" },
			{ title: "Monthly report ready", meta: "Analytics • 3h ago" },
			{ title: "New comment on post", meta: "Marketing • 4h ago" }
		];
		const transactionItems = [
			{ title: "Enterprise plan", meta: "$12,400 • Paid" },
			{ title: "Starter upgrade", meta: "$320 • Pending" },
			{ title: "Partner renewal", meta: "$4,800 • Paid" }
		];

		activity?.replaceChildren(
			...activityItems.map((item) => {
				const li = document.createElement("li");
				li.className = "activity-item";
				li.innerHTML = `<strong>${item.title}</strong><span>${item.meta}</span>`;
				return li;
			})
		);

		transactions?.replaceChildren(
			...transactionItems.map((item) => {
				const li = document.createElement("li");
				li.className = "transaction-item";
				li.innerHTML = `<strong>${item.title}</strong><span>${item.meta}</span>`;
				return li;
			})
		);
	}
}

const modalManager = new ModalManager(document.querySelector("[data-modal]"));
const tableManager = new TableManager({
	body: document.querySelector("[data-table-body]"),
	pagination: document.querySelector("[data-pagination]"),
	search: document.querySelector("[data-table-search]"),
	filter: document.querySelector("[data-status-filter]"),
	count: document.querySelector("[data-table-count]"),
	modal: modalManager
});

modalManager.init({
	onSave: (user, isEdit) => tableManager.addOrUpdate(user, isEdit)
});

document.querySelector("[data-open-modal]")?.addEventListener("click", () => modalManager.open());

new ThemeManager(document.querySelector("[data-theme-toggle]")).init();
new ChartManager().init();
new Dashboard().init();
tableManager.init();

const notifications = [
	{ title: "3 new approvals", meta: "Today" },
	{ title: "Server health stable", meta: "10m ago" },
	{ title: "New feedback received", meta: "1h ago" }
];

const notificationCount = document.querySelector("[data-notification-count]");
const notificationPanel = document.querySelector("[data-notification-panel]");
if (notificationCount) {
	notificationCount.textContent = notifications.length;
}
if (notificationPanel) {
	notificationPanel.innerHTML = notifications
		.map((item) => `<div><strong>${item.title}</strong><span>${item.meta}</span></div>`)
		.join("");
}
