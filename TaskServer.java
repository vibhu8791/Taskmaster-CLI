import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Collectors;

public class TaskServer {
    private static final int PORT = 8084; // Changed port to 8084 to avoid conflicts
    private static final String DB_FILE = "tasks.json";
    private static final String PUBLIC_DIR = "public";

    public static void main(String[] args) throws IOException {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            
            // API Handler
            server.createContext("/api/tasks", new ApiHandler());
            
            // Static Files Handler
            server.createContext("/", new StaticFileHandler());
            
            server.setExecutor(null);
            System.out.println("\n" + "=".repeat(40));
            System.out.println("   TASKMASTER SERVER STARTED");
            System.out.println("=".repeat(40));
            System.out.println("URL: http://localhost:" + PORT);
            System.out.println("Status: RUNNING");
            System.out.println("Press Ctrl+C to stop the server");
            System.out.println("=".repeat(40) + "\n");
            
            server.start();
        } catch (java.net.BindException e) {
            System.err.println("\nERROR: Port " + PORT + " is already in use!");
            System.err.println("Please close any other application running on port " + PORT + " and try again.");
            System.exit(1);
        }
    }

    static class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            
            System.out.println("[API] " + method + " " + path);

            // CORS Headers
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

            if (method.equalsIgnoreCase("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if (method.equalsIgnoreCase("GET")) {
                    String response = readTasks();
                    sendResponse(exchange, response, 200, "application/json");
                } 
                else if (method.equalsIgnoreCase("POST")) {
                    String body = getRequestBody(exchange);
                    String newTask = addTask(body);
                    sendResponse(exchange, newTask, 201, "application/json");
                } 
                else if (method.equalsIgnoreCase("PUT")) {
                    String id = extractId(path);
                    if (id == null) {
                        sendResponse(exchange, "{\"error\":\"ID missing\"}", 400, "application/json");
                        return;
                    }
                    String body = getRequestBody(exchange);
                    String updatedTask = updateTask(id, body);
                    sendResponse(exchange, updatedTask, 200, "application/json");
                } 
                else if (method.equalsIgnoreCase("DELETE")) {
                    String id = extractId(path);
                    if (id == null) {
                        sendResponse(exchange, "{\"error\":\"ID missing\"}", 400, "application/json");
                        return;
                    }
                    deleteTask(id);
                    sendResponse(exchange, "", 204, "text/plain");
                }
            } catch (Exception e) {
                System.err.println("Error: " + e.getMessage());
                sendResponse(exchange, "{\"error\":\"" + e.getMessage() + "\"}", 500, "application/json");
            }
        }

        private String extractId(String path) {
            String[] parts = path.split("/");
            if (parts.length >= 4) { // /api/tasks/123 -> ["", "api", "tasks", "123"]
                return parts[3];
            }
            return null;
        }
    }

    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            
            Path filePath = Paths.get(PUBLIC_DIR, path);
            if (Files.exists(filePath) && !Files.isDirectory(filePath)) {
                String contentType = getContentType(path);
                byte[] content = Files.readAllBytes(filePath);
                exchange.getResponseHeaders().add("Content-Type", contentType);
                exchange.sendResponseHeaders(200, content.length);
                OutputStream os = exchange.getResponseBody();
                os.write(content);
                os.close();
            } else {
                System.out.println("[Static] 404 Not Found: " + path);
                String response = "404 Not Found";
                exchange.sendResponseHeaders(404, response.length());
                OutputStream os = exchange.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".js")) return "application/javascript";
            if (path.endsWith(".png")) return "image/png";
            if (path.endsWith(".svg")) return "image/svg+xml";
            return "text/plain";
        }
    }

    private static String readTasks() throws IOException {
        Path path = Paths.get(DB_FILE);
        if (!Files.exists(path)) {
            Files.write(path, "[]".getBytes());
            return "[]";
        }
        String content = new String(Files.readAllBytes(path), StandardCharsets.UTF_8).trim();
        return content.isEmpty() ? "[]" : content;
    }

    private static String addTask(String body) throws IOException {
        String title = "New Project";
        String date = "";
        
        if (body.contains("\"title\":\"")) {
            int start = body.indexOf("\"title\":\"") + 9;
            int end = body.indexOf("\"", start);
            title = body.substring(start, end);
        }
        
        if (body.contains("\"date\":\"")) {
            int start = body.indexOf("\"date\":\"") + 8;
            int end = body.indexOf("\"", start);
            date = body.substring(start, end);
        }
        
        long id = System.currentTimeMillis();
        String newTask;
        if (date.isEmpty()) {
            newTask = String.format("{\"id\":%d,\"title\":\"%s\",\"completed\":false}", id, title);
        } else {
            newTask = String.format("{\"id\":%d,\"title\":\"%s\",\"completed\":false,\"date\":\"%s\"}", id, title, date);
        }
        
        String tasks = readTasks();
        if (tasks.equals("[]")) {
            tasks = "[" + newTask + "]";
        } else {
            tasks = tasks.substring(0, tasks.lastIndexOf("]")) + "," + newTask + "]";
        }
        Files.write(Paths.get(DB_FILE), tasks.getBytes(StandardCharsets.UTF_8));
        return newTask;
    }

    private static String updateTask(String id, String body) throws IOException {
        boolean completed = body.contains("\"completed\":true");
        String tasksStr = readTasks();
        
        String regex = "\\{\"id\":" + id + ".*?\\}";
        String title = extractTitle(id, tasksStr);
        String updatedTask = String.format("{\"id\":%s,\"title\":\"%s\",\"completed\":%b}", 
            id, title, completed);
        
        tasksStr = tasksStr.replaceFirst(regex, updatedTask);
        Files.write(Paths.get(DB_FILE), tasksStr.getBytes(StandardCharsets.UTF_8));
        return updatedTask;
    }

    private static String extractTitle(String id, String tasks) {
        try {
            int start = tasks.indexOf("\"id\":" + id);
            int titleStart = tasks.indexOf("\"title\":\"", start) + 9;
            int titleEnd = tasks.indexOf("\"", titleStart);
            return tasks.substring(titleStart, titleEnd);
        } catch (Exception e) {
            return "Task";
        }
    }

    private static void deleteTask(String id) throws IOException {
        String tasksStr = readTasks();
        String regex = "\\{\"id\":" + id + ".*?\\}(,)?";
        tasksStr = tasksStr.replaceFirst(regex, "");
        tasksStr = tasksStr.replace(",]", "]"); 
        tasksStr = tasksStr.replace("[,", "[");
        if (tasksStr.trim().equals("]")) tasksStr = "[]";
        if (tasksStr.trim().equals("")) tasksStr = "[]";
        Files.write(Paths.get(DB_FILE), tasksStr.getBytes(StandardCharsets.UTF_8));
    }

    private static String getRequestBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        return new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))
                .lines().collect(Collectors.joining("\n"));
    }

    private static void sendResponse(HttpExchange exchange, String response, int code, String contentType) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", contentType);
        exchange.sendResponseHeaders(code, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }
}
