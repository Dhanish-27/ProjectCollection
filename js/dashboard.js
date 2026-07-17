/**
 * Dashboard Logic for Final Year Project Groups App
 */
import { generateId, showToast, escapeHTML } from './utils.js';
import { Validation } from './validation.js';
import { subscribeProjects, updateProject, deleteProject, checkIsEditable } from './firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Only run on dashboard
    const projectsGrid = document.getElementById('projects-grid');
    if (!projectsGrid) return;

    let allProjects = [];
    let filteredProjects = [];
    let currentEditId = null;
    let currentDeleteId = null;
    let editableMap = {}; // Maps projectId to boolean

    // Elements
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const emptyState = document.getElementById('empty-state');
    
    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editMembersContainer = document.getElementById('edit-members-container');
    const editAddMemberBtn = document.getElementById('edit-add-member-btn');
    const editMemberCountSpan = document.getElementById('edit-member-count');
    let editMemberCount = 0;
    const MAX_MEMBERS = 5;

    // Delete Modal Elements
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Stats Elements
    const statTotalGroups = document.getElementById('stat-total-groups');
    const statTotalStudents = document.getElementById('stat-total-students');
    const statAvgMembers = document.getElementById('stat-avg-members');

    // Loading Spinner UI
    const loadingHtml = `
        <div id="loading-spinner" class="glass-panel text-center fade-in-up" style="padding: 3rem; margin-top: 2rem;">
            <i class="ph ph-spinner ph-spin" style="font-size: 3rem; color: var(--primary);"></i>
            <h3 style="margin-top: 1rem;">Loading projects...</h3>
        </div>
    `;

    // --- Initialization ---
    const initDashboard = () => {
        // Initially show loading
        projectsGrid.innerHTML = loadingHtml;
        emptyState.classList.add('hidden');
        loadProjects();
        bindEvents();
        
        // Listen for offline/online
        window.addEventListener('offline', () => {
            showToast('You are offline. Data might not be up-to-date.', 'warning');
        });
        window.addEventListener('online', () => {
            showToast('Internet connection restored.', 'success');
        });
    };

    const loadProjects = () => {
        // Subscribe to Firestore for real-time updates
        subscribeProjects(async (projects) => {
            allProjects = projects;
            
            // Build editable map asynchronously
            editableMap = {};
            await Promise.all(allProjects.map(async (p) => {
                editableMap[p.id] = await checkIsEditable(p.id, p.sessionTokenHash);
            }));

            applySortAndFilter();
        }, (error) => {
            console.error("[Dashboard] Subscribe error:", error);
            showToast(error.message || 'Error loading data.', 'error');
            projectsGrid.innerHTML = `
                <div class="glass-panel text-center fade-in-up" style="padding: 3rem; margin-top: 2rem;">
                    <i class="ph ph-wifi-slash text-danger" style="font-size: 3rem;"></i>
                    <h3 style="margin-top: 1rem;">Offline / Error Loading Data</h3>
                </div>
            `;
        });
    };

    // --- Stats ---
    const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // Format number (if float, keep 1 decimal)
            const currentValue = progress * (end - start) + start;
            obj.innerHTML = Number.isInteger(end) ? Math.floor(currentValue) : currentValue.toFixed(1);
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end;
            }
        };
        window.requestAnimationFrame(step);
    };

    const updateStats = () => {
        const totalGroups = allProjects.length;
        const totalStudents = allProjects.reduce((acc, curr) => acc + curr.members.length, 0);
        const avgMembers = totalGroups === 0 ? 0 : (totalStudents / totalGroups).toFixed(1);

        animateValue(statTotalGroups, parseInt(statTotalGroups.innerHTML) || 0, totalGroups, 1000);
        animateValue(statTotalStudents, parseInt(statTotalStudents.innerHTML) || 0, totalStudents, 1000);
        animateValue(statAvgMembers, parseFloat(statAvgMembers.innerHTML) || 0, parseFloat(avgMembers), 1000);
    };

    // --- Rendering ---
    const highlightText = (text, query) => {
        if (!query) return escapeHTML(text);
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escapeHTML(text).replace(regex, '<span class="highlight">$1</span>');
    };

    const renderProjects = () => {
        projectsGrid.innerHTML = '';
        const query = searchInput.value.trim();

        if (filteredProjects.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            filteredProjects.forEach(project => {
                const isEditable = editableMap[project.id];
                
                const card = document.createElement('div');
                card.className = 'project-card glass-panel fade-in-up';
                
                let membersHTML = project.members.map(m => `
                    <li class="member-item">
                        <span class="member-name"><i class="ph ph-user"></i> ${highlightText(m.name, query)}</span>
                        <span class="member-reg">${highlightText(m.regNumber, query)}</span>
                    </li>
                `).join('');

                const actionsHTML = isEditable ? `
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="window.openEditModal('${project.id}')">
                            <i class="ph ph-pencil-simple"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="window.openDeleteModal('${project.id}')">
                            <i class="ph ph-trash"></i> Delete
                        </button>
                    </div>
                ` : `
                    <div class="card-actions" style="opacity: 0.5;">
                        <span class="text-sm"><i class="ph ph-lock"></i> Read-only</span>
                    </div>
                `;

                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-title-group">
                            <h3 class="project-title">${highlightText(project.projectTitle, query)}</h3>
                            <div class="group-name">
                                <i class="ph ph-users-three"></i> ${highlightText(project.groupName, query)}
                            </div>
                        </div>
                        <div class="member-badge">
                            <i class="ph ph-users"></i> ${project.members.length} / 5
                        </div>
                    </div>
                    <div class="card-body">
                        <ul class="members-list">
                            ${membersHTML}
                        </ul>
                    </div>
                    ${actionsHTML}
                `;
                
                projectsGrid.appendChild(card);
            });
        }
        updateStats();
    };

    // --- Search & Sort ---
    const applySortAndFilter = () => {
        const query = searchInput.value.trim().toLowerCase();
        const sortMode = sortSelect.value;

        // Filter
        filteredProjects = allProjects.filter(p => {
            const titleMatch = p.projectTitle.toLowerCase().includes(query);
            const groupMatch = p.groupName.toLowerCase().includes(query);
            const memberMatch = p.members.some(m => 
                m.name.toLowerCase().includes(query) || 
                m.regNumber.toLowerCase().includes(query)
            );
            return titleMatch || groupMatch || memberMatch;
        });

        // Sort
        filteredProjects.sort((a, b) => {
            switch (sortMode) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'title-asc':
                    return a.projectTitle.localeCompare(b.projectTitle);
                case 'title-desc':
                    return b.projectTitle.localeCompare(a.projectTitle);
                case 'group-asc':
                    return a.groupName.localeCompare(b.groupName);
                case 'group-desc':
                    return b.groupName.localeCompare(a.groupName);
                default:
                    return 0;
            }
        });

        renderProjects();
    };

    // --- Edit Modal Logic ---
    window.openEditModal = (id) => {
        const project = allProjects.find(p => p.id === id);
        if (!project) return;
        
        currentEditId = id;
        Validation.clearErrors();
        
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-project-title').value = project.projectTitle;
        document.getElementById('edit-group-name').value = project.groupName;
        
        // Populate Members
        editMembersContainer.innerHTML = '';
        editMemberCount = 0;
        
        project.members.forEach(m => window.addEditMemberRow(m.name, m.regNumber));
        
        editModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    const closeEditModal = () => {
        editModal.classList.add('hidden');
        document.body.style.overflow = '';
        currentEditId = null;
    };

    window.addEditMemberRow = (name = '', regNumber = '') => {
        if (editMemberCount >= MAX_MEMBERS) {
            showToast('Maximum 5 members allowed.', 'warning');
            return;
        }

        editMemberCount++;
        editMemberCountSpan.textContent = editMemberCount;

        const rowId = generateId();
        const row = document.createElement('div');
        row.className = 'member-row fade-in-up';
        row.id = `edit-member-row-${rowId}`;
        
        row.innerHTML = `
            <div class="input-group">
                <label>Name <span class="required">*</span></label>
                <input type="text" class="edit-member-name-input" value="${escapeHTML(name)}" required>
            </div>
            <div class="input-group">
                <label>Register No <span class="required">*</span></label>
                <input type="text" class="edit-member-reg-input" value="${escapeHTML(regNumber)}" required>
            </div>
            <button type="button" class="btn-icon remove-member-btn" onclick="window.removeEditMemberRow('${rowId}')">
                <i class="ph ph-trash"></i>
            </button>
        `;

        editMembersContainer.appendChild(row);
        
        if (editMemberCount >= MAX_MEMBERS) {
            editAddMemberBtn.classList.add('hidden');
        }
    };

    window.removeEditMemberRow = (rowId) => {
        if (editMemberCount <= 1) return;

        const row = document.getElementById(`edit-member-row-${rowId}`);
        if (row) {
            row.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                row.remove();
                editMemberCount--;
                editMemberCountSpan.textContent = editMemberCount;
                
                if (editMemberCount < MAX_MEMBERS) {
                    editAddMemberBtn.classList.remove('hidden');
                }
            }, 300);
        }
    };

    // Handle Edit Submission
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        Validation.clearErrors();

        if (!navigator.onLine) {
            showToast('Internet unavailable.', 'error');
            return;
        }

        const projectTitle = document.getElementById('edit-project-title').value;
        const groupName = document.getElementById('edit-group-name').value;
        
        const members = [];
        const memberRows = editMembersContainer.querySelectorAll('.member-row');
        
        memberRows.forEach(row => {
            const name = row.querySelector('.edit-member-name-input').value;
            const regNumber = row.querySelector('.edit-member-reg-input').value;
            members.push({ name, regNumber });
        });

        const projectData = { projectTitle, groupName, members };

        const submitBtn = editForm.querySelector('button[type="submit"]');
        const originalBtnHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Saving...';

        try {
            // Validate
            const validationResult = await Validation.validateProject(projectData, currentEditId);

            if (!validationResult.isValid) {
                Validation.showErrors(validationResult.errors, 'edit-');
                return;
            }

            await updateProject(currentEditId, validationResult.sanitizedData);
            showToast('Project updated successfully!', 'success');
            closeEditModal();
        } catch (error) {
            showToast(error.message || 'Failed to update project.', 'error');
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
        }
    });

    // --- Delete Modal Logic ---
    window.openDeleteModal = (id) => {
        currentDeleteId = id;
        deleteModal.classList.remove('hidden');
    };

    const closeDeleteModal = () => {
        deleteModal.classList.add('hidden');
        currentDeleteId = null;
    };

    confirmDeleteBtn.addEventListener('click', async () => {
        if (currentDeleteId) {
            if (!navigator.onLine) {
                showToast('Internet unavailable.', 'error');
                return;
            }

            const originalBtnHTML = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Deleting...';

            try {
                await deleteProject(currentDeleteId);
                showToast('Project deleted successfully.', 'success');
            } catch (error) {
                showToast(error.message || 'Failed to delete project.', 'error');
                console.error(error);
            } finally {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = originalBtnHTML;
                closeDeleteModal();
            }
        } else {
            closeDeleteModal();
        }
    });

    // --- Exports (Bonus) ---
    const exportCSV = () => {
        if (allProjects.length === 0) {
            showToast('No data to export.', 'warning');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Project Title,Group Name,Created At,Total Members,Members Details (Name - Reg No)\n";

        allProjects.forEach(p => {
            const title = `"${p.projectTitle.replace(/"/g, '""')}"`;
            const group = `"${p.groupName.replace(/"/g, '""')}"`;
            const date = `"${new Date(p.createdAt).toLocaleDateString()}"`;
            const count = p.members.length;
            const membersDetails = `"${p.members.map(m => `${m.name} (${m.regNumber})`).join(', ')}"`;
            
            csvContent += `${title},${group},${date},${count},${membersDetails}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "projects_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exported to CSV!', 'success');
    };

    const exportPDF = () => {
        window.print();
    };

    // --- Bind Events ---
    const bindEvents = () => {
        searchInput.addEventListener('input', applySortAndFilter);
        sortSelect.addEventListener('change', applySortAndFilter);
        
        closeModalBtn.addEventListener('click', closeEditModal);
        cancelEditBtn.addEventListener('click', closeEditModal);
        editAddMemberBtn.addEventListener('click', () => window.addEditMemberRow());
        
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);

        document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
        document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);
    };

    // Run init
    initDashboard();
});
