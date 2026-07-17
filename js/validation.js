/**
 * Validation Logic for Final Year Project Groups App
 */
import { getAllProjects } from './firestore.js';

export const Validation = {
    // Basic empty check
    isEmpty: (value) => {
        return !value || value.trim().length === 0;
    },

    // Validate a single project submission
    validateProject: async (projectData, currentProjectId = null) => {
        const errors = {};

        // 1. Project Title cannot be empty
        if (Validation.isEmpty(projectData.projectTitle)) {
            errors.projectTitle = "Project Title is required.";
        } else {
            projectData.projectTitle = projectData.projectTitle.trim();
        }

        // 2. Group Name cannot be empty
        if (Validation.isEmpty(projectData.groupName)) {
            errors.groupName = "Group Name is required.";
        } else {
            projectData.groupName = projectData.groupName.trim();
            
            try {
                // 3. Prevent duplicate Group Names and Project Titles globally via Firestore
                const existingProjects = await getAllProjects();
                
                const isGroupDuplicate = existingProjects.some(p => {
                    if (currentProjectId && p.id === currentProjectId) return false;
                    return p.groupName.toLowerCase() === projectData.groupName.toLowerCase();
                });
                
                if (isGroupDuplicate) {
                    errors.groupName = "This Group Name is already registered.";
                }

                // Also check project title as requested in prompt "Prevent duplicate Group Name, Project Title"
                const isTitleDuplicate = existingProjects.some(p => {
                    if (currentProjectId && p.id === currentProjectId) return false;
                    return p.projectTitle.toLowerCase() === projectData.projectTitle.toLowerCase();
                });

                if (isTitleDuplicate) {
                    if (!errors.projectTitle) {
                        errors.projectTitle = "This Project Title is already registered.";
                    }
                }
            } catch (err) {
                console.error("[Validation] Failed to fetch existing projects.", err);
                throw new Error("Validation failed: " + (err.message || "Unable to check for duplicates."));
            }
        }

        // 4. Validate Members
        if (!projectData.members || projectData.members.length === 0) {
            errors.members = "At least one member is required.";
        } else if (projectData.members.length > 5) {
            errors.members = "Maximum 5 members allowed.";
        } else {
            const regNumbers = new Set();
            let memberError = null;

            for (let i = 0; i < projectData.members.length; i++) {
                const member = projectData.members[i];
                
                // Trim member details
                member.name = (member.name || '').trim();
                member.regNumber = (member.regNumber || '').trim();

                if (Validation.isEmpty(member.name) || Validation.isEmpty(member.regNumber)) {
                    memberError = `All members must have a Name and Register Number (Check Member ${i + 1}).`;
                    break;
                }

                // 5. Register Number cannot be duplicated within the same group
                if (regNumbers.has(member.regNumber.toLowerCase())) {
                    memberError = `Duplicate Register Number found within the group: ${member.regNumber}.`;
                    break;
                }
                regNumbers.add(member.regNumber.toLowerCase());
            }

            if (memberError) {
                errors.members = memberError;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors,
            sanitizedData: projectData // Return sanitized/trimmed data
        };
    },

    // Render errors to the DOM
    showErrors: (errors, prefix = '') => {
        // Clear all previous errors
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        document.querySelectorAll('input').forEach(el => el.classList.remove('is-invalid'));

        // Display new errors
        for (const [key, msg] of Object.entries(errors)) {
            const errorElement = document.getElementById(`error-${prefix}${key}`);
            if (errorElement) {
                errorElement.textContent = msg;
            }
            
            // Highlight specific input if it's not the members array
            if (key !== 'members') {
                const inputElement = document.getElementById(`${prefix === 'edit-' ? 'edit-' : ''}${key === 'projectTitle' ? 'project-title' : 'group-name'}`);
                if (inputElement) inputElement.classList.add('is-invalid');
            }
        }
    },
    
    // Clear all errors
    clearErrors: () => {
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
        document.querySelectorAll('input').forEach(el => el.classList.remove('is-invalid'));
    }
};
