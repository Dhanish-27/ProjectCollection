/**
 * Main Application Logic (Registration Page)
 */
import { generateId, showToast } from './utils.js';
import { Validation } from './validation.js';
import { createProject } from './firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[App] Registration page initialized.");
    // Only run on the registration page
    const form = document.getElementById('registration-form');
    if (!form) return;

    const membersContainer = document.getElementById('members-container');
    const addMemberBtn = document.getElementById('add-member-btn');
    const currentMemberCount = document.getElementById('current-member-count');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    let memberCount = 0;
    const MAX_MEMBERS = 5;

    // Initialize with one member row
    const initForm = () => {
        addMemberRow();
    };

    // Add a new member row
    const addMemberRow = () => {
        if (memberCount >= MAX_MEMBERS) {
            showToast('Maximum 5 members allowed.', 'warning');
            return;
        }

        memberCount++;
        updateMemberCountDisplay();

        const rowId = generateId();
        const row = document.createElement('div');
        row.className = 'member-row fade-in-up';
        row.id = `member-row-${rowId}`;
        
        row.innerHTML = `
            <div class="input-group">
                <label>Member Name <span class="required">*</span></label>
                <input type="text" class="member-name-input" placeholder="e.g., Jane Doe" required>
            </div>
            <div class="input-group">
                <label>Register Number <span class="required">*</span></label>
                <input type="text" class="member-reg-input" placeholder="e.g., 2023CS01" required>
            </div>
            ${memberCount > 1 ? `
                <button type="button" class="btn-icon remove-member-btn" data-rowid="${rowId}" title="Remove Member">
                    <i class="ph ph-trash"></i>
                </button>
            ` : `<div style="width: 40px;"></div>`}
        `;

        membersContainer.appendChild(row);
        
        // Hide add button if max reached
        if (memberCount >= MAX_MEMBERS) {
            addMemberBtn.classList.add('hidden');
        }

        // Add event listener to the newly created remove button if it exists
        const removeBtn = row.querySelector('.remove-member-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => removeMemberRow(rowId));
        }
    };

    // Remove a member row
    const removeMemberRow = (rowId) => {
        if (memberCount <= 1) return; // Must have at least 1 member

        const row = document.getElementById(`member-row-${rowId}`);
        if (row) {
            row.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                row.remove();
                memberCount--;
                updateMemberCountDisplay();
                
                // Show add button again if below max
                if (memberCount < MAX_MEMBERS) {
                    addMemberBtn.classList.remove('hidden');
                }
            }, 300);
        }
    };

    // Update count display
    const updateMemberCountDisplay = () => {
        currentMemberCount.textContent = memberCount;
    };

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        Validation.clearErrors();

        // Check online status
        if (!navigator.onLine) {
            showToast('Internet unavailable. Please check your connection.', 'error');
            return;
        }

        // Gather form data
        const projectTitle = document.getElementById('project-title').value;
        const groupName = document.getElementById('group-name').value;
        
        const members = [];
        const memberRows = membersContainer.querySelectorAll('.member-row');
        
        memberRows.forEach(row => {
            const name = row.querySelector('.member-name-input').value;
            const regNumber = row.querySelector('.member-reg-input').value;
            members.push({ name, regNumber });
        });

        const projectData = { projectTitle, groupName, members };

        // Disable submit button and show loading text
        const originalBtnHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Registering...';

        try {
            // Validate
            const validationResult = await Validation.validateProject(projectData);

            if (!validationResult.isValid) {
                Validation.showErrors(validationResult.errors);
                showToast('Please fix the errors in the form.', 'error');
                return;
            }

            // Save to Firestore
            await createProject(validationResult.sanitizedData);
            showToast('Project registered successfully!', 'success');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } catch (error) {
            console.error("[App] Submission failed:", error);
            showToast(error.message || 'An error occurred while saving.', 'error');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
        }
    });

    // Event Listeners
    addMemberBtn.addEventListener('click', addMemberRow);

    // Run init
    initForm();
});
