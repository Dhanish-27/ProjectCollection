import { db } from './firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { generateId, showToast } from './utils.js';

const PROJECTS_COLLECTION = 'projects';
const SESSION_KEY = 'editableProjectsTokens';

// Helper to throw friendly errors
function handleFirestoreError(error, context = "operation") {
    console.error(`[Firestore Error - ${context}]:`, error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission denied. Please configure your Firestore Security Rules.");
    } else if (error.code === 'unavailable') {
        throw new Error("Unable to connect to Firestore. Check your internet connection.");
    } else {
        throw new Error(`Firestore unavailable or an error occurred during ${context}.`);
    }
}

/**
 * Hash a string using SHA-256
 */
async function hashString(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Store the original token in sessionStorage
 */
function storeSessionToken(projectId, token) {
    let tokens = {};
    try {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (data) tokens = JSON.parse(data);
    } catch (e) {
        console.warn("[Session] Failed to parse tokens", e);
    }
    tokens[projectId] = token;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
}

/**
 * Get a token for a project from sessionStorage
 */
function getSessionToken(projectId) {
    try {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (data) {
            const tokens = JSON.parse(data);
            return tokens[projectId] || null;
        }
    } catch (e) {
        return null;
    }
    return null;
}

/**
 * Remove a token for a project from sessionStorage
 */
function removeSessionToken(projectId) {
    try {
        const data = sessionStorage.getItem(SESSION_KEY);
        if (data) {
            const tokens = JSON.parse(data);
            delete tokens[projectId];
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
        }
    } catch (e) {}
}

/**
 * Create a new project in Firestore
 */
export async function createProject(projectData) {
    console.log("[Firestore] Attempting to create a new project...");
    try {
        const sessionToken = generateId() + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2);
        const sessionTokenHash = await hashString(sessionToken);
        
        const newProject = {
            ...projectData,
            projectId: generateId(),
            createdAt: new Date().toISOString(),
            sessionTokenHash: sessionTokenHash,
            editable: true
        };

        const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), newProject);
        console.log(`[Firestore] Project created successfully with ID: ${docRef.id}`);
        
        storeSessionToken(docRef.id, sessionToken);

        return { id: docRef.id, ...newProject };
    } catch (error) {
        handleFirestoreError(error, "creating project");
    }
}

/**
 * Get all projects from Firestore (one-time fetch)
 */
export async function getAllProjects() {
    console.log("[Firestore] Fetching all existing projects...");
    try {
        const q = query(collection(db, PROJECTS_COLLECTION));
        const querySnapshot = await getDocs(q);
        const projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        console.log(`[Firestore] Successfully fetched ${projects.length} projects.`);
        return projects;
    } catch (error) {
        handleFirestoreError(error, "fetching projects");
    }
}

/**
 * Subscribe to projects in real-time
 */
export function subscribeProjects(callback, errorCallback) {
    console.log("[Firestore] Subscribing to real-time project updates...");
    const q = query(collection(db, PROJECTS_COLLECTION));
    return onSnapshot(q, (querySnapshot) => {
        const projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        console.log(`[Firestore] Snapshot event received: ${projects.length} projects loaded.`);
        callback(projects);
    }, (error) => {
        console.error("[Firestore Error - Snapshot listener]:", error);
        if (errorCallback) {
            if (error.code === 'permission-denied') {
                errorCallback(new Error("Permission denied. Please configure your Firestore Security Rules."));
            } else {
                errorCallback(new Error("Firestore unavailable or real-time connection lost."));
            }
        }
    });
}

/**
 * Update an existing project
 */
export async function updateProject(id, updatedData) {
    console.log(`[Firestore] Attempting to update project: ${id}`);
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, id);
        await updateDoc(docRef, updatedData);
        console.log(`[Firestore] Project updated successfully: ${id}`);
    } catch (error) {
        handleFirestoreError(error, "updating project");
    }
}

/**
 * Delete a project
 */
export async function deleteProject(id) {
    console.log(`[Firestore] Attempting to delete project: ${id}`);
    try {
        const docRef = doc(db, PROJECTS_COLLECTION, id);
        await deleteDoc(docRef);
        console.log(`[Firestore] Project deleted successfully: ${id}`);
        removeSessionToken(id);
    } catch (error) {
        handleFirestoreError(error, "deleting project");
    }
}

/**
 * Check if a project is editable in the current session
 */
export async function checkIsEditable(projectId, storedHash) {
    if (!storedHash) return false;
    const token = getSessionToken(projectId);
    if (!token) return false;
    const currentHash = await hashString(token);
    return currentHash === storedHash;
}
