// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/arduino": {
        target: "https://api.arduino.cc",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/arduino/, ""),
        secure: true,
        headers: {
          "Origin": "http://localhost:5173",
          "User-Agent": "QR-Management-System/1.0",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept"
        },
        onProxyReq: (proxyReq, req, res) => {
          if (req.method === "OPTIONS") {
            res.writeHead(200, {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
              "Access-Control-Max-Age": "86400"
            });
            res.end();
            return;
          }
          proxyReq.setHeader("Accept", "application/json");
          proxyReq.setHeader("Content-Type", "application/x-www-form-urlencoded");
        },
        configure: (proxy, options) => {
          proxy.on("error", (err, req, res) => {
            console.log("Proxy error:", err);
            if (!res.headersSent) {
              res.writeHead(500, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
              });
              res.end(JSON.stringify({ error: "Proxy connection failed" }));
            }
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaS9hcmR1aW5vJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5hcmR1aW5vLmNjJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvYXJkdWluby8sICcnKSxcbiAgICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ09yaWdpbic6ICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgICAgICAgICdVc2VyLUFnZW50JzogJ1FSLU1hbmFnZW1lbnQtU3lzdGVtLzEuMCcsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QsIFBVVCwgREVMRVRFLCBPUFRJT05TJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sIEFjY2VwdCdcbiAgICAgICAgfSxcbiAgICAgICAgb25Qcm94eVJlcTogKHByb3h5UmVxLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgIC8vIEhhbmRsZSBwcmVmbGlnaHQgT1BUSU9OUyByZXF1ZXN0c1xuICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7XG4gICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnLFxuICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sIEFjY2VwdCcsXG4gICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1NYXgtQWdlJzogJzg2NDAwJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIEFkZCByZXF1aXJlZCBoZWFkZXJzIGZvciBBcmR1aW5vIENsb3VkIEFQSVxuICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Byb3h5IGVycm9yOicsIGVycik7XG4gICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwge1xuICAgICAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnUHJveHkgY29ubmVjdGlvbiBmYWlsZWQnIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBSZXF1ZXN0IHRvIHRoZSBUYXJnZXQ6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIHJlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICAgIC8vIEFkZCBDT1JTIGhlYWRlcnMgdG8gYWxsIHJlc3BvbnNlc1xuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBQVVQsIERFTEVURSwgT1BUSU9OUycpO1xuICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sIEFjY2VwdCcpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsZ0JBQWdCO0FBQUEsUUFDZCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsbUJBQW1CLEVBQUU7QUFBQSxRQUNyRCxRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsVUFDUCxVQUFVO0FBQUEsVUFDVixjQUFjO0FBQUEsVUFDZCwrQkFBK0I7QUFBQSxVQUMvQixnQ0FBZ0M7QUFBQSxVQUNoQyxnQ0FBZ0M7QUFBQSxRQUNsQztBQUFBLFFBQ0EsWUFBWSxDQUFDLFVBQVUsS0FBSyxRQUFRO0FBRWxDLGNBQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsZ0JBQUksVUFBVSxLQUFLO0FBQUEsY0FDakIsK0JBQStCO0FBQUEsY0FDL0IsZ0NBQWdDO0FBQUEsY0FDaEMsZ0NBQWdDO0FBQUEsY0FDaEMsMEJBQTBCO0FBQUEsWUFDNUIsQ0FBQztBQUNELGdCQUFJLElBQUk7QUFDUjtBQUFBLFVBQ0Y7QUFHQSxtQkFBUyxVQUFVLFVBQVUsa0JBQWtCO0FBQy9DLG1CQUFTLFVBQVUsZ0JBQWdCLG1DQUFtQztBQUFBLFFBQ3hFO0FBQUEsUUFDQSxXQUFXLENBQUMsT0FBTyxZQUFZO0FBQzdCLGdCQUFNLEdBQUcsU0FBUyxDQUFDLEtBQUssS0FBSyxRQUFRO0FBQ25DLG9CQUFRLElBQUksZ0JBQWdCLEdBQUc7QUFDL0IsZ0JBQUksQ0FBQyxJQUFJLGFBQWE7QUFDcEIsa0JBQUksVUFBVSxLQUFLO0FBQUEsZ0JBQ2pCLCtCQUErQjtBQUFBLGdCQUMvQixnQkFBZ0I7QUFBQSxjQUNsQixDQUFDO0FBQ0Qsa0JBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxPQUFPLDBCQUEwQixDQUFDLENBQUM7QUFBQSxZQUM5RDtBQUFBLFVBQ0YsQ0FBQztBQUNELGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxRQUFRO0FBQzNDLG9CQUFRLElBQUksa0NBQWtDLElBQUksUUFBUSxJQUFJLEdBQUc7QUFBQSxVQUNuRSxDQUFDO0FBQ0QsZ0JBQU0sR0FBRyxZQUFZLENBQUMsVUFBVSxLQUFLLFFBQVE7QUFDM0Msb0JBQVEsSUFBSSxzQ0FBc0MsU0FBUyxZQUFZLElBQUksR0FBRztBQUU5RSxnQkFBSSxVQUFVLCtCQUErQixHQUFHO0FBQ2hELGdCQUFJLFVBQVUsZ0NBQWdDLGlDQUFpQztBQUMvRSxnQkFBSSxVQUFVLGdDQUFnQyxxQ0FBcUM7QUFBQSxVQUNyRixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
