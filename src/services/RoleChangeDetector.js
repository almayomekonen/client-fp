// Real-time role change detection service
import { API_BASE_URL } from "../api/config";

class RoleChangeDetector {
  constructor() {
    this.intervalId = null;
    this.isChecking = false;
    this.currentUserRole = null;
    this.isHandlingRoleChange = false;
  }

  // Start monitoring for role changes
  start(userRole) {
    this.currentUserRole = userRole;
    this.isHandlingRoleChange = false; // Reset flag
    this.stop(); // Clear any existing interval

    console.log(`🔄 Starting role change detection for role: ${userRole}`);

    // Check immediately on start
    this.checkRoleChange();

    // Then check every 3 seconds
    this.intervalId = setInterval(() => {
      this.checkRoleChange();
    }, 3000);
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ Stopped role change detection");
    }
  }

  async checkRoleChange() {
    if (this.isHandlingRoleChange || this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      console.log(
        `🔍 Polling for role change... Current role: ${this.currentUserRole}`
      );

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        credentials: "include",
      });

      console.log(`📡 Poll response status: ${response.status}`);

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));

        if (data.code === "ROLE_CHANGED") {
          console.log(
            `🚨 ROLE CHANGED! Old: ${this.currentUserRole}, New: ${data.newRole}`
          );
          this.handleRoleChange(data.newRole);
        } else {
          this.stop();
        }
      } else if (response.ok) {
        const data = await response.json();

        if (data.user && data.user.role !== this.currentUserRole) {
          console.log(
            `🚨 ROLE CHANGED (backup check)! Old: ${this.currentUserRole}, New: ${data.user.role}`
          );
          this.handleRoleChange(data.user.role);
        } else {
          console.log(`✅ Role unchanged: ${this.currentUserRole}`);
        }
      }
    } catch (error) {
      console.error("Error checking role:", error);
    } finally {
      this.isChecking = false;
    }
  }

  handleRoleChange(newRole) {
    if (this.isHandlingRoleChange) {
      console.log("⚠️ Already handling role change, skipping");
      return;
    }

    this.isHandlingRoleChange = true;
    this.stop();

    console.log(`🎭 Showing role change modal for new role: ${newRole}`);

    if (document.getElementById("roleChangeModal")) {
      console.log("⚠️ Modal already exists, skipping");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "roleChangeModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 48px; margin-bottom: 15px;">🔄</div>
        <h2 style="margin: 0 0 15px 0; color: #333;">התפקיד שלך השתנה</h2>
        <p style="color: #666; margin-bottom: 20px;">
          מנהל המערכת שינה את התפקיד שלך ל-<strong>${this.getRoleInHebrew(
            newRole
          )}</strong>.<br/>
          אנא התחבר מחדש כדי להמשיך.
        </p>
        <div style="
          background: #f0f0f0;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          color: #888;
        ">מעביר אותך לדף התחברות...</div>
      </div>
    `;

    document.body.appendChild(modal);
    console.log(`✅ Modal added to DOM`);

    localStorage.removeItem("currentUser");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log(`🧹 Cleared auth data`);

    setTimeout(() => {
      console.log(`🔄 Redirecting to login page...`);
      window.location.href = "/";
    }, 2500);
  }

  getRoleInHebrew(role) {
    const roles = {
      admin: "מנהל",
      investigator: "חוקר",
      coder: "מקודד",
    };
    return roles[role] || role;
  }
}

export const roleChangeDetector = new RoleChangeDetector();
