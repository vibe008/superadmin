const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const departmentRoutes = require("./src/routes/department.routes");
const authRoutes = require("./src/routes/auth.routes");
const staffRoutes = require("./src/routes/staff.routes");
const taskRoutes = require("./src/routes/task.routes");
const chatinitRoutes = require("./src/routes/chat.routes");
const TicketRoutes = require("./src/routes/ticket.routes");
const mediaRoutes = require("./src/routes/media.routes");
const contactRoutes = require("./src/routes/contact.routes");
const permissionRoutes = require("./src/routes/permission.routes");
const contactreply = require("./src/routes/reply.routes");
// Middleware
app.use(cors({
    // origin: ["*"],
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://staffmanagement-superadmin.vercel.app",
        "https://www.mysmartpg.com"
    ],
    credentials: true
}));
app.use(express.json());

// Routes

app.use("/api/permission", permissionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatinitRoutes);
app.use("/api/department", departmentRoutes);
app.use('/api/', mediaRoutes);
app.use("/api/ticket", TicketRoutes);
app.use("/api", contactRoutes);

app.use("/api", contactreply);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

const server = http.createServer(app);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});