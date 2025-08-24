const { Server } = require("socket.io");

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Store user connections
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // Allow all origins for Railway
        methods: ["GET", "POST"],
        credentials: false, // Disable credentials for Railway
      },
      transports: ["polling"], // Use only polling for Railway reliability
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true,
    });

    this.io.on("connection", (socket) => {
      // Send immediate ping to test connection
      socket.emit("ping", {
        message: "Connected to WebSocket server",
        timestamp: new Date().toISOString(),
      });

      // Setup ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("ping", { timestamp: new Date().toISOString() });
        } else {
          clearInterval(pingInterval);
        }
      }, 25000);

      // Handle user authentication/identification
      socket.on("authenticate", (userData) => {
        if (userData && userData.id) {
          this.connectedUsers.set(socket.id, userData);
          socket.join(`user_${userData.id}`); // Join user-specific room
          socket.join(`role_${userData.role}`); // Join role-specific room

          // Send confirmation back to client
          socket.emit("authenticated", {
            success: true,
            message: `Authenticated as ${userData.role}`,
            userId: userData.id,
          });
        }
      });

      // Handle ping response
      socket.on("pong", (data) => {
        // Silent ping/pong for connection health
      });

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        const userData = this.connectedUsers.get(socket.id);
        if (userData) {
          this.connectedUsers.delete(socket.id);
        }
        clearInterval(pingInterval);
      });
    });

    return this.io;
  }

  // Broadcast request updates to all relevant users
  broadcastRequestUpdate(request, action = "updated") {
    if (!this.io) {
      return;
    }

    const updateData = {
      type: "REQUEST_UPDATE",
      action, // 'created', 'updated', 'deleted'
      request,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all users (they'll filter on frontend based on their role)
    this.io.emit("requestUpdate", updateData);

    // Also broadcast to specific roles
    this.io.to("role_user").emit("requestUpdate", updateData);
    this.io.to("role_supervisor").emit("requestUpdate", updateData);
    this.io.to("role_technical-manager").emit("requestUpdate", updateData);
    this.io.to("role_engineer").emit("requestUpdate", updateData);
  }

  // Broadcast to specific user
  broadcastToUser(userId, eventName, data) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit(eventName, data);
  }

  // Broadcast to specific role
  broadcastToRole(role, eventName, data) {
    if (!this.io) return;
    this.io.to(`role_${role}`).emit(eventName, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  getConnectedUsersByRole(role) {
    const users = Array.from(this.connectedUsers.values());
    return users.filter((user) => user.role === role);
  }
}

// Export singleton instance
module.exports = new WebSocketService();
