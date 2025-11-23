# Job Search Aggregator

A modern web application that aggregates job listings from multiple sources, providing users with powerful search, filter, and bookmark capabilities.

## 🎯 Features

- **Multi-Source Job Search**: Searches across Adzuna and JSearch APIs
- **Advanced Filtering**: Filter by location, job type, salary range
- **Smart Sorting**: Sort by date, salary, relevance
- **Bookmark System**: Save favorite jobs for later review
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Error Handling**: Graceful handling of API failures
- **Real-time Search**: Instant results as you type

## 🚀 Live Demo

- **Load Balancer**: http://44.203.149.195/
- **Web Server 1**: http://18.234.78.213/
- **Web Server 2**: http://98.93.185.24/

## 📋 Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- API Keys from:
  - [Adzuna](https://developer.adzuna.com/)
  - [RapidAPI](https://rapidapi.com/) (for JSearch)

## 🔧 Local Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Melyssa-Ingabe/Job_search_app_summative.git
cd Job_search_app_summative
```

### 2. Get API Keys

**Adzuna API:**
1. Go to https://developer.adzuna.com/
2. Sign up for a free account
3. Create an application
4. Copy your App ID and API Key

**JSearch API (RapidAPI):**
1. Go to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Sign up and subscribe to the free plan
3. Copy your RapidAPI key

### 3. Configure API Keys

Open `app.js` and replace the placeholder values:
```javascript
const API_CONFIG = {
  adzuna: {
    appId: 'c9bf5f35',
    apiKey: 'cb0b83d5d1113de5b7980ad6438637e9'
  },
  jsearch: {
    apiKey: '5232c74cf2msh3085c2fd7c46620p130156jsn5e65fb3341f0'
  }
};
```

### 4. Run Locally

**Using Live Server (VS Code)**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. App opens at http://localhost:5500

## 🌐 Deployment to Web Servers

### Server Setup (Both Web01 and Web02)

1. **Connect to Server**
```bash
ssh ubuntu@[SERVER-IP]
```

2. **Install Nginx**
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

3. **Upload Files**
```bash
# From local machine
scp -r * ubuntu@[SERVER-IP]:/tmp/job-app/

# On server
sudo mkdir -p /var/www/html/job-app
sudo mv /tmp/job-app/* /var/www/html/job-app/
sudo chown -R www-data:www-data /var/www/html/job-app
```

4. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/job-app
```

Add:
```nginx
server {
    listen 80;
    server_name [SERVER-IP];
    root /var/www/html/job-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable CORS for API calls
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
}
```

5. **Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/job-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Load Balancer Configuration (Lb01)

1. **Connect to Load Balancer**
```bash
ssh ubuntu@44.203.149.195
```

2. **Install Nginx**
```bash
sudo apt update
sudo apt install nginx -y
```

3. **Configure Load Balancing**
```bash
sudo nano /etc/nginx/sites-available/job-app-lb
```

Add:
```nginx
upstream job_app_backend {
    least_conn;  # Load balancing method
    server 18.234.78.213:80 max_fails=3 fail_timeout=30s;
    server 98.93.185.24:80 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name 44.203.149.195;

    location / {
        proxy_pass http://job_app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check headers
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

4. **Enable and Test**
```bash
sudo ln -s /etc/nginx/sites-available/job-app-lb /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default config
sudo nginx -t
sudo systemctl reload nginx
```

5. **Verify Load Balancing**
```bash
# Test from local machine
curl http://44.203.149.195/
curl http://44.203.149.195/health

# Check which server responds (repeat several times)
curl -I http://44.203.149.195/
```

## 🧪 Testing

### Local Testing
1. Search for "software engineer" in "New York"
2. Apply filters (Remote, Full-time)
3. Sort by salary
4. Bookmark a job
5. Clear filters
6. Check bookmarked jobs persist

### Server Testing
```bash
# Test Web01
curl http://18.234.78.213/

# Test Web02
curl http://98.93.185.24/

# Test Load Balancer
for i in {1..10}; do
  curl -s http://44.203.149.195/ | grep -o "Server: [0-9]*" || echo "Request $i"
done
```

### Load Balancer Verification
1. Stop nginx on Web01: `sudo systemctl stop nginx`
2. Access app via LB - should still work (served by Web02)
3. Restart Web01: `sudo systemctl start nginx`
4. Stop Web02 - should still work (served by Web01)

## Features Explained

### Search Functionality
- Combines results from multiple APIs
- Deduplicates based on job title and company
- Caches results for 5 minutes to reduce API calls

### Filtering System
- **Location**: Filter by city/state
- **Job Type**: Full-time, Part-time, Contract, Remote
- **Salary Range**: Min-Max salary filter
- **Date Posted**: Last 24h, 7 days, 30 days

### Sorting Options
- **Relevance**: Default API ranking
- **Date**: Newest first
- **Salary**: Highest first

### Bookmark System
- Saves to browser localStorage
- Persists across sessions
- Export/Import functionality

## Troubleshooting

### API Keys Not Working
- Verify keys are correctly copied (no extra spaces)
- Check API dashboard for quota usage
- Ensure you're subscribed to free tier on RapidAPI

### Load Balancer Not Distributing
- Check upstream servers are running: `sudo systemctl status nginx`
- Verify firewall rules allow port 80
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### No Results Returned
- Check browser console for errors (F12)
- Verify internet connection
- Test API endpoints directly with curl

## Challenges & Solutions

### Challenge 1: Rate Limiting
**Problem**: Free APIs have limited requests
**Solution**: Implemented caching and combined multiple APIs

### Challenge 2: CORS Issues
**Problem**: Browser blocking API calls
**Solution**: Added CORS headers in Nginx configuration

### Challenge 3: Load Balancer Health Checks
**Problem**: LB couldn't detect server failures
**Solution**: Implemented custom health check endpoint

### Challenge 4: Data Consistency
**Problem**: Different APIs return different data formats
**Solution**: Created normalizer function to standardize responses

## Credits

- **Adzuna** for job search API
- **RapidAPI/JSearch** for additional job data
- **Font Awesome** for icons
- **Google Fonts** for typography

## Author

**[YOUR NAME]**
- GitHub: Melyssa-Ingabe 
- Email: m.mbayire@alustudent.com
